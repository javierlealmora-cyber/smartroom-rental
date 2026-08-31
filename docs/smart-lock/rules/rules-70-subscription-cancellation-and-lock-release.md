# rules-70-subscription-cancellation-and-lock-release.md — Liberación de Cerraduras al Cancelar

## 1. Propósito

Definir la obligación de liberar el control operativo de las cerraduras físicas del cliente **antes o durante** la cancelación de la suscripción SmartLock, para que el cliente nunca quede sin capacidad de operar su propio hardware.

Esta regla extiende `rules-20-tenant-activation-and-lifecycle.md` con un requisito específico que esa regla no cubre: la retención de datos (90 días) protege *nuestros registros*, pero no resuelve por sí sola que el cliente pueda seguir *operando físicamente* sus cerraduras tras dejar de pagar el servicio.

## 2. Alcance

Aplica a:
- La cancelación de `saas_service_subscriptions` para `service_code = 'smart_access_lock'`, en ambos providers (`ttlock` cloud y `ttlock_ble` local).
- La Edge Function `sal-offboard-lock` (ya existente en el diseño) y cualquier función relacionada de baja de integración.
- El flujo de comunicación con el cliente antes, durante y después de la cancelación.

## 3. Decisiones No Negociables

1. **Cancelar la suscripción nunca debe dejar al cliente sin forma de operar sus propias cerraduras físicas.** Esto es más estricto que la simple retención de datos: no basta con no borrar filas de BBDD (`rules-20` §4.3); hay que garantizar que el control real del hardware pueda volver al cliente.

2. **El motivo de este riesgo es distinto según el provider:**
   - **`ttlock` cloud**: las cerraduras están emparejadas a una sub-cuenta (shard) que es propiedad y está bajo control de SmartRoom Rental, no del cliente. Si se corta el acceso sin más, el cliente no puede gestionar sus cerraduras ni desde nuestra web (suscripción cancelada) ni desde la app TTLock (no es su cuenta).
   - **`ttlock_ble` local**: el `lockData` necesario para hablar BLE con la cerradura vive en nuestro Vault y en la cache del gateway, ambos bajo nuestro control. Sin ese `lockData`, la cerradura es inoperable salvo factory reset físico (que borra PINs y configuración).

3. **El proceso de cancelación debe iniciar de forma proactiva un flujo de "liberación" (handover)**, no esperar a que el cliente lo pida ni a que expire el periodo de retención sin haber actuado.

4. **La purga de datos tras el periodo de retención (`rules-20` §4.3, 90 días) nunca debe ejecutarse si el handover no se ha completado o rechazado explícitamente.** Debe existir una salvaguarda que impida el borrado automático de `lockData` mientras el estado de handover sea `pending`.

5. **El cliente debe recibir comunicación clara y con antelación** sobre qué debe hacer para recuperar el control de sus cerraduras, con un plazo explícito antes de cualquier consecuencia irreversible.

## 4. Reglas Obligatorias

### 4.1 Disparo del flujo de liberación

El flujo de liberación se dispara automáticamente cuando `saas_service_subscriptions.status` pasa de `active` a `cancelled` (o `suspended` por impago prolongado, según política comercial). Debe ejecutarse mediante `sal-offboard-lock` (u orquestador equivalente) para cada integración activa del cliente.

### 4.2 Liberación para provider `ttlock` (cloud)

1. Notificar al cliente (email, y banner en la UI mientras la suscripción siga en estado `cancelled` pero dentro del periodo de retención) explicando que debe **transferir la propiedad** de sus cerraduras desde la sub-cuenta shard hacia una cuenta TTLock personal, usando la función "Transfer Lock" de la app oficial TTLock.
2. Proveer instrucciones paso a paso y un plazo explícito (recomendado: alineado con el periodo de retención de `rules-20`, 90 días).
3. Marcar `lock_integrations.status = 'pending_release'` durante este periodo (nuevo valor de estado, distinto de `connected`/`disconnected`/`error`).
4. Si el cliente completa la transferencia: marcar `lock_integrations.status = 'released'`, `locks.is_active = false` para las cerraduras transferidas (ya no gestionables desde nuestra plataforma).
5. Si el cliente reactiva la suscripción antes de completar la transferencia: cancelar el flujo de liberación y restaurar `status = 'connected'` sin necesidad de reconfiguración (coherente con `rules-20` §4.4).
6. Si el plazo expira sin que el cliente haya actuado: **no purgar ni revocar credenciales de forma unilateral si eso implica dejar cerraduras inoperables sin aviso adicional.** Escalar a revisión manual de superadmin antes de cualquier acción irreversible sobre las credenciales del shard.

### 4.3 Liberación para provider `ttlock_ble` (local)

1. Notificar al cliente que, al cancelar, debe decidir entre:
   - **(a) Exportar el `lockData`** de cada cerradura para poder operarla con software propio o de terceros compatible con TTLock (si aplica y es técnicamente viable), o
   - **(b) Solicitar un factory reset asistido** de cada cerradura (con pérdida de configuración y credenciales existentes), o
   - **(c) Mantener el gateway físico funcionando bajo un plan reducido/gratuito** si la política comercial lo permite (alternativa a definir por Product Owner, fuera del alcance normativo de esta regla).
2. Marcar `lock_integrations.status = 'pending_release'` mientras se resuelve.
3. La exportación de `lockData` (opción a) debe realizarse por un canal seguro y auditado (nunca por email en texto plano); debe registrarse en `audit_log` quién solicitó y quién autorizó la exportación.
4. Igual que en 4.2.6, no purgar `lockData` del Vault de forma automática tras el periodo de retención sin verificar explícitamente que el cliente ya tiene una vía de control alternativa (exportado, reseteado, o plan reducido activo).

### 4.4 Salvaguarda anti-purga-ciega

Cualquier job de purga automática de datos tras el periodo de retención (mencionado como pendiente de implementar en `rules-20` §11) debe excluir explícitamente:
- Integraciones con `status = 'pending_release'`.
- `lockData` en Vault sin confirmación de handover completado o descartado explícitamente por el cliente.

Un job de purga que no implemente esta exclusión se considera una implementación incorrecta de `rules-20` y de esta regla.

### 4.5 Ampliación del CHECK de estado

`lock_integrations.status` debe ampliar su `CHECK` para admitir los nuevos estados de este flujo:

```sql
ALTER TABLE lock_integrations DROP CONSTRAINT IF EXISTS lock_integrations_status_check;
ALTER TABLE lock_integrations ADD CONSTRAINT lock_integrations_status_check
  CHECK (status IN ('connected', 'disconnected', 'error', 'syncing', 'pending_release', 'released'));
```

Esta migración debe incluirse en la Fase 1a de despliegue del schema SAL (junto con el renombrado de `rules-30-schema-isolation.md`), no como una migración posterior separada, dado que el flujo de cancelación debe estar operativo desde el primer despliegue a producción.

### 4.6 Registro de auditoría

Toda transición de `lock_integrations.status` relacionada con cancelación y liberación (`connected → pending_release → released`, o su equivalente de rechazo) debe registrarse en `audit_log`, incluyendo el motivo y el actor (cliente, superadmin, o job automático).

## 5. Casos Permitidos

- Un cliente puede completar la transferencia/exportación antes de que expire el plazo y quedar con sus cerraduras operables de forma independiente de SmartRoom Rental.
- Un cliente puede reactivar la suscripción durante el periodo de `pending_release` y recuperar el servicio sin reconfiguración.
- Un cliente puede solicitar explícitamente el factory reset asistido de sus cerraduras BLE si no le interesa recuperar el `lockData`.

## 6. Casos Prohibidos

- Cancelar la suscripción y dejar `lock_integrations.status = 'disconnected'` sin ofrecer ni ejecutar ningún camino de liberación.
- Purgar `lockData` de Vault o revocar el token OAuth del shard sin verificar que el cliente tiene una vía de control alternativa.
- Comunicar la necesidad de liberación solo después de que el plazo ya haya expirado.
- Exportar `lockData` por un canal no auditado (email plano, chat no cifrado).

## 7. Impacto en Diseño

- La UI debe mostrar, para una suscripción cancelada dentro del periodo de retención, un banner persistente con el estado del proceso de liberación y las acciones disponibles.
- El dashboard de superadmin debe listar integraciones en `pending_release` próximas a expirar su plazo, para intervención manual si es necesario.

## 8. Impacto en Implementación

- `sal-offboard-lock` debe implementar las ramas 4.2 (cloud) y 4.3 (BLE local) según el `provider` de cada integración del cliente.
- El job de purga (cuando se implemente) debe consultar `lock_integrations.status != 'pending_release'` como condición obligatoria antes de actuar.

## 9. Dependencias

Depende de:
- `rules-00-scope-and-principles.md`
- `rules-20-tenant-activation-and-lifecycle.md` (extiende su §4.3)
- `rules-40-ttlock-cloud-provider.md` (flujo de transferencia de propiedad, §4.3)
- `rules-50-ttlock-ble-provider.md` (naturaleza crítica de `lockData`)
- `contract-vault-lockdata.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] Cancelar la suscripción dispara automáticamente el flujo de liberación correspondiente al provider.
- [ ] `lock_integrations.status = 'pending_release'` existe y se usa durante el periodo de gracia.
- [ ] Ningún job de purga actúa sobre integraciones en `pending_release` sin verificación explícita.
- [ ] La exportación de `lockData` queda auditada en `audit_log`.
- [ ] Reactivar durante `pending_release` restaura el servicio sin reconfiguración.

## 11. Notas de Control de Cambios

Esta regla nace de un riesgo identificado explícitamente por Product Owner: sin un flujo de liberación, cancelar SmartLock podría dejar al cliente sin capacidad de operar cerraduras que son físicamente suyas. Cualquier cambio que reduzca las garantías aquí descritas requiere validación explícita de Product Owner, dado el impacto directo en la confianza del cliente y en el riesgo reputacional/legal de "secuestrar" el acceso a hardware ajeno.
