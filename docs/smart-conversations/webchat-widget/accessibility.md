# Accesibilidad del Widget WebChat

## Estándares

El widget sigue WCAG 2.1 nivel AA.

## Implementación

### Botón lanzador (`WebChatLauncher`)

- `role="button"` implícito con `<button>`
- `aria-expanded` refleja estado abierto/cerrado
- `aria-controls="webchat-panel"` vincula con el panel
- `aria-label` descriptivo: "Abrir chat" / "Cerrar chat"

### Panel de chat (`WebChatPanel`)

- `role="dialog"` con `aria-modal="true"`
- `aria-label="Chat de soporte"`
- Focus automático al primer elemento al abrir (`focusFirst`)
- Cierre con tecla `Escape`
- Focus trap: `Tab` y `Shift+Tab` confinados al panel

### Lista de mensajes (`WebChatMessageList`)

- `role="log"` con `aria-live="polite"` para anunciar nuevos mensajes
- `aria-label="Mensajes del chat"`

### Compositor (`WebChatComposer`)

- `<textarea>` con `aria-label="Escribe un mensaje"`
- `<button>` con `aria-label="Enviar mensaje"`
- `disabled` cuando no es posible enviar

### Estado y errores

- Errores: `role="alert"` con `aria-live="assertive"`
- Loading: `role="status"` con `aria-live="polite"`

## Teclado

| Tecla | Acción |
|---|---|
| `Enter` | Enviar mensaje |
| `Shift+Enter` | Nueva línea (sin enviar) |
| `Escape` | Cerrar panel |
| `Tab` | Navegar por elementos del panel |
| `Shift+Tab` | Navegar hacia atrás |
