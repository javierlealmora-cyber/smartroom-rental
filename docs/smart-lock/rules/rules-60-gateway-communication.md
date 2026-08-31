# rules-60-gateway-communication.md — Comunicación Gateway Físico ↔ Cloud

## 1. Propósito

Definir el canal de transporte, la dirección de las conexiones, la autenticación y los casos de comunicación entre el gateway físico BLE (`ttlock_ble`) y la cloud de SmartRoom Rental (Supabase).

## 2. Alcance

Aplica al SDK BLE del gateway (repositorio `smartroom-ttlock-ble`) y a las Edge Functions que reciben sus llamadas.

## 3. Decisiones No Negociables

1. Toda comunicación se inicia **desde el gateway hacia la cloud**. Supabase nunca inicia una conexión hacia el gateway. El gateway está detrás de NAT doméstico sin puertos expuestos.

2. El transporte para la Fase 2 es **MQTT sobre TLS**, activo desde el primer despliegue del gateway físico (no se implementa primero HTTP polling como paso intermedio).

3. La autenticación del gateway ante Supabase se hace mediante un JWT emitido en el momento del registro, con expiración larga (12 meses) y proceso de rotación manual disponible para superadmin.

4. El broker MQTT debe soportar TLS y autenticación por credenciales únicas por gateway (usuario/contraseña o certificado por dispositivo).

## 4. Reglas Obligatorias

### 4.1 Casos de comunicación

| # | Caso | Frecuencia | Canal |
|---|---|---|---|
| 1 | Registro inicial del gateway | Una vez | HTTPS POST a `sal-gateway-register` |
| 2 | Heartbeat | Cada 30–60 s | MQTT publish `sal/{gateway_id}/heartbeat` |
| 3 | Recepción de comandos | Persistente | MQTT subscribe `sal/{gateway_id}/cmd/#` |
| 4 | Reporte de resultado de comando | Al ejecutar | MQTT publish `sal/{gateway_id}/cmd_result` |
| 5 | Reporte de evento externo (PIN físico, huella, tarjeta) | Al detectarlo | MQTT publish `sal/{gateway_id}/evt/unlock_record` |
| 6 | Telemetría (batería, RSSI, firmware) | Cada 15–30 min | MQTT publish `sal/{gateway_id}/telemetry` |
| 7 | Publicación de `lockData` nuevo | Puntual, tras `initLock()` | HTTPS POST a `sal-gateway-store-lockdata` (garantizado, no MQTT) |
| 8 | Recuperación de `lockData` | Al arrancar tras reinstalación | HTTPS GET a `sal-gateway-get-lockdata` |
| 9 | Descarga de comandos pendientes tras reconexión | Al reconectar | MQTT subscribe (retained/QoS) o HTTPS GET de respaldo |

La publicación de `lockData` (caso 7) usa HTTPS con confirmación síncrona explícita, no MQTT, porque requiere garantía de entrega antes de continuar el flujo de emparejamiento (ver `rules-50` sección 4.1).

### 4.2 Formato de topics MQTT

```
sal/{gateway_id}/heartbeat
sal/{gateway_id}/cmd/{command_type}
sal/{gateway_id}/cmd_result
sal/{gateway_id}/evt/{event_type}
sal/{gateway_id}/telemetry
```

`{gateway_id}` es el UUID de `lock_gateways.id`. `{command_type}` y `{event_type}` se definen en `contract-gateway-command.md` y `contract-gateway-event.md`.

### 4.3 QoS y garantías de entrega

- Comandos (`cmd/*`): QoS 1 mínimo (al menos una entrega). El gateway debe deduplicar por `command_id`.
- Heartbeat y telemetría: QoS 0 aceptable (best-effort).
- Resultado de comando y eventos: QoS 1 mínimo.

### 4.4 Autenticación y rotación de JWT

- El JWT del gateway se emite en `sal-gateway-register` y se firma con una clave dedicada del módulo (no la misma que los JWT de usuarios de la plataforma).
- Expiración: 12 meses.
- El superadmin puede forzar la rotación desde la UI de administración de gateways; el gateway antiguo deja de poder autenticarse inmediatamente tras la rotación.
- Debe existir alerta cuando falten menos de 30 días para la expiración de un JWT de gateway.

### 4.5 Resiliencia ante caída del broker

Si el gateway no puede conectar al broker MQTT durante más de un umbral configurable (por defecto 5 minutos), debe:
1. Encolar localmente los eventos generados mientras tanto.
2. Reintentar conexión con backoff exponencial.
3. Al reconectar, drenar la cola local en orden.

## 5. Casos Permitidos

- Un gateway puede reconectar múltiples veces al día sin pérdida de comandos pendientes (gracias a la cola en `lock_sync_commands` y QoS 1).
- Rotación de JWT sin downtime si se coordina con una ventana de mantenimiento del gateway.

## 6. Casos Prohibidos

- Que Supabase intente abrir una conexión hacia una IP del gateway.
- Usar QoS 0 para comandos o resultados de comando.
- Reutilizar el mismo JWT/credencial MQTT entre distintos gateways.
- Publicar `lockData` por MQTT (debe ser HTTPS con confirmación síncrona, ver 4.1 caso 7).

## 7. Impacto en Diseño

- La UI de administración de gateways debe mostrar `last_seen_at`, estado de conexión MQTT, y días restantes de vigencia del JWT.

## 8. Impacto en Implementación

- El cliente MQTT del gateway debe implementar reconexión automática con backoff exponencial y logging estructurado de desconexiones.
- Las Edge Functions receptoras de eventos MQTT (vía ingest bridge) deben ser idempotentes por `command_id` / `event_id`.

## 9. Dependencias

Depende de:
- `rules-50-ttlock-ble-provider.md`
- `contract-gateway-command.md`
- `contract-gateway-event.md`

### Requirements relacionados

- `REQ-SL-000-smart-lock-capability.md`

## 10. Checklist de Validación

- [ ] Toda conexión se origina desde el gateway.
- [ ] MQTT con TLS y credenciales únicas por gateway.
- [ ] QoS 1 en comandos, resultados y eventos.
- [ ] `lockData` se publica por HTTPS síncrono, nunca por MQTT.
- [ ] Alertas de expiración de JWT configuradas.

## 11. Notas de Control de Cambios

La elección de MQTT frente a HTTP polling fue una decisión explícita de Product Owner para minimizar la latencia de comandos push (ver alternativas descartadas documentadas en el histórico de decisión). Cambiar de transporte requiere revisión de esta regla completa.
