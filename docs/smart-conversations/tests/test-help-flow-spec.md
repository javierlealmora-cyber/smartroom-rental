# test-help-flow-spec.md — Especificación de Pruebas: Flujo del Servicio de Ayuda (WF-40)

## 1. Objetivo

Verificar que WF-40 gestiona las consultas de ayuda según `rules-62-service-help.md`: el acceso diferenciado por nivel de identidad (FAQ público para todos, datos personales solo con `PARTIAL_MATCH_ACTIVE` o superior, datos contractuales solo con `STRONG_MATCH_ACTIVE`), el umbral de confianza 0.8 de la base de conocimiento, el escalado cuando la KB no tiene respuesta suficiente, y la regla de que la IA nunca recibe datos personales del inquilino.

---

## 2. Alcance

| Incluye | Excluye |
|---|---|
| Acceso a FAQ público para todos los niveles de identidad | Lógica interna de la base de conocimiento del Core |
| Acceso diferenciado a datos personales y contractuales | Panel de administración de la KB |
| Umbral de confianza 0.8 de la KB | Gestión del ciclo de vida de los casos de ayuda |
| Escalado cuando confianza < 0.8 o KB sin respuesta | |
| Restricciones de lo que recibe la IA en este servicio | |
| `UNVERIFIED_LEAD` y su acceso a información de anuncios en WF-40 | |

---

## 3. Reglas y Contratos Cubiertos

| Documento | Sección | Qué se verifica |
|---|---|---|
| `rules-62-service-help.md` | §4.1 | FAQ público: accesible para `NO_MATCH`, `MATCH_INACTIVE`, `UNVERIFIED_LEAD` |
| `rules-62-service-help.md` | §4.2 | Datos personales: requieren `PARTIAL_MATCH_ACTIVE` o superior |
| `rules-62-service-help.md` | §4.3 | Datos contractuales: requieren `STRONG_MATCH_ACTIVE` |
| `rules-62-service-help.md` | §4.4 | Umbral de confianza 0.8 de la KB |
| `rules-62-service-help.md` | §4.5 | Escalado a admin cuando KB no tiene respuesta suficiente |
| `rules-80-data-and-privacy.md` | §4.1 | IA no recibe `profile_id`, `full_name`, `room_label`, datos contractuales |
| `contract-canonical-response.md` | §3 | Estructura de respuestas de WF-40 |

---

## 4. Precondiciones

- Tenant con `conv_ayuda` activo en `conv_service_activations`.
- Base de conocimiento del tenant configurada con artículos de FAQ y datos contractuales.
- `conv-core-get-accommodation-info` disponible y simulable.
- Sesión con `identity_level` variable según escenario.

---

## 5. Escenarios de Prueba

### Bloque HLP — FAQ público (todos los niveles)

**HLP-01: `NO_MATCH` accede a FAQ público → respuesta con confianza ≥ 0.8**

- **Precondición**: `identity_level = 'NO_MATCH'`. Usuario pregunta sobre horarios de la residencia.
- **Acción**: WF-40 consulta la KB con la pregunta del usuario.
- **Resultado esperado**:
  - KB devuelve artículo relevante con `confidence ≥ 0.8`.
  - IA redacta respuesta con contenido público del artículo.
  - `CanonicalResponse { response_type: 'success', text: "..." }`.
  - La IA no recibe `profile_id`, `full_name` ni `room_label` en el prompt.
- **Regla cubierta**: `rules-62` §4.1; `rules-80` §4.1.

---

**HLP-02: `MATCH_INACTIVE` accede a FAQ público**

- **Precondición**: `identity_level = 'MATCH_INACTIVE'`. Pregunta sobre política de mascotas.
- **Resultado esperado**:
  - Mismo acceso que `NO_MATCH` al FAQ público.
  - No se expone información contractual del ex-inquilino.
- **Regla cubierta**: `rules-62` §4.1.

---

**HLP-03: `UNVERIFIED_LEAD` accede a FAQ público + información de anuncios**

- **Precondición**: `identity_level = 'UNVERIFIED_LEAD'`. Pregunta sobre proceso de reserva.
- **Resultado esperado**:
  - FAQ público disponible.
  - Si la pregunta involucra un anuncio específico, se puede derivar a WF-30.
- **Regla cubierta**: `rules-62` §4.1.

---

### Bloque HLP — Datos personales (`PARTIAL_MATCH_ACTIVE` o superior)

**HLP-04: `PARTIAL_MATCH_ACTIVE` accede a datos personales**

- **Precondición**: `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Usuario pregunta sobre su reserva.
- **Resultado esperado**:
  - WF-40 puede acceder a datos personales básicos del usuario (nombre, residencia).
  - No puede acceder a datos contractuales (saldo, fechas exactas de contrato).
- **Regla cubierta**: `rules-62` §4.2.

---

**HLP-05: `NO_MATCH` pregunta por datos personales → requiere identificación**

- **Precondición**: `identity_level = 'NO_MATCH'`. Usuario pregunta "¿Cuándo entra mi compañero?".
- **Resultado esperado**:
  - WF-40 detecta que la pregunta requiere datos personales.
  - Se activa WF-IDENTITY para mejorar el nivel de identidad.
  - `CanonicalResponse { response_type: 'identity_required' }`.
- **Regla cubierta**: `rules-62` §4.2.

---

### Bloque HLP — Datos contractuales (`STRONG_MATCH_ACTIVE`)

**HLP-06: `STRONG_MATCH_ACTIVE` accede a datos contractuales propios**

- **Precondición**: `identity_level = 'STRONG_MATCH_ACTIVE'`. Usuario pregunta por fecha de fin de contrato.
- **Resultado esperado**:
  - EF recupera datos contractuales del Core internamente.
  - IA recibe marcador `{contract_end_date}` en el prompt; la EF sustituye el valor real.
  - `CanonicalResponse { response_type: 'success', text: "Tu contrato finaliza el {contract_end_date}." }` con la fecha real sustituida.
  - La IA nunca recibe la fecha real directamente.
- **Regla cubierta**: `rules-62` §4.3; `rules-80` §4.2.

---

**HLP-07: `PARTIAL_MATCH_ACTIVE` pregunta por saldo → requiere identidad completa**

- **Precondición**: `identity_level = 'PARTIAL_MATCH_ACTIVE'`. Usuario pregunta por su saldo pendiente.
- **Resultado esperado**:
  - WF-40 detecta que la pregunta requiere `STRONG_MATCH_ACTIVE`.
  - Se activa WF-IDENTITY para mejorar el nivel.
  - Si el nivel no mejora: escalado a admin o respuesta genérica.
- **Regla cubierta**: `rules-62` §4.3.

---

### Bloque HLP — Umbral de confianza de la KB

**HLP-08: KB devuelve confianza < 0.8 → escalado a admin**

- **Precondición**: `identity_level = 'STRONG_MATCH_ACTIVE'`. Usuario hace una pregunta muy específica no cubierta en la KB.
- **Acción**: KB devuelve artículos con `confidence < 0.8`.
- **Resultado esperado**:
  - WF-40 no genera respuesta inventada.
  - `conv-escalate-case` invocado.
  - `CanonicalResponse { response_type: 'escalated' }`.
  - El usuario recibe: "No tengo respuesta exacta para tu consulta. Un miembro del equipo te atenderá."
- **Regla cubierta**: `rules-62` §4.4; `rules-62` §4.5.

---

**HLP-09: KB devuelve confianza ≥ 0.8 → IA redacta respuesta**

- **Precondición**: KB tiene artículo con `confidence = 0.92` para la pregunta del usuario.
- **Resultado esperado**:
  - IA recibe el texto del artículo de la KB para redactar la respuesta.
  - La IA no recibe datos personales ni contractuales del inquilino.
  - `CanonicalResponse { response_type: 'success' }`.
- **Regla cubierta**: `rules-62` §4.4.

---

**HLP-10: KB sin ningún artículo relevante → escalado**

- **Precondición**: KB del tenant vacía o sin artículos para el tema consultado.
- **Resultado esperado**:
  - Sin respuesta de KB → escalado directo.
  - Usuario recibe mensaje de escalado genérico.
- **Regla cubierta**: `rules-62` §4.5.

---

### Bloque HLP — Restricciones de privacidad en WF-40

**HLP-11: IA no recibe datos contractuales en el prompt aunque usuario tenga `STRONG_MATCH_ACTIVE`**

- **Precondición**: `STRONG_MATCH_ACTIVE`. Respuesta requiere fecha de contrato.
- **Resultado esperado**:
  - Prompt a la IA: `"Redacta una respuesta indicando que el contrato finaliza el {contract_end_date}."`.
  - La IA devuelve: `"Tu contrato finaliza el {contract_end_date}."`.
  - La EF sustituye `{contract_end_date}` por el valor real **después** de la generación.
- **Regla cubierta**: `rules-80` §4.2.

---

**HLP-12: IA no recibe `full_name` del inquilino en el prompt de WF-40**

- **Precondición**: Sesión con `identity_data.full_name = "Carlos Ruiz"`. Respuesta personalizada que menciona el nombre.
- **Resultado esperado**:
  - El prompt a la IA no incluye el nombre del usuario como valor literal: `"Responde a la consulta del usuario de forma personalizada y cordial."`.
  - Si el contexto del servicio requiere mencionar el nombre, la EF lo añade al texto generado **después** de la generación por IA (inyección post-generación). `{user_name}` no es un marcador del catálogo oficial y no debe usarse como tal.
  - La IA nunca recibe `"Carlos Ruiz"` directamente en el prompt.
- **Regla cubierta**: `rules-80` §4.1; `rules-80` §4.2.

---

## 6. Casos Negativos

| ID | Caso negativo | Resultado esperado |
|---|---|---|
| HLP-NEG-01 | WF-40 devuelve respuesta inventada cuando KB tiene confianza < 0.8 | Violación de `rules-62` §4.4; debe escalar, no inventar |
| HLP-NEG-02 | `NO_MATCH` accede a datos de contrato sin identificación previa | Violación de `rules-62` §4.3; requiere `STRONG_MATCH_ACTIVE` |
| HLP-NEG-03 | IA recibe `full_name` del inquilino directamente en el prompt | Violación de `rules-80` §4.1; el nombre no debe incluirse como dato estructurado en el prompt; la EF puede inyectarlo post-generación si es necesario, pero no como marcador no definido |
| HLP-NEG-04 | IA recibe fecha de contrato real en el prompt (en lugar de marcador `{contract_end_date}`) | Violación de `rules-80` §4.2 |
| HLP-NEG-05 | `PARTIAL_MATCH_ACTIVE` accede a saldo pendiente sin mejora de identidad | Violación de `rules-62` §4.3; requiere `STRONG_MATCH_ACTIVE` |
| HLP-NEG-06 | Umbral de confianza configurado en WF-40 en lugar de leerlo de la configuración del tenant | No respeta la configuración por tenant; umbral hardcodeado |

---

## 7. Datos de Prueba

```json
{
  "kb_articles": {
    "high_confidence": {
      "article_id": "kb-001",
      "topic": "horarios_residencia",
      "confidence": 0.92,
      "content": "La residencia está abierta de 07:00 a 23:00 todos los días."
    },
    "low_confidence": {
      "article_id": "kb-002",
      "topic": "consulta_especifica",
      "confidence": 0.65,
      "content": "Respuesta parcialmente relevante."
    },
    "no_article": null
  },
  "contractual_data": {
    "contract_end_date": "2026-08-31",
    "monthly_amount": 650,
    "pending_balance": 125.50
  },
  "sessions": {
    "no_match": { "identity_level": "NO_MATCH" },
    "match_inactive": { "identity_level": "MATCH_INACTIVE" },
    "unverified_lead": { "identity_level": "UNVERIFIED_LEAD" },
    "partial_match": { "identity_level": "PARTIAL_MATCH_ACTIVE", "identity_data": { "full_name": "Carlos Ruiz" } },
    "strong_match": { "identity_level": "STRONG_MATCH_ACTIVE", "profile_id": "prof-001" }
  },
  "questions": {
    "public_faq": "¿Cuáles son los horarios de la residencia?",
    "personal_data": "¿Cuándo termina mi contrato?",
    "contractual": "¿Cuánto tengo pendiente de pago este mes?",
    "unknown_topic": "¿Qué pasa si quiero cambiar la tarifa de electricidad en mi contrato?",
    "no_kb_match": "¿Podéis instalar fibra óptica propia en mi habitación?"
  }
}
```

---

## 8. Criterio de Aceptación

| Criterio | Condición de éxito |
|---|---|
| FAQ público accesible para todos los niveles | `NO_MATCH`, `MATCH_INACTIVE`, `UNVERIFIED_LEAD` reciben respuestas del FAQ |
| Datos contractuales solo para `STRONG_MATCH_ACTIVE` | Cualquier nivel inferior recibe respuesta de escalado o requiere identificación |
| Umbral 0.8 aplicado sin inventar respuestas | KB con confianza < 0.8 siempre escala; nunca genera respuesta no respaldada |
| IA no recibe datos personales directamente | Revisión de todos los prompts: `full_name`, `room_label`, datos contractuales ausentes |
| Marcadores sustituidos correctamente | El usuario recibe texto con datos reales; la IA solo generó el marcador |
| Escalado cuando KB no tiene respuesta suficiente | `response_type: 'escalated'` y mensaje al admin generados |

---

## 9. Dependencias

| Documento | Relación |
|---|---|
| `rules-62-service-help.md` | Fuente de verdad del flujo de ayuda |
| `rules-80-data-and-privacy.md` §4.1, §4.2 | Restricciones de privacidad y mecanismo de marcadores |
| `rules-40-identity-validation.md` §4.6 | Matriz de acciones permitidas por nivel |
| `contract-canonical-response.md` | Estructura de respuestas de WF-40 |
| `skill-n8n-help-workflow.md` | Detalles de implementación de WF-40 |
