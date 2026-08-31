# SmartConversations — AI Integration: Variables de entorno

Variables para la integracion con proveedor de IA.
**No incluir valores reales. No commitear API keys.**

## Control de modo (obligatorias)

```dotenv
# Modo de integracion con IA: 'mock' (default) o 'real'
# Si no se define, el sistema usa mock -- nunca llama al proveedor real.
AI_INTEGRATION_MODE=mock

# Proveedor de IA seleccionado por configuracion
# Valores: mock | openai | anthropic | azure_openai | google_gemini | mistral | groq | local_llm | other
# Si no se define, el sistema usa mock.
AI_PROVIDER=mock
```

## Variables genericas (aplican a cualquier proveedor)

```dotenv
# Modelo a usar (cada proveedor tiene sus propios modelos)
AI_MODEL=

# API key generica (puede sobreescribirse con la variable especifica del proveedor)
AI_API_KEY=

# URL base generica (si el proveedor usa endpoint propio)
AI_BASE_URL=

# Timeout por llamada en milisegundos (default: 8000)
AI_TIMEOUT_MS=8000

# Maximo de reintentos para 429/5xx/timeout (default: 2)
AI_MAX_RETRIES=2

# Backoff en segundos entre reintentos, separado por comas (default: 1,3)
AI_RETRY_BACKOFF_SECONDS=1,3
```

## Variables especificas por proveedor

### OpenAI

```dotenv
OPENAI_API_KEY=REPLACE_WITH_OPENAI_KEY
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4o-mini
```

### Anthropic

```dotenv
ANTHROPIC_API_KEY=REPLACE_WITH_ANTHROPIC_KEY
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

### Azure OpenAI

```dotenv
AZURE_OPENAI_API_KEY=REPLACE_WITH_AZURE_KEY
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-02-01
```

### Google Gemini

```dotenv
GOOGLE_AI_API_KEY=REPLACE_WITH_GOOGLE_KEY
GOOGLE_AI_MODEL=gemini-1.5-flash
```

### Mistral

```dotenv
MISTRAL_API_KEY=REPLACE_WITH_MISTRAL_KEY
MISTRAL_MODEL=mistral-small-latest
```

### Groq

```dotenv
GROQ_API_KEY=REPLACE_WITH_GROQ_KEY
GROQ_MODEL=llama3-8b-8192
```

### LLM local (Ollama u otro)

```dotenv
LOCAL_LLM_BASE_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama3
```

## Notas de seguridad

1. Ninguna API key debe aparecer en logs, stubs n8n ni Activity Log.
2. Si `AI_INTEGRATION_MODE` no esta definida, el sistema usa `mock` automaticamente.
3. En modo real, si falta API key/base URL, las llamadas devuelven error controlado.
4. El proveedor seleccionado viene por configuracion -- no esta hardcodeado.
5. La IA no valida identidad, no decide permisos, no escribe en BD.
6. La IA no publica Activity Log, no llama Core, n8n ni Wasender directamente.
7. `safe_input` es el unico texto que llega al proveedor -- sin PII estructurada.
