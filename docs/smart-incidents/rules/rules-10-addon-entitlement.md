# rules-10-addon-entitlement.md — smart-incidents: Entitlement del Add-on

## 1. Propósito

Este documento define cuándo está permitido utilizar el add-on `smart-incidents`, cómo se verifica el entitlement de forma canónica, cuáles son las capas de comprobación obligatorias y cuál es el comportamiento correcto ante la ausencia o revocación del entitlement.

Establece el mecanismo normativo al que `rules-00-scope-and-principles.md` §4.2 delega la verificación de entitlement. Toda EF del add-on, todo componente de UI y todo sistema externo que actúe sobre incidencias debe ajustarse a lo aquí definido.

---

## 2. Alcance

Este documento aplica a:

- Todas las Edge Functions del add-on `smart-incidents` que creen, lean o modifiquen incidencias
- La UI del módulo de incidencias
- La integración entrante desde SmartConversations vía `conv-core-create-incident`
- Los workflows de n8n que procesen eventos del add-on
- Cualquier componente que decida si una operación del add-on puede ejecutarse

---

## 3. Decisiones no negociables

1. **El entitlement es una precondición absoluta de toda operación.** Ninguna EF del add-on puede ejecutar ninguna operación de creación, modificación o lectura sin verificar previamente que el entitlement está activo para el `client_account` implicado.

2. **El identificador canónico del servicio es `smart_incidents`.** Este es el valor del campo `code` en la tabla `saas_services` del Core que identifica el add-on. Fuente: `rules-00-scope-and-principles.md` §4.2 y `REQ-013-saas-services-catalog.md`. No puede alterarse sin actualizar también el modelo del catálogo SaaS del Core.

3. **La condición de entitlement activo es `status = 'active'` en `saas_service_subscriptions`.** No es suficiente que la suscripción exista. No es suficiente que haya existido históricamente. El estado debe ser `active` en el momento de la operación. Los estados `pending`, `suspended` y `cancelled` no habilitan ninguna operación del add-on.

4. **El provider nunca confía exclusivamente en el gating del consumer.** SmartConversations realiza su propia verificación antes de invocar al provider. Sin embargo, el provider `smart-incidents` es responsable de verificar el entitlement de forma independiente en cada operación, sin delegar ni asumir que el consumer ya lo comprobó.

5. **La desactivación del add-on no elimina datos históricos.** Cuando el entitlement pasa a un estado distinto de `active`, las incidencias existentes se conservan íntegras. No se borran registros, no se expulsan conversaciones en curso y no se elimina el historial en `inc_activities`.

6. **El Core no depende del entitlement del add-on.** La comprobación de entitlement de `smart_incidents` no puede bloquear ni afectar ninguna operación del Core de alquiler.

---

## 4. Reglas obligatorias

### 4.1 Condición de entitlement activo

Para que cualquier operación del add-on pueda ejecutarse, deben cumplirse simultáneamente todas las condiciones siguientes:

| Condición | Verificación |
|---|---|
| `client_account_id` válido | El identificador corresponde a un `client_account` existente y no eliminado |
| Suscripción del servicio existente | Existe un registro en `saas_service_subscriptions` para (`client_account_id`, servicio `smart_incidents`) |
| Estado `active` | `saas_service_subscriptions.status = 'active'` |
| Cuenta no suspendida ni bloqueada | El `client_account` está operativo |
| Autorización funcional | El actor tiene permiso para la operación concreta según `rules-05-roles-and-visibility.md` |

Si alguna de estas condiciones no se cumple, la EF rechaza la operación con error controlado sin persistir ningún dato.

### 4.2 Identificador del servicio y consulta de entitlement

El servicio `smart_incidents` se identifica en `saas_services` mediante el campo `code = 'smart_incidents'`.

La verificación de entitlement activo se realiza consultando `saas_service_subscriptions` con la condición:

```text
client_account_id = <client_account_id de la operación>
AND saas_service_id = (SELECT id FROM saas_services WHERE code = 'smart_incidents')
AND status = 'active'
```

La implementación técnica de esta consulta (port, adapter, función auxiliar reutilizable) se define en SI-P4. Este documento fija el criterio normativo, no el mecanismo de acceso.

### 4.3 Capas de comprobación

El entitlement se verifica en múltiples capas independientes. Ninguna capa puede sustituir a las demás.

| Capa | Responsabilidad | Fuente de verdad |
|---|---|---|
| UI | Ocultar el módulo y todos sus componentes cuando el entitlement no está activo | Estado de suscripción del add-on |
| Cada EF provider | Verificar entitlement en cada operación, independientemente del resultado de capas anteriores | `saas_service_subscriptions` |
| SmartConversations | Realizar su propio gating conversacional antes de invocar al provider | Ver §4.4 |
| n8n | Verificar entitlement antes de procesar cualquier evento del add-on; descartar silenciosamente si no está activo | `saas_service_subscriptions` (como verificación defensiva) |

### 4.4 Doble gating para solicitudes desde SmartConversations

Cuando la solicitud de creación de incidencia proviene de SmartConversations (fuente `whatsapp` o `webchat`), debe cumplirse la combinación de condiciones siguiente:

```text
smart_incidents subscription active (verificado por Smart Incidents)
AND activación del canal de incidencias en SmartConversations activa (verificado por SC)
AND canal de origen activo (verificado por SC)
```

**Responsabilidad de SmartConversations (fuera del alcance de este documento):**
- Verificar que el canal de incidencias está activado para el `client_account` en su propia configuración
- Verificar que el canal de origen (`whatsapp` o `webchat`) está activo
- Repetir estas verificaciones inmediatamente antes de invocar al provider

**Responsabilidad de Smart Incidents (normativa de este documento):**
- Verificar que el entitlement del add-on `smart_incidents` está activo para el `client_account`
- Verificar el estado operativo del `client_account`
- Verificar la autorización de dominio de la operación concreta
- Repetir el check de entitlement inmediatamente antes de persistir cualquier dato

El hecho de que SmartConversations haya aprobado su propio gating no exime al provider de ejecutar sus verificaciones.

### 4.5 Momento de la verificación

El entitlement debe comprobarse:

1. **Al inicio de la EF**, antes de cualquier otra operación, para devolver error temprano sin procesar el payload.
2. **Inmediatamente antes de persistir**, para cerrar la ventana de tiempo entre la verificación inicial y la escritura efectiva en caso de cambios concurrentes de estado.

### 4.6 Comportamiento ante entitlement inactivo

Cuando el entitlement no está activo (`pending`, `suspended`, `cancelled` o ausente), el comportamiento obligatorio es:

| Capa | Comportamiento |
|---|---|
| UI | No renderiza ningún componente del módulo de incidencias |
| EFs provider | Devuelven error controlado sin ejecutar ninguna operación de escritura ni lectura de datos de incidencias. El error se mapea al código contractual `FEATURE_DISABLED` (payload exacto: pendiente de `contract-create-incident-request.md`) |
| n8n | Descarta el evento silenciosamente sin procesar ni reenviar |
| SmartConversations | Su comportamiento ante entitlement inactivo queda fuera del alcance de este documento |

### 4.7 Comportamiento ante desactivación

Cuando el entitlement pasa de `active` a otro estado (`suspended` o `cancelled`):

**Lo que ocurre:**
- No aparecen nuevas operaciones de creación ni modificación
- No se procesan nuevos automatismos de n8n
- El Core continúa funcionando sin afectación

**Lo que no ocurre:**
- No se eliminan incidencias existentes
- No se elimina el historial en `inc_activities`
- No se borran conversaciones en curso en otros sistemas
- No se afectan datos del Core

**Operaciones sobre incidencias existentes:** Esta rule no define si determinadas operaciones de lectura o cierre de incidencias históricas pueden seguir permitidas tras la desactivación. Cualquier excepción de este tipo requiere una decisión canónica explícita en una actualización formal de este documento. Hasta entonces, toda operación de escritura está bloqueada.

**Retries:** Cualquier retry de una operación que fue rechazada por entitlement inactivo debe volver a verificar el entitlement antes de ejecutarse. No puede existir un mecanismo de retry que omita la verificación ni que permita retries indefinidos.

### 4.8 n8n y entitlement

n8n realiza verificación defensiva del entitlement antes de procesar cualquier evento. Sin embargo, n8n no es la fuente de verdad del entitlement. La consulta definitiva es siempre contra `saas_service_subscriptions`. Si n8n no puede verificar el entitlement, debe descartar el evento de forma conservadora.

---

## 5. Casos permitidos

- Una EF del add-on ejecuta una operación para un `client_account` cuyo entitlement tiene `status = 'active'`.
- La UI muestra el módulo de incidencias cuando la suscripción del `client_account` está activa.
- SmartConversations invoca al provider después de verificar su propio gating y el provider verifica el entitlement de forma independiente.
- n8n descarta un evento de incidencia de un `client_account` cuyo entitlement está `suspended`.
- Un `client_account` suspende el servicio sin perder las incidencias históricas.

---

## 6. Casos prohibidos

- Una EF del add-on ejecuta cualquier operación sin verificar previamente el entitlement.
- El provider confía en que SmartConversations ya verificó el entitlement y omite su propia comprobación.
- La UI renderiza cualquier componente del módulo de incidencias cuando el entitlement no está activo.
- n8n procesa eventos de incidencias de un `client_account` sin entitlement activo.
- Una EF acepta el entitlement como parámetro de entrada del payload en lugar de verificarlo contra `saas_service_subscriptions`.
- Se eliminan o modifican datos históricos de incidencias cuando el entitlement se desactiva.
- El add-on bloquea o afecta al Core cuando su entitlement está inactivo.
- Un mecanismo de retry omite la verificación de entitlement.
- Se introducen excepciones de lectura o cierre manual sin actualización formal de este documento.

---

## 7. Impacto en diseño

- Toda EF del add-on debe estructurarse con la verificación de entitlement como primera operación, antes de parsear el payload completo o realizar cualquier consulta de dominio.
- El desacoplamiento del add-on del Core exige que la comprobación de entitlement sea local al add-on: no puede depender de que el Core llame al add-on ni de que el add-on llame al Core en flujos síncronos críticos.
- La UI no debe realizar llamadas a EFs del add-on si el estado de entitlement conocido en el cliente no está activo. Esto es una optimización de UX, no una sustitución de la verificación server-side.
- El modelo de doble gating requiere que SC y SI mantengan sus verificaciones de forma independiente y sin acoplamiento directo.

---

## 8. Impacto en implementación

- Cualquier PR que implemente una EF del add-on sin verificación de entitlement debe rechazarse.
- Cualquier PR que acepte el estado de entitlement desde el payload externo debe rechazarse.
- Cualquier PR que omita la verificación inmediata antes del INSERT debe rechazarse.
- El port y el adapter de verificación de entitlement se definen en SI-P4. Hasta entonces, la verificación queda clasificada como pendiente de implementación.
- La UI debe condicionar la renderización del módulo al resultado de la consulta de entitlement, no a una variable de sesión estática.

---

## 9. Dependencias

| Dependencia | Relación |
|---|---|
| `rules-00-scope-and-principles.md` §4.2 | Define la condición de entitlement activo y delega el mecanismo a este documento |
| `rules-05-roles-and-visibility.md` | Define los roles autorizados; el entitlement es precondición de visibilidad y acción |
| `REQ-013-saas-services-catalog.md` | Define el modelo de `saas_services` y `saas_service_subscriptions`; fuente del código `smart_incidents` |
| `rules-80-security-and-tenancy.md` | Define el aislamiento multi-tenant y las validaciones de dominio que siguen a la verificación de entitlement |
| `contract-create-incident-request.md` | Definirá el payload exacto del error `FEATURE_DISABLED` — pendiente de creación (SI-P2B) |
| `rules-50-n8n-automation.md` | Definirá el mecanismo concreto de verificación defensiva de entitlement en n8n — pendiente de creación (SI-P6A) |

---

## 10. Checklist de validación

- [ ] Ninguna EF del add-on ejecuta ninguna operación sin verificar `saas_service_subscriptions.status = 'active'` para el servicio `smart_incidents`
- [ ] El identificador del servicio usado en la consulta es `smart_incidents` (valor de `saas_services.code`)
- [ ] La verificación se realiza al inicio de la EF y nuevamente inmediatamente antes de persistir
- [ ] La UI no renderiza ningún componente del módulo cuando el entitlement no está activo
- [ ] n8n descarta eventos de `client_account` sin entitlement activo
- [ ] El provider no delega la verificación de entitlement al consumer
- [ ] Las incidencias históricas se conservan cuando el entitlement pasa a estado inactivo
- [ ] El Core sigue funcionando sin afectación cuando el entitlement del add-on cambia de estado
- [ ] Ningún mecanismo de retry omite la verificación de entitlement
- [ ] No existe ninguna excepción de lectura o cierre manual sin decisión canónica documentada

---

## 11. Notas de control de cambios

Los cambios en este documento requieren revisión de arquitectura antes del merge.

Este documento tiene precedencia sobre cualquier implementación que gestione el entitlement del add-on. Una modificación en el criterio de entitlement (por ejemplo, nuevos estados habilitantes o excepciones de lectura) debe reflejarse aquí antes de implementarse.

Los cambios que afecten al identificador canónico del servicio (`smart_incidents`) deben coordinarse con el equipo responsable del catálogo SaaS del Core y con `REQ-013-saas-services-catalog.md`.
