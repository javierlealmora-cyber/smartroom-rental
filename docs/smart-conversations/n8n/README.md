# SmartConversations — Capa n8n (Fase 9C)

Documentación de los workflows n8n previstos para SmartConversations.

## Estado actual

**Fase 9C — Preparación mock/inactiva.** Ningún workflow está activo.
Los stubs en esta carpeta son plantillas conceptuales versionables, no configuraciones de producción.

## Principios de diseño

- n8n **orquesta**; las Edge Functions **deciden**.
- n8n **no** valida identidad final.
- n8n **no** decide permisos.
- n8n **no** escribe directamente en tablas `conv_*`.
- n8n **no** accede directamente a tablas Core.
- n8n **no** recibe PII estructurada (profile_id, phone, sender_ref, identity_data, raw_payload).
- Si n8n necesita texto de contexto, recibe `safe_summary` o referencias internas opacas.

## Workflows previstos

| Código          | Propósito                                            | Estado   |
|-----------------|------------------------------------------------------|----------|
| SC-WF-10        | Routing de intención — complemento de conv-routing-engine | Stub     |
| SC-WF-20        | Gestión de incidencias — orquestador externo          | Stub     |
| SC-WF-30        | Gestión de publicaciones — orquestador comercial      | Stub     |
| SC-WF-40        | Ayuda y soporte — FAQ + escalado                      | Stub     |
| SC-WF-IDENTITY  | Flujo guiado de verificación de identidad             | Stub     |
| SC-WF-C00       | Reconciliación operativa y auditoría de estados       | Stub     |

## Estructura

```
docs/smart-conversations/n8n/
  README.md              ← este fichero
  env.example.md         ← variables de entorno esperadas (sin valores reales)
  workflows/             ← plantillas stub n8n (active=false)
  contracts/             ← contratos de entrada/salida por workflow
```

## Cómo activar en el futuro

1. Copiar el stub correspondiente a tu instancia n8n.
2. Configurar las variables de entorno del fichero `env.example.md`.
3. Configurar las credenciales internas (nunca en código, siempre en n8n Credentials).
4. Cambiar `active: true` manualmente tras revisar y aprobar el workflow.
5. Conectar el webhook de la EF correspondiente a la URL del workflow activado.
6. Verificar que todos los tests de `test:sc:n8n` siguen pasando.

## Restricciones permanentes

Estas restricciones aplican en todas las fases:

- Nunca hardcodear `SUPABASE_SERVICE_ROLE_KEY` en JSON de workflow.
- Nunca hardcodear `ANTHROPIC_API_KEY` en JSON de workflow.
- Nunca hardcodear `WASENDER_API_KEY` en JSON de workflow.
- Nunca enviar `profile_id`, `phone`, `sender_ref`, `identity_data`, `raw_payload` a n8n.
- Nunca devolver datos de cuenta específicos sin identidad suficiente.
- La identidad final siempre la valida `conv-core-validate-identity`.
- Las entidades oficiales (incidencias, leads, tickets) siempre las crean las EFs.
- El Activity Log siempre lo publica `conv-core-publish-activity` desde las EFs.
