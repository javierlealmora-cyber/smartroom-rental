# Variables de entorno — SmartConversations n8n

Variables esperadas para la capa n8n de SmartConversations.
**No incluir valores reales. No commitear secrets.**

## Variables de instancia n8n

```dotenv
# URL base de la instancia n8n (sin trailing slash)
# Ejemplo de despliegue: https://n8n.example.host
N8N_BASE_URL=https://n8n.your-instance.example.com

# Secret compartido para verificar que las llamadas de EFs a n8n son legítimas
# Generar con: openssl rand -hex 32
N8N_WEBHOOK_SECRET=REPLACE_WITH_STRONG_SECRET
```

## URLs de webhooks de cada workflow

Estas URLs las genera n8n al activar cada workflow.
Se configuran como variables de entorno en las Edge Functions, no en código.

```dotenv
# SC-WF-10: Routing de intención
N8N_SC_WF10_WEBHOOK_URL=https://n8n.your-instance.example.com/webhook/sc-wf10-routing

# SC-WF-20: Gestión de incidencias
N8N_SC_WF20_WEBHOOK_URL=https://n8n.your-instance.example.com/webhook/sc-wf20-incidents

# SC-WF-30: Gestión de publicaciones
N8N_SC_WF30_WEBHOOK_URL=https://n8n.your-instance.example.com/webhook/sc-wf30-listings

# SC-WF-40: Ayuda y soporte
N8N_SC_WF40_WEBHOOK_URL=https://n8n.your-instance.example.com/webhook/sc-wf40-help

# SC-WF-IDENTITY: Verificación de identidad guiada
N8N_SC_WF_IDENTITY_WEBHOOK_URL=https://n8n.your-instance.example.com/webhook/sc-wf-identity

# SC-WF-C00: Reconciliación operativa
N8N_SC_WF_C00_RECONCILE_WEBHOOK_URL=https://n8n.your-instance.example.com/webhook/sc-wf-c00-reconcile
```

## Variables de Supabase (usadas por EFs, no por n8n directamente)

```dotenv
# URL del proyecto Supabase
SUPABASE_URL=https://your-project.supabase.co

# Clave service_role — NUNCA enviar a n8n; solo en Edge Functions
# NUNCA incluir en JSONs de workflow n8n
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_SERVICE_ROLE_KEY
```

## Variables de servicios externos (usadas por EFs, no por n8n directamente)

```dotenv
# Clave de API de Anthropic — NUNCA enviar a n8n
ANTHROPIC_API_KEY=REPLACE_WITH_ANTHROPIC_KEY

# Clave de API de Wasender (WhatsApp) — NUNCA enviar a n8n
WASENDER_API_KEY=REPLACE_WITH_WASENDER_KEY
```

## Notas de seguridad

1. `SUPABASE_SERVICE_ROLE_KEY` nunca debe aparecer en workflows n8n ni en payloads hacia n8n.
2. `ANTHROPIC_API_KEY` y `WASENDER_API_KEY` solo se configuran en Edge Functions.
3. Si n8n necesita llamar a Supabase, debe usar una clave con permisos mínimos específicos,
   no la service_role general.
4. El `N8N_WEBHOOK_SECRET` se verifica en el header `X-SC-Webhook-Secret` de cada llamada.
5. Rotar todos los secrets tras cualquier exposición accidental.
