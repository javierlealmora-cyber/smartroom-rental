# Edge Function: scan_energy_bill

## Descripción
Esta Edge Function escanea facturas de suministros energéticos (electricidad, agua, gas) usando OpenAI GPT-4o para extraer automáticamente los datos relevantes.

## Funcionalidad
1. Recibe un archivo (PDF, JPG, PNG) de una factura
2. Lo sube al bucket `energy-bills` de Supabase Storage
3. Convierte el archivo a base64
4. Envía la imagen a OpenAI GPT-4o con un prompt especializado
5. Extrae los datos estructurados de la factura
6. Devuelve los datos extraídos en formato JSON

## Variables de Entorno Requeridas

Estas variables deben configurarse en el dashboard de Supabase (Settings > Edge Functions > Secrets):

- `OPENAI_API_KEY`: Tu API key de OpenAI (necesaria para GPT-4o)
- `SUPABASE_URL`: URL de tu proyecto Supabase (auto-configurada)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (auto-configurada)

## Configuración de OpenAI

1. Ve a https://platform.openai.com/api-keys
2. Crea una nueva API key
3. Añádela como secret en Supabase:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

## Bucket de Storage Requerido

Asegúrate de que existe el bucket `energy-bills` en Supabase Storage:

```sql
-- Crear bucket si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('energy-bills', 'energy-bills', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket
CREATE POLICY "Authenticated users can upload bills"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'energy-bills');

CREATE POLICY "Service role can manage all bills"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'energy-bills');
```

## Deployment

Para desplegar esta función:

```bash
supabase functions deploy scan_energy_bill
```

## Uso desde el Frontend

```javascript
const formData = new FormData();
formData.append("file", fileObject);
formData.append("accommodation_id", accommodationId);
formData.append("client_account_id", clientAccountId);

const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(`${SUPABASE_URL}/functions/v1/scan_energy_bill`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${session?.access_token}`
  },
  body: formData
});

const result = await response.json();
if (result.ok) {
  console.log("Datos extraídos:", result.extracted);
  console.log("Archivo guardado en:", result.storage_path);
}
```

## Formato de Respuesta

```json
{
  "ok": true,
  "storage_path": "client_id/accommodation_id/timestamp.pdf",
  "extracted": {
    "utility_type": "electricity",
    "supplier": "Iberdrola",
    "bill_number": "FAC-2024-001",
    "reference": "REF123456",
    "issue_date": "2024-01-15",
    "period_start": "2023-12-01",
    "period_end": "2023-12-31",
    "total_kwh": 250.5,
    "total_m3": null,
    "amount_energy": 45.20,
    "amount_power": 12.50,
    "amount_meter": 2.00,
    "amount_discounts": -5.00,
    "amount_other": 3.00,
    "amount_taxes": 12.14,
    "amount_total": 69.84
  },
  "raw_response": "..."
}
```

## Costos

Esta función utiliza OpenAI GPT-4o, que tiene los siguientes costos aproximados:
- ~$0.01 - $0.03 por factura escaneada (dependiendo del tamaño de la imagen)

Asegúrate de tener créditos en tu cuenta de OpenAI.

## Limitaciones

- Formatos soportados: PDF, JPG, PNG
- Tamaño máximo: 20 MB
- Requiere `verify_jwt: true` (usuario autenticado)
- Funciona mejor con facturas españolas de suministros energéticos
