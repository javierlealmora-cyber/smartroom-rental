/**
 * generic-http-provider.ts -- Adaptador HTTP generico para proveedores de IA.
 *
 * Soporta formatos comunes (OpenAI-compatible y Anthropic).
 * Proveedores extensibles via AI_PROVIDER sin hardcodear uno como definitivo.
 *
 * No hardcodear API keys. No loguear Authorization ni AI_API_KEY.
 * No llamar servicios reales en tests.
 *
 * Fuente: SmartConversations Fase 10C.
 */

import type { AiProvider } from '../ai-client.ts';

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

export interface ProviderCallOptions {
  operation:         string;
  client_account_id: string;
  safe_input:        string;
  max_tokens?:       number;
  signal?:           AbortSignal;
}

// ---------------------------------------------------------------------------
// Lectura de config por proveedor -- Deno.env en Edge Functions
// ---------------------------------------------------------------------------

function _getEnv(key: string): string | undefined {
  try {
    // @ts-ignore
    if (typeof Deno !== 'undefined') return Deno.env.get(key);
  } catch { /**/ }
  return undefined;
}

interface ProviderConfig {
  baseUrl:    string;
  apiKey:     string | null;
  model:      string;
  deployment: string | undefined; // Azure OpenAI
  apiVersion: string | undefined; // Azure OpenAI
}

function _readProviderConfig(provider: AiProvider): ProviderConfig | null {
  switch (provider) {
    case 'openai':
      return {
        baseUrl:    _getEnv('OPENAI_BASE_URL') ?? _getEnv('AI_BASE_URL') ?? 'https://api.openai.com',
        apiKey:     _getEnv('OPENAI_API_KEY')  ?? _getEnv('AI_API_KEY') ?? null,
        model:      _getEnv('OPENAI_MODEL')    ?? _getEnv('AI_MODEL')   ?? 'gpt-4o-mini',
        deployment: undefined,
        apiVersion: undefined,
      };
    case 'anthropic':
      return {
        baseUrl:    _getEnv('ANTHROPIC_BASE_URL') ?? _getEnv('AI_BASE_URL') ?? 'https://api.anthropic.com',
        apiKey:     _getEnv('ANTHROPIC_API_KEY')  ?? _getEnv('AI_API_KEY') ?? null,
        model:      _getEnv('ANTHROPIC_MODEL')    ?? _getEnv('AI_MODEL')   ?? 'claude-haiku-4-5-20251001',
        deployment: undefined,
        apiVersion: undefined,
      };
    case 'azure_openai': {
      const endpoint   = _getEnv('AZURE_OPENAI_ENDPOINT')   ?? _getEnv('AI_BASE_URL') ?? '';
      const deployment = _getEnv('AZURE_OPENAI_DEPLOYMENT')  ?? _getEnv('AI_MODEL')    ?? 'gpt-4o';
      const apiVersion = _getEnv('AZURE_OPENAI_API_VERSION') ?? '2024-02-01';
      return {
        baseUrl:    endpoint,
        apiKey:     _getEnv('AZURE_OPENAI_API_KEY') ?? _getEnv('AI_API_KEY') ?? null,
        model:      deployment,
        deployment,
        apiVersion,
      };
    }
    case 'google_gemini':
      return {
        baseUrl:    _getEnv('AI_BASE_URL') ?? 'https://generativelanguage.googleapis.com',
        apiKey:     _getEnv('GOOGLE_AI_API_KEY') ?? _getEnv('AI_API_KEY') ?? null,
        model:      _getEnv('GOOGLE_AI_MODEL')   ?? _getEnv('AI_MODEL')   ?? 'gemini-1.5-flash',
        deployment: undefined,
        apiVersion: undefined,
      };
    case 'mistral':
      return {
        baseUrl:  _getEnv('AI_BASE_URL') ?? 'https://api.mistral.ai',
        apiKey:   _getEnv('MISTRAL_API_KEY') ?? _getEnv('AI_API_KEY') ?? null,
        model:    _getEnv('MISTRAL_MODEL')   ?? _getEnv('AI_MODEL')   ?? 'mistral-small-latest',
        deployment: undefined,
        apiVersion: undefined,
      };
    case 'groq':
      return {
        baseUrl:  _getEnv('AI_BASE_URL') ?? 'https://api.groq.com',
        apiKey:   _getEnv('GROQ_API_KEY') ?? _getEnv('AI_API_KEY') ?? null,
        model:    _getEnv('GROQ_MODEL')   ?? _getEnv('AI_MODEL')   ?? 'llama3-8b-8192',
        deployment: undefined,
        apiVersion: undefined,
      };
    case 'local_llm':
      return {
        baseUrl:  _getEnv('LOCAL_LLM_BASE_URL') ?? _getEnv('AI_BASE_URL') ?? 'http://localhost:11434',
        apiKey:   _getEnv('AI_API_KEY') ?? null,
        model:    _getEnv('LOCAL_LLM_MODEL') ?? _getEnv('AI_MODEL') ?? 'llama3',
        deployment: undefined,
        apiVersion: undefined,
      };
    case 'other':
      return {
        baseUrl:  _getEnv('AI_BASE_URL') ?? '',
        apiKey:   _getEnv('AI_API_KEY') ?? null,
        model:    _getEnv('AI_MODEL') ?? '',
        deployment: undefined,
        apiVersion: undefined,
      };
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Construccion de URL por proveedor
// ---------------------------------------------------------------------------

function _buildEndpointUrl(provider: AiProvider, cfg: ProviderConfig): string {
  switch (provider) {
    case 'openai':
    case 'mistral':
      return `${cfg.baseUrl}/v1/chat/completions`;
    case 'anthropic':
      return `${cfg.baseUrl}/v1/messages`;
    case 'azure_openai':
      return `${cfg.baseUrl}/openai/deployments/${cfg.deployment}/chat/completions?api-version=${cfg.apiVersion}`;
    case 'google_gemini':
      return `${cfg.baseUrl}/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey ?? ''}`;
    case 'groq':
      return `${cfg.baseUrl}/openai/v1/chat/completions`;
    case 'local_llm':
    case 'other':
    default:
      return `${cfg.baseUrl}/v1/chat/completions`;
  }
}

// ---------------------------------------------------------------------------
// Construccion del cuerpo de la peticion
// ---------------------------------------------------------------------------

function _buildRequestBody(provider: AiProvider, cfg: ProviderConfig, opts: ProviderCallOptions): unknown {
  const systemPrompt = `You are a SmartConversations AI assistant. Operation: ${opts.operation}. Respond with valid JSON only. No PII in response.`;

  if (provider === 'anthropic') {
    return {
      model:      cfg.model,
      max_tokens: opts.max_tokens ?? 256,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: opts.safe_input }],
    };
  }

  if (provider === 'google_gemini') {
    return {
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${opts.safe_input}` }] }],
      generationConfig: { maxOutputTokens: opts.max_tokens ?? 256 },
    };
  }

  // OpenAI-compatible (openai, azure_openai, mistral, groq, local_llm, other)
  return {
    model:      cfg.model,
    max_tokens: opts.max_tokens ?? 256,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: opts.safe_input },
    ],
  };
}

// ---------------------------------------------------------------------------
// Construccion de headers -- API key nunca se loguea
// ---------------------------------------------------------------------------

function _buildHeaders(provider: AiProvider, cfg: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client-Account-Id': '', // sobrescribir en llamada si necesario
  };

  if (provider === 'anthropic') {
    // Anthropic usa x-api-key
    if (cfg.apiKey) headers['x-api-key'] = cfg.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  } else if (provider === 'azure_openai') {
    if (cfg.apiKey) headers['api-key'] = cfg.apiKey;
  } else if (provider === 'google_gemini') {
    // Gemini: apiKey va en query param, no en header
  } else {
    // OpenAI-compatible: Bearer token
    if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  }

  return headers;
}

// ---------------------------------------------------------------------------
// callAiProvider -- punto de entrada para ai-client
// ---------------------------------------------------------------------------

export async function callAiProvider(
  provider: AiProvider,
  opts:     ProviderCallOptions,
): Promise<Response> {
  const cfg = _readProviderConfig(provider);

  if (!cfg) {
    // Provider desconocido -- devolver respuesta de error sin crash
    return new Response(
      JSON.stringify({ error: 'AI_PROVIDER_UNKNOWN' }),
      { status: 400 },
    ) as Response;
  }

  const hasCredentials = !!(cfg.apiKey || provider === 'local_llm');
  if (!hasCredentials && provider !== 'other') {
    return new Response(
      JSON.stringify({ error: 'AI_CREDENTIALS_MISSING' }),
      { status: 401 },
    ) as Response;
  }

  const url     = _buildEndpointUrl(provider, cfg);
  const body    = _buildRequestBody(provider, cfg, opts);
  const headers = _buildHeaders(provider, cfg);

  // No loguear url (puede contener apiKey en query param Gemini), headers, ni body
  return fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
    signal:  opts.signal,
  });
}
