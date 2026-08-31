# rules-20-incident-lifecycle.md — smart-incidents: Ciclo de Vida de la Incidencia

## 1. Propósito

Este documento define el significado normativo de cada estado del ciclo de vida de una incidencia, las transiciones de estado permitidas, los actores autorizados por transición, las condiciones obligatorias que deben cumplirse para que una transición sea válida, y las invariantes que protegen la integridad de la máquina de estados.

Este documento es la fuente de verdad para cualquier EF, componente de UI o proceso automático que ejecute o valide transiciones de estado sobre `inc_incidents.status`. Toda implementación que modifique el estado de una incidencia debe ser coherente con lo aquí definido.

---

## 2. Alcance

Este documento aplica a:

- La tabla `inc_incidents`, campo `status`
- Todas las EFs del add-on `smart-incidents` que ejecuten o validen transiciones de estado
- El actor `system` (EFs del add-on y procesos automáticos que actúan en nombre del sistema)
- Los actores `tenant`, `client_admin` y `superadmin` cuando sus acciones implican transiciones de estado
- La tabla `inc_activities` como destino obligatorio del registro de toda transición
- El panel de administración del módulo, para determinar qué acciones están disponibles según el estado actual

---

## 3. Decisiones no negociables

1. **Los únicos estados válidos del MVP son siete.** Los estados `new`, `notified`, `in_progress`, `waiting_tenant`, `resolved`, `closed` y `cancelled` son los únicos válidos en V1. No puede introducirse ningún estado adicional sin actualizar este documento y `contract-incident-state-machine.md`.

2. **Toda incidencia se crea en estado `new`.** Ninguna fuente, ningún actor y ningún mecanismo de integración puede crear directamente una incidencia en un estado distinto de `new`.

3. **`closed` y `cancelled` son estados terminales absolutos.** No puede existir ninguna transición saliente desde ninguno de estos dos estados. Una incidencia en estado `closed` o `cancelled` no puede modificarse ni reabrirse.

4. **Las transiciones de estado las ejecutan exclusivamente las EFs del add-on.** n8n no puede ejecutar `UPDATE` sobre `inc_incidents.status` directamente. Si n8n necesita solicitar una transición, lo hace llamando a una EF del add-on, que actúa como `system` y valida la transición.

5. **El resolutor no es actor de transición en V1.** No dispone de portal ni autenticación propia dentro del módulo. No puede modificar el estado de ninguna incidencia mediante ninguna interfaz propia en V1.

6. **Toda transición válida debe quedar registrada en `inc_activities`.** Una transición sin registro en `inc_activities` es inválida. Si el registro falla, la transición no debe completarse.

7. **Las transiciones repetidas se tratan de forma idempotente.** Si el estado actual de una incidencia ya es el estado destino solicitado, la EF devuelve éxito sin modificar el estado ni insertar un registro duplicado en `inc_activities`.

8. **Una transición inválida no modifica el estado.** Si la transición no está permitida para el estado origen, o si el actor no está autorizado, la EF registra el intento en los logs del add-on y devuelve un error descriptivo. El estado de la incidencia permanece inalterado.

---

## 4. Reglas obligatorias

### 4.1 Significado normativo de cada estado

| Estado | Significado normativo |
|---|---|
| `new` | Incidencia recién creada. La notificación al resolutor no ha sido enviada ni confirmada. La incidencia está pendiente de atención. |
| `notified` | La notificación outbound al resolutor ha sido enviada y su entrega ha sido confirmada por el sistema de entrega. Si la notificación falla o no se confirma la entrega, la incidencia permanece en `new`. |
| `in_progress` | El resolutor está atendiendo la incidencia. La gestión operativa ha comenzado. |
| `waiting_tenant` | La gestión operativa está temporalmente suspendida porque se requiere información adicional, una confirmación o una acción por parte del tenant antes de continuar. |
| `resolved` | La actuación sobre la incidencia se considera completada y la incidencia resuelta. Puede confirmarse definitivamente transitando a `closed` o revertirse si la resolución resulta insatisfactoria, transitando a `in_progress`. |
| `closed` | Estado terminal absoluto. La incidencia se ha cerrado definitivamente. No puede modificarse ni reabrirse. |
| `cancelled` | Estado terminal absoluto. La incidencia ha sido cancelada. No puede modificarse ni reabrirse. |

### 4.2 Tabla de transiciones permitidas

| Estado origen | Estado destino | Actores permitidos | Condición principal |
|---|---|---|---|
| `new` | `notified` | `system` | La notificación outbound al resolutor ha sido enviada y confirmada como entregada por el sistema |
| `new` | `in_progress` | `client_admin`, `superadmin` | Gestión manual iniciada sin esperar la notificación automática |
| `new` | `cancelled` | `tenant`, `client_admin`, `superadmin` | El `tenant` solo puede cancelar su propia incidencia; `client_admin` y `superadmin` pueden cancelar cualquier incidencia dentro de su scope autorizado |
| `notified` | `in_progress` | `client_admin`, `superadmin` | La atención operativa se inicia explícitamente |
| `notified` | `waiting_tenant` | `client_admin`, `superadmin` | Se necesita información o acción del tenant antes de que la gestión pueda avanzar |
| `notified` | `cancelled` | `client_admin`, `superadmin` | Cancelación administrativa con justificación documentada |
| `in_progress` | `waiting_tenant` | `client_admin`, `superadmin` | La gestión queda suspendida pendiente de respuesta o acción del tenant |
| `in_progress` | `resolved` | `client_admin`, `superadmin` | La actuación se considera completada y la incidencia resuelta |
| `in_progress` | `cancelled` | `client_admin`, `superadmin` | Cancelación administrativa con justificación documentada |
| `waiting_tenant` | `in_progress` | `client_admin`, `superadmin` | Se ha recibido la información necesaria del tenant y se retoma la gestión |
| `waiting_tenant` | `cancelled` | `client_admin`, `superadmin` | La incidencia se cancela por falta de respuesta o por decisión administrativa justificada |
| `resolved` | `closed` | `client_admin`, `superadmin` | Se confirma el cierre definitivo de la incidencia |
| `resolved` | `in_progress` | `client_admin`, `superadmin` | La resolución se determina como insatisfactoria o incompleta y requiere nueva actuación |

### 4.3 Transiciones explícitamente prohibidas

| Estado origen | Estado destino | Motivo de la prohibición |
|---|---|---|
| `closed` | Cualquier estado | `closed` es un estado terminal absoluto |
| `cancelled` | Cualquier estado | `cancelled` es un estado terminal absoluto |
| `new` | `resolved` | Una incidencia no puede resolverse sin gestión previa |
| `new` | `closed` | Una incidencia no puede cerrarse sin gestión previa |
| `new` | `waiting_tenant` | Una incidencia no puede quedar en espera del tenant sin que la gestión haya comenzado |
| `notified` | `resolved` | No puede resolverse directamente desde `notified` sin gestión activa |
| `notified` | `closed` | No puede cerrarse directamente desde `notified` |
| `waiting_tenant` | `resolved` | Una incidencia en espera del tenant no puede resolverse sin retomar la gestión (`in_progress`) |
| `waiting_tenant` | `closed` | Una incidencia en espera del tenant no puede cerrarse directamente; debe volver a `in_progress` o cancelarse |

### 4.4 Actores y restricciones por actor

**`tenant`**

- Solo puede ejecutar la transición `new → cancelled`.
- Solo puede cancelar incidencias propias, es decir, cuyo `requester_profile_id` coincida con el `profile_id` del tenant autenticado.
- No puede ejecutar ninguna otra transición de estado.

**`client_admin`**

- Puede ejecutar todas las transiciones en las que aparece como actor autorizado (Sección 4.2).
- Solo puede operar sobre incidencias cuyo `client_account_id` coincida con el `client_account_id` del admin autenticado.

**`superadmin`**

- Puede ejecutar todas las transiciones en las que aparece como actor autorizado (Sección 4.2).
- Puede operar sobre incidencias de cualquier `client_account`.

**`system`**

- Solo puede ejecutar la transición `new → notified`.
- La condición obligatoria para esta transición es la confirmación de entrega de la notificación outbound. Si la notificación no se confirma como entregada, el actor `system` no ejecuta la transición.
- Cuando n8n solicita una transición a una EF del add-on, la EF actúa como `system`. n8n no es directamente el actor de la transición.

**Resolutor**

- No es actor de transición en V1: no dispone de portal ni autenticación propia dentro del módulo.
- Existe como destinatario de notificaciones outbound.
- No puede modificar el estado de ninguna incidencia mediante ninguna interfaz propia en V1.
- La asignación de incidencias al resolutor forma parte del MVP. El campo de asignación y el modelo de datos del resolutor se definen en `rules-40-assignment-routing.md` (Lote 3).

### 4.5 Registro obligatorio en `inc_activities`

Toda transición de estado exitosa debe insertar un registro en `inc_activities` antes de completarse. El registro debe contener como mínimo:

- El identificador de la incidencia (`incident_id`)
- El estado origen
- El estado destino
- El actor y su rol
- El timestamp de la transición
- El contexto relevante de la transición (motivo de cancelación, razón de retorno a `in_progress`, identificador de la notificación confirmada en la transición `new → notified`, etc.)

Si la inserción en `inc_activities` falla, la EF no debe completar el `UPDATE` sobre `inc_incidents.status` y debe devolver un error al llamante.

### 4.6 Idempotencia de transiciones

Cuando una EF recibe una solicitud de transición hacia un estado que ya es el estado actual de la incidencia:

1. Verifica que el estado actual ya es el destino solicitado.
2. Devuelve respuesta de éxito sin ejecutar ningún `UPDATE`.
3. No inserta ningún registro en `inc_activities` para la transición repetida.

Cuando una EF recibe una solicitud de transición inválida (par origen-destino no autorizado, o actor no permitido para esa transición):

1. Registra el intento en los logs internos del add-on con el estado actual, la transición solicitada y el actor.
2. Devuelve un error descriptivo al llamante incluyendo el estado actual y el motivo del rechazo.
3. No modifica el estado de la incidencia.

### 4.7 Separación entre EF y n8n

Las EFs del add-on son el único mecanismo autorizado para ejecutar transiciones de estado. Las reglas de separación son:

**n8n puede:**
- Recibir eventos cuando el estado de una incidencia cambia.
- Llamar a EFs del add-on para solicitar transiciones de estado.
- Leer el estado de una incidencia para decidir qué proceso disparar.

**n8n no puede:**
- Ejecutar directamente `UPDATE` sobre `inc_incidents.status`.
- Verificar la validez de una transición sin intermediación de la EF.
- Actuar directamente como actor `system` en ninguna transición.

Cuando n8n solicita una transición a una EF, la EF:
1. Verifica el entitlement del `client_account`.
2. Verifica el estado actual de la incidencia.
3. Verifica que la transición solicitada es válida para el par origen-destino y para el actor `system`.
4. Ejecuta la transición e inserta el registro en `inc_activities`.

### 4.8 Coherencia de timestamps de estado

Cuando una incidencia alcanza un estado de resolución o un estado terminal, los timestamps correspondientes deben actualizarse:

- Al alcanzar `resolved` (T-08): debe registrarse `resolved_at` con el timestamp de la transición.
- Al alcanzar `closed` (T-12): debe registrarse `closed_at`. El campo `resolved_at` se mantiene sin cambios.
- Al alcanzar `cancelled` (T-03, T-06, T-09, T-11): debe registrarse `cancelled_at`.
- Al ejecutar T-13 (`resolved → in_progress`): `resolved_at` representa la resolución actualmente vigente y debe revertirse a `null`. El intento de resolución anterior no se elimina del historial: permanece trazado en el registro de `inc_activities` correspondiente a T-08. La entidad solo refleja la resolución vigente; `inc_activities` preserva el historial completo.

La definición técnica de estos campos está en `contract-incident-entity.md`.

---

## 5. Casos permitidos

- El actor `system` mueve una incidencia de `new` a `notified` tras confirmar la entrega de la notificación WhatsApp outbound al resolutor.
- Un `client_admin` mueve una incidencia de `in_progress` a `resolved` tras confirmar que la actuación es satisfactoria.
- Un `client_admin` mueve una incidencia de `resolved` a `in_progress` al detectar que la resolución no fue completa.
- Un `tenant` cancela su propia incidencia mientras está en estado `new`.
- Un `superadmin` ejecuta cualquier transición autorizada sobre incidencias de cualquier `client_account`.
- Una EF recibe una solicitud de transición cuyo destino ya es el estado actual de la incidencia y devuelve éxito sin modificar.
- Un `client_admin` mueve una incidencia directamente de `new` a `in_progress` sin esperar la notificación automática.
- Un `client_admin` mueve una incidencia de `notified` a `waiting_tenant` al necesitar confirmación del tenant.
- Un `client_admin` mueve una incidencia de `waiting_tenant` a `cancelled` tras falta de respuesta del tenant.

---

## 6. Casos prohibidos

- n8n ejecuta `UPDATE inc_incidents SET status = '...'` directamente sin intermediación de una EF.
- El resolutor ejecuta una transición de estado mediante cualquier interfaz propia en V1.
- Una incidencia en estado `closed` o `cancelled` recibe cualquier solicitud de transición de estado.
- El actor `system` ejecuta transiciones distintas de `new → notified`.
- Un `tenant` intenta mover una incidencia a `in_progress`, `notified`, `resolved`, `closed` o cualquier estado que no sea `cancelled`.
- Un `tenant` intenta cancelar la incidencia de otro tenant.
- Una transición se completa sin insertar el registro correspondiente en `inc_activities`.
- Una incidencia transita de `new` directamente a `resolved`, `closed` o `waiting_tenant`.
- Una incidencia transita de `waiting_tenant` directamente a `resolved` o `closed`.
- Se introduce un estado distinto de los siete aprobados.
- Una EF completa una transición sin verificar previamente el entitlement del `client_account`.

---

## 7. Impacto en diseño

- Toda EF que ejecute una transición debe leer el estado actual de la incidencia antes del `UPDATE`, verificar que la transición es válida para ese par origen-destino y que el actor está autorizado.
- El registro en `inc_activities` debe insertarse en la misma operación atómica que el `UPDATE`, o bien como paso previo, de forma que un fallo del registro impida la modificación del estado.
- La capa de UI debe renderizar únicamente las acciones disponibles para el rol autenticado y el estado actual de la incidencia. Un `tenant` que visualiza una incidencia en `new` solo debe ver la acción de cancelar. Un `client_admin` que visualiza una incidencia en `resolved` debe ver las acciones de cerrar o reabrir.
- El frontend puede consultar `contract-incident-state-machine.md` para determinar las acciones disponibles sin necesidad de una llamada adicional al backend en cada carga de la vista.

---

## 8. Impacto en implementación

- Cualquier PR que implemente un `UPDATE` directo sobre `inc_incidents.status` desde n8n o desde la capa de UI debe rechazarse.
- Cualquier PR que permita al resolutor cambiar el estado de una incidencia en V1 debe rechazarse.
- Cualquier PR que omita el registro en `inc_activities` ante una transición debe rechazarse.
- Cualquier PR que introduzca un nuevo estado debe primero actualizar este documento y `contract-incident-state-machine.md`. Ambos documentos deben actualizarse en el mismo PR.
- La EF responsable de cada transición debe verificar el entitlement del `client_account` antes de ejecutar la transición.
- La verificación del estado actual antes del `UPDATE` debe usar un `SELECT ... FOR UPDATE` o mecanismo equivalente que evite condiciones de carrera.

---

## 9. Dependencias

- `rules-00-scope-and-principles.md` — principios rectores del add-on, estados del MVP (§4.4), separación entre EF y n8n (§3.8)
- `rules-05-roles-and-visibility.md` — capacidades de cada rol y actores en transiciones (§4.8)
- `rules-10-addon-entitlement.md` — verificación de entitlement como precondición de toda operación
- `contract-incident-state-machine.md` — formalización técnica de la máquina de estados, tipos, matriz de transiciones y ejemplos

### Requirements relacionados

- `REQ-013-saas-services-catalog.md` — modelo de suscripción SaaS bajo el que opera el add-on `smart-incidents`

---

## 10. Checklist de validación

- [ ] Los siete estados del MVP están definidos con significado normativo claro
- [ ] `closed` y `cancelled` no tienen transiciones salientes
- [ ] El estado inicial de toda incidencia es `new` sin excepción
- [ ] El actor `system` solo puede ejecutar `new → notified`
- [ ] El actor `tenant` solo puede ejecutar `new → cancelled` sobre incidencias propias
- [ ] El resolutor no aparece como actor de transición
- [ ] n8n no aparece como actor de transición directa
- [ ] Toda transición válida registra en `inc_activities` antes de completarse
- [ ] Las transiciones repetidas se tratan de forma idempotente (éxito sin modificación)
- [ ] Las transiciones inválidas devuelven error sin modificar el estado
- [ ] Los timestamps de estado (`resolved_at`, `closed_at`, `cancelled_at`) se actualizan al alcanzar el estado correspondiente
- [ ] Los estados coinciden con los definidos en `contract-incident-state-machine.md`

---

## 11. Notas de control de cambios

**Añadir un nuevo estado** requiere actualizar simultáneamente:
- Este documento (§4.1 y §4.2)
- `contract-incident-state-machine.md`
- La EF responsable de las nuevas transiciones
- El panel de administración del módulo (acciones disponibles según estado)
- Los tests de ciclo de vida en `tests/`

**Modificar los actores autorizados para una transición existente** requiere actualizar simultáneamente:
- Este documento (§4.2 y §4.4)
- `rules-05-roles-and-visibility.md`
- `contract-incident-state-machine.md`

**Cambiar las condiciones de la transición `new → notified`** requiere revisión conjunta con `rules-60-whatsapp-notifications.md` y la EF responsable de las notificaciones outbound.

Cualquier cambio en este documento tiene precedencia máxima dentro del módulo y puede afectar en cascada a contratos, skills y tests existentes.
