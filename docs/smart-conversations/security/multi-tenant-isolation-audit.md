# Multi-Tenant Isolation Audit — SmartConversations
<!-- Fase 11B1 · Auditoría 2026-07-21 -->

> Auditoría de aislamiento multi-tenant. No modifica código ni políticas.
> Fuente: inspección de EFs y migración SQL.

---

## Modelo de aislamiento actual

El aislamiento multi-tenant en SmartConversations opera en tres capas:

| Capa | Mecanismo | Fortaleza | Debilidad |
|---|---|---|---|
| 1. DB | RLS service_role only | Acceso externo imposible sin service_role | Sin FORCE RLS; filtro de tenant solo en EF |
| 2. EF | client_account_id verificado contra DB | Verificación activa en EFs | Depende de implementación correcta; sin doble verificación |
| 3. Schema | UNIQUE(client_account_id, channel, sender_ref) en conv_sessions | Previene colisión de sesiones cross-tenant | No protege contra queries con client_account_id arbitrario |

**Conclusión:** La separación multi-tenant actual es **código-dependiente**, no **DB-dependiente**. Si una EF tiene un bug de lógica, no hay segunda línea de defensa a nivel de base de datos.

---

## Casos de prueba de aislamiento

### Caso 1: Tenant A usa session_id de Tenant B

**Escenario:** Tenant A conoce un session_id válido de Tenant B y envía request a conv-web-poll.

**Control actual:**
- conv-web-poll verifica `client_account_id` + `session_id` juntos en DB lookup
- Si session_id pertenece a Tenant B pero el `client_account_id` enviado es de Tenant A → no encuentra registro → 403
- Si el atacante también envía el `client_account_id` correcto de Tenant B → habría que obtenerlo también

**Fuente del client_account_id en conv-web-poll:** Body del request (en modo legacy). En modo signed_token: del token HMAC verificado.

**Resultado en modo legacy:** El atacante puede enviar `client_account_id` de Tenant B (si lo conoce) + `session_id` de Tenant B (si lo conoce) → acceso a mensajes de Tenant B.

**Finding generado:** SEC-013 — tenant isolation depende de conocimiento de UUIDs opacas; mitigado por opacidad pero sin garantía criptográfica en modo legacy.

---

### Caso 2: Tenant A usa sender_ref de Tenant B

**Escenario:** Tenant A envía sender_ref de una sesión de Tenant B.

**Control actual:**
- conv-web-message verifica existencia de sesión con AMBOS `client_account_id` + `sender_ref`
- Si A no tiene el client_account_id de B → falla lookup
- Si A tiene ambos UUIDs → acceso posible en modo legacy

**Resultado:** Mismo análisis que Caso 1. Finding SEC-013.

---

### Caso 3: Tenant A consulta conv-web-poll con client_account_id de Tenant B

**Escenario:** Tenant A manipula el body de conv-web-poll con `client_account_id` de Tenant B.

**Control actual:**
- En modo legacy: el body se acepta directamente; se hace DB lookup que verifica que session_id pertenece a ese client_account_id
- Si session_id es de Tenant B y client_account_id es de Tenant B → acceso a mensajes de Tenant B

**Resultado:** Acceso posible si atacante conoce ambos UUIDs. Finding SEC-013.

---

### Caso 4: Tenant A envía client_account_id arbitrario a conv-web-session

**Escenario:** Tenant A envía `client_account_id` de Tenant B al crear sesión.

**Control actual:**
- conv-web-session busca en conv_wc_configs con ese client_account_id
- Si el UUID es válido y está activo → crea sesión asociada a Tenant B
- El tenant (A) obtiene una sesión de Tenant B

**Resultado crítico:** Sin validación adicional (JWT u otra), cualquier conocedor del UUID de un tenant puede crear sesiones en su nombre. **Finding SEC-013 (CRITICAL para producción).**

---

### Caso 5: Tenant A fuerza case_id de Tenant B

**Escenario:** Tenant A envía case_id de Tenant B a conv-escalate-case o conv-close-case.

**Control actual:**
- EFs requieren service_role → no accesibles desde exterior
- Aislamiento garantizado por diseño de EFs internas

**Resultado:** ✅ **Aislado.** Solo EFs con service_role pueden manipular casos; el widget no puede invocar conv-escalate-case directamente.

---

### Caso 6: Tenant A intenta usar Wasender session de Tenant B

**Escenario:** Atacante intenta usar conv-wa-sessions de Tenant B para enviar mensajes WA.

**Control actual:**
- conv-send-wa requiere service_role → no accesible externamente
- Internamente: obtiene `wasender_session_id` de DB por `session_id` verificado (que a su vez tiene `client_account_id`)
- La cadena de FKs mantiene el aislamiento

**Resultado:** ✅ **Aislado** por diseño de EF interna.

---

### Caso 7: Token WebChat de Tenant A se usa en Tenant B

**Escenario:** Token signed_token de una sesión de Tenant A se presenta a conv-web-poll de Tenant B.

**Control actual (modo signed_token):**
- Token contiene `client_account_id` de Tenant A firmado con HMAC
- Al verificar token, se compara `client_account_id` del token con DB lookup de la sesión
- Si `session_id` existe pero pertenece a Tenant B, el `client_account_id` del token (Tenant A) no coincidirá con el del registro

**Resultado:** ✅ **Aislado** en modo signed_token. En modo legacy: depende de UUIDs (ver Caso 3).

---

### Caso 8: JWT de usuario de Tenant A se usa con client_account_id de Tenant B

**Escenario:** Usuario autenticado de Tenant A usa su JWT de Supabase para acceder a recursos de Tenant B.

**Control actual:**
- EFs WebChat públicas no validan JWT de usuario
- EFs internas requieren service_role → no accesibles con JWT de usuario
- No hay vector de ataque directo mediante JWT de usuario en el diseño actual

**Resultado:** ✅ **No aplicable** en diseño actual (WebChat no usa JWT de usuario).

---

### Caso 9: Operador n8n altera client_account_id

**Escenario:** n8n recibe un event de workflow e intenta alterar el `client_account_id` antes de que se procese.

**Control actual:**
- n8n recibe solo el payload del workflow (sin PII)
- Las EFs que llaman a n8n no usan la respuesta de n8n para determinar `client_account_id`
- El `client_account_id` viene del estado de la sesión en DB, no de n8n

**Resultado:** ✅ **Aislado** por diseño (n8n es downstream; no upstream para tenant context).

---

### Caso 10: Core response devuelve entidad de otro tenant

**Escenario:** Core devuelve datos de un inquilino equivocado en respuesta a query de identidad.

**Control actual:**
- Core adapter es mock en Fase 11A → sin riesgo actual
- En Fase real: responsabilidad del Core verificar que la query es autorizada
- SmartConversations usa el `client_account_id` de la sesión para la query; si Core no verifica, podría devolver datos ajenos

**Resultado:** ⚠️ **Pendiente verificación** cuando Core sea real. Finding SEC-019 (MEDIUM para fase real).

---

### Caso 11: Queue item de Tenant A intenta procesarse como Tenant B

**Escenario:** Item en conv_send_queue con client_account_id de Tenant A es alterado para tener client_account_id de Tenant B.

**Control actual:**
- conv_send_queue tiene RLS service_role only → sin acceso exterior
- conv-process-send-queue lee queue items y usa el `client_account_id` del item para DB operations
- Si el item tiene client_account_id incorrecto → las EFs downstream verificarán desde DB que el session_id pertenece al tenant correcto

**Resultado:** ✅ **Aislado** por verificación de FK chain (session_id → conv_sessions → client_account_id).

---

### Caso 12: Activity publisher recibe client_account_id alterado

**Escenario:** EF llama a conv-core-publish-activity con client_account_id manipulado.

**Control actual:**
- conv-core-publish-activity requiere service_role → solo invocable por EFs internas
- El client_account_id en el payload viene de la sesión verificada (DB)
- Core Activity Log: responsabilidad del Core verificar ownership del tenant

**Resultado:** ✅ **Mitigado** para EFs internas. Pendiente verificación en Core real.

---

## Análisis de rutas donde el aislamiento depende de request no verificado

| Ruta | Campo no verificado | EF | Modo | Finding |
|---|---|---|---|---|
| Widget → conv-web-session | client_account_id en body | conv-web-session | legacy | SEC-013 (no hay JWT de usuario; cualquiera con UUID puede crear sesión) |
| Widget → conv-web-message | client_account_id en body | conv-web-message | legacy | SEC-013 (verificado contra DB, pero DB no filtra por identidad del llamante) |
| Widget → conv-web-poll | client_account_id en body | conv-web-poll | legacy | SEC-013 |
| Widget → conv-web-session | Origin header (si allowedOrigins=[]) | conv-web-session | legacy | SEC-017 (CORS bypasseable si allowedOrigins vacío) |

---

## Resumen de findings de aislamiento

| Caso | Resultado | Finding | Severidad |
|---|---|---|---|
| 1: session_id cross-tenant | ⚠️ Posible en modo legacy | SEC-013 | HIGH |
| 2: sender_ref cross-tenant | ⚠️ Posible en modo legacy | SEC-013 | HIGH |
| 3: client_account_id manipulation | ⚠️ Posible en modo legacy | SEC-013 | HIGH |
| 4: Crear sesión en otro tenant | ⚠️ Posible con UUID conocido | SEC-013 | CRITICAL (producción) |
| 5: case_id cross-tenant | ✅ Aislado | — | — |
| 6: Wasender session cross-tenant | ✅ Aislado | — | — |
| 7: Token WebChat cross-tenant | ✅ En signed_token mode | SEC-004 (si legacy) | HIGH |
| 8: JWT cross-tenant | ✅ N/A | — | — |
| 9: n8n altera client_account_id | ✅ Aislado | — | — |
| 10: Core response otro tenant | ⚠️ Pendiente (mock) | SEC-019 | MEDIUM |
| 11: Queue cross-tenant | ✅ Aislado | — | — |
| 12: Activity publisher alterado | ✅ Mitigado | — | — |

---

## Estado de GATE_1

12 escenarios analizados. Finding principal: SEC-013 (dependencia de modo legacy).

**GATE_1: AUDIT_COMPLETE_REMEDIATION_PENDING**
