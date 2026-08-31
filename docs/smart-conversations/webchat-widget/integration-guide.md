# Guía de integración del Widget WebChat

## Prerrequisitos

1. Supabase configurado con `conv-web-session`, `conv-web-message`, `conv-web-poll` desplegados.
2. `conv_wc_configs` con `is_active=true` para el `client_account_id` del tenant.
3. Variables de entorno configuradas (ver `.env.example`).

## Activación paso a paso

### 1. Configurar `.env.local`

```
VITE_WEBCHAT_WIDGET_ENABLED=true
VITE_WEBCHAT_API_BASE_URL=https://<proyecto>.supabase.co
VITE_WEBCHAT_CLIENT_ACCOUNT_ID=<uuid-del-tenant>
```

### 2. Punto de montaje real

El widget ya está integrado en `src/layouts/V2Layout.jsx` (fichero existente modificado en Fase 10G).
No es necesario montar manualmente; basta con activar el flag.

Líneas añadidas al final del JSX de V2Layout:

```jsx
import { getWebchatConfig, useWebChat, WebChatLauncher, WebChatPanel, WebChatErrorBoundary } from '../features/webchat';

// Dentro del componente de layout:
const config = getWebchatConfig();
if (!config.enabled) return <>{children}</>;

const chat = useWebChat({ config });
return (
  <>
    {children}
    <WebChatErrorBoundary>
      <WebChatLauncher isOpen={chat.isOpen} onToggle={chat.isOpen ? chat.close : chat.open} />
      <WebChatPanel isOpen={chat.isOpen} onClose={chat.close} {...chat} onSend={chat.send} />
    </WebChatErrorBoundary>
  </>
);
```

### 3. Realtime (opcional)

Para activar notificaciones en tiempo real:

```
VITE_WEBCHAT_REALTIME_ENABLED=true
```

```jsx
import { createRealtimeAdapter } from '../features/webchat';
import { supabase } from '../services/supabaseClient';

const realtimeAdapter = createRealtimeAdapter(supabase);
const chat = useWebChat({ config, realtimeAdapter });
```

## Modos de almacenamiento de sesión

| Modo | Descripción |
|---|---|
| `memory` (default) | Solo en memoria, se pierde al recargar |
| `sessionStorage` | Persiste mientras dure la pestaña |

```
VITE_WEBCHAT_SESSION_STORAGE_MODE=sessionStorage
```
