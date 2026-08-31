# Widget WebChat SmartRent

Widget embebible de chat en tiempo real para el portal de inquilinos.

## Características

- Sesión anónima con `sender_ref` opaco
- Polling configurable + Realtime best-effort (desactivado por defecto)
- Sin PII en almacenamiento de sesión
- Sin `service_role` en el frontend
- Accesible: ARIA, focus-trap, Escape para cerrar
- Error boundary integrado

## Punto de montaje

Integrado en `src/layouts/V2Layout.jsx` al final del layout, protegido por flag:

```jsx
{getWebchatConfig().enabled && (
  <WebChatWidget config={getWebchatConfig()} />
)}
```

`WebChatWidget` combina `useWebChat` + `WebChatLauncher` + `WebChatPanel` + `WebChatErrorBoundary`.

## Uso avanzado (con Realtime)

```jsx
import { createRealtimeAdapter } from 'src/features/webchat';
import { supabase } from '../services/supabaseClient';

<WebChatWidget config={config} realtimeAdapter={createRealtimeAdapter(supabase)} />
```

## Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `VITE_WEBCHAT_WIDGET_ENABLED` | `false` | Activa el widget |
| `VITE_WEBCHAT_API_BASE_URL` | `''` | URL base de Supabase |
| `VITE_WEBCHAT_CLIENT_ACCOUNT_ID` | `''` | ID del tenant |
| `VITE_WEBCHAT_REALTIME_ENABLED` | `false` | Activa Realtime |
| `VITE_WEBCHAT_POLL_INTERVAL_MS` | `5000` | Intervalo de polling |
| `VITE_WEBCHAT_DEBUG` | `false` | Logs de debug |

Ver [integration-guide.md](./integration-guide.md) para más detalles.
