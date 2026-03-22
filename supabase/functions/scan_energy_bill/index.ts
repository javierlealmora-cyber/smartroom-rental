import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const SYSTEM_PROMPT = `Eres un asistente experto en extraer datos de facturas de suministros energéticos españolas (electricidad, agua y gas).
Extrae los siguientes campos del documento y devuelve SOLO un JSON válido sin markdown, con exactamente estas claves:
{
  "utility_type": "electricity" | "water" | "gas",
  "supplier": string,
  "bill_number": string,
  "reference": string | null,
  "issue_date": "YYYY-MM-DD",
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "total_kwh": number | null,
  "total_m3": number | null,
  "amount_energy": number,
  "amount_power": number,
  "amount_meter": number | null,
  "amount_discounts": number | null,
  "amount_other": number | null,
  "amount_taxes": number,
  "amount_total": number
}
Si un campo no aparece en la factura usa null. Los importes siempre en euros como número decimal. Las fechas en formato YYYY-MM-DD.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const accommodationId = formData.get("accommodation_id") as string | null;
    const clientAccountId = formData.get("client_account_id") as string | null;

    if (!file) return jsonError("No se recibió ningún fichero", 400);
    if (!accommodationId) return jsonError("accommodation_id requerido", 400);
    if (!clientAccountId) return jsonError("client_account_id requerido", 400);

    // 1. Upload to energy-bills bucket
    const fileExt = file.name.split(".").pop() ?? "pdf";
    const timestamp = Date.now();
    const storagePath = `${clientAccountId}/${accommodationId}/${timestamp}.${fileExt}`;

    const fileBytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("energy-bills")
      .upload(storagePath, fileBytes, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`);

    // 2. Convert to base64 for OpenAI
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileBytes)));
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) return jsonError("Formato no soportado. Usa PDF, JPG o PNG.", 400);

    const openaiContent: unknown[] = [
      { type: "text", text: "Extrae los datos de esta factura de suministro:" },
      { type: "image_url", image_url: { url: `data:${file.type};base64,${base64}`, detail: "high" } },
    ];

    // 3. Call OpenAI GPT-4o
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: openaiContent },
        ],
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI error ${openaiRes.status}: ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content ?? "{}";

    // 4. Parse extracted JSON
    let extracted: Record<string, unknown> = {};
    try {
      const cleaned = rawContent.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      extracted = JSON.parse(cleaned);
    } catch { /* keep empty */ }

    return new Response(
      JSON.stringify({ ok: true, storage_path: storagePath, extracted, raw_response: rawContent }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (err) {
    return jsonError((err as Error).message, 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: { message } }), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
