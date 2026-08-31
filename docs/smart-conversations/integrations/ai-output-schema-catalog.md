# AI Integration — Catálogo de Output Schemas

**Fase:** 11C3  
**Fecha:** 2026-07-24

## ClassifyIntentResult

```typescript
interface ClassifyIntentResult {
  intent: 'incident' | 'listing_search' | 'help' | 'unknown';
  confidence: number;           // [0, 1]
  requires_clarification: boolean;
  clarification_reason: string | null;
}
```

**Validación:** Intent debe estar en el enum. Confidence fuera de [0,1] → clampeo. Cualquier campo prohibido → fallback.

## ExtractIncidentResult

```typescript
interface ExtractIncidentResult {
  category?: string;
  description?: string;
  urgency_proposal?: 'low' | 'medium' | 'high';
  accommodation_reference?: string;
  room_reference?: string;
  missing_fields: string[];
  is_complete: boolean;
}
```

## ExtractListingsResult

```typescript
interface ExtractListingsResult {
  location?: string;
  price_min?: number;
  price_max?: number;
  room_type?: string;
  move_in_date?: string;
  preferences?: string[];
  missing_fields: string[];
  is_complete: boolean;
}
```

## ExtractHelpResult

```typescript
interface ExtractHelpResult {
  topic?: string;
  question_summary?: string;
  requires_private_data: boolean;
  missing_fields: string[];
}
```

## SummarizeCaseResult

```typescript
interface SummarizeCaseResult {
  facts: string[];
  pending_information: string[];
  actions_already_taken: string[];
  suggested_next_step: string | null;
  uncertainties: string[];
}
```

**Validación:** `facts`, `pending_information`, `actions_already_taken`, `uncertainties` deben ser arrays de strings. Cualquier campo prohibido en los strings → fallback.

## DraftResponseResult

```typescript
interface DraftResponseResult {
  text: string;   // max 1000 chars, sin HTML ni script
}
```

**Validación:** max 1000 chars, `<script>` → eliminado, tags HTML → eliminados.

## Campos prohibidos en cualquier output

Si el proveedor devuelve alguno de estos campos en la raíz del objeto, se activa el fallback:

`identity_level` · `client_account_id` · `profile_id` · `session_status` · `case_status` · `access_token` · `service_role` · `sql` · `tool_call` · `api_key` · `authorization`

## Comportamiento en error

| Error | Comportamiento |
|-------|---------------|
| Output no es objeto | Fallback determinista |
| Campo enum inválido | Fallback |
| Campo prohibido en output | Fallback |
| JSON inválido | Fallback |
| Timeout | Fallback (sin retry adicional) |
| 429 | Retry hasta MAX_RETRIES=2, luego fallback |
| 400/422 | Fallback directo (no retryable) |
