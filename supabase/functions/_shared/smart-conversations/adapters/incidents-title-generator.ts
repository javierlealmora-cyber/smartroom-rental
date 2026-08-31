/**
 * incidents-title-generator.ts — Generación determinista de título para incidencias (Fase 11C5E).
 *
 * Restricciones del contrato provider v1.0:
 *   - Obligatorio: true
 *   - Mínimo: 5 chars
 *   - Máximo: 120 chars (límite del contrato provider — verificar snapshot para detalles)
 *   - Sin HTML, sin caracteres de control
 *   - Unicode normalizado NFC
 *   - Fallback 'Incidencia registrada' PROHIBIDO
 *   - Sin título válido → throw TitleValidationError (no invocar provider)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

export const TITLE_MIN_LENGTH = 5;
export const TITLE_MAX_LENGTH = 120;
export const FORBIDDEN_TITLE = 'Incidencia registrada';

// ─────────────────────────────────────────────────────────────────────────────
// Error explícito
// ─────────────────────────────────────────────────────────────────────────────

export class TitleValidationError extends Error {
  public readonly code: string;
  constructor(reason: string, code = 'TITLE_REQUIRED') {
    super(`${code}: ${reason}`);
    this.name = 'TitleValidationError';
    this.code = code;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Labels por categoría (cubre tanto categorías provider como incident_types SC)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Readonly<Record<string, string>> = {
  // Categorías canónicas del provider SI
  maintenance: 'Mantenimiento',
  noise: 'Ruido',
  security: 'Seguridad',
  billing: 'Facturación',
  other: 'Incidencia',
  // Incident types internos SC (fallback si se recibe antes del mapeo)
  fuga_agua: 'Fuga de agua',
  ruido_vecinos: 'Ruido de vecinos',
  calefaccion: 'Calefacción',
  electricidad: 'Electricidad',
  puerta_acceso: 'Acceso',
  limpieza: 'Limpieza',
  averia_electrodomestico: 'Avería en electrodoméstico',
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalización
// ─────────────────────────────────────────────────────────────────────────────

export function normalizeTitle(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')        // strip script elements + content
    .replace(/<style[\s\S]*?<\/style>/gi, '')          // strip style elements + content
    .replace(/<[^>]+>/g, '')                           // strip remaining HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // replace control chars with space (keep \t \r \n)
    .replace(/[\r\n\t]+/g, ' ')                        // normalize whitespace
    .replace(/\s{2,}/g, ' ')                           // collapse multiple spaces
    .normalize('NFC')                                  // Unicode NFC normalization
    .trim();
}

function truncateAtWordBoundary(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const candidate = text.slice(0, maxLen - 3);
  const lastSpace = candidate.lastIndexOf(' ');
  if (lastSpace > 5) return candidate.slice(0, lastSpace) + '...';
  return candidate + '...';
}

function isValidTitle(t: string): boolean {
  return (
    t.length >= TITLE_MIN_LENGTH &&
    t.length <= TITLE_MAX_LENGTH &&
    t !== FORBIDDEN_TITLE &&
    !t.startsWith(FORBIDDEN_TITLE)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Genera el título del incidente para el provider SI.
 *
 * Orden de prioridad:
 *   1. titleProposal (AI-sanitized o explícito) — si pasa validación
 *   2. Determinista: categoryLabel + primera oración de description
 *   3. Determinista: categoryLabel solo
 *
 * Si ninguna ruta produce un título válido → throws TitleValidationError (no invocar provider).
 */
export function generateIncidentTitle(
  category: string,
  description: string,
  titleProposal?: string,
): string {
  // 1. Propuesta explícita o AI-sanitized
  if (titleProposal && titleProposal.trim()) {
    const cleaned = normalizeTitle(titleProposal);
    if (isValidTitle(cleaned)) {
      return truncateAtWordBoundary(cleaned, TITLE_MAX_LENGTH);
    }
    // Propuesta inválida — continuar al fallback determinista
  }

  // 2. Determinista: label de categoría + primera oración de descripción
  const categoryLabel = CATEGORY_LABELS[category] ?? CATEGORY_LABELS['other'] ?? 'Incidencia';
  const cleanDesc = normalizeTitle(description ?? '');

  if (cleanDesc.length > 0) {
    // Extrae la primera oración
    const firstSentenceMatch = cleanDesc.match(/^[^.!?]+/);
    const firstSentence = (firstSentenceMatch?.[0] ?? cleanDesc).trim();
    const descPart = firstSentence.length >= TITLE_MIN_LENGTH ? firstSentence : cleanDesc;

    const maxDescPart = TITLE_MAX_LENGTH - categoryLabel.length - 2; // ': ' = 2 chars
    const safeDescPart = truncateAtWordBoundary(descPart, Math.max(maxDescPart, 10));
    const result = `${categoryLabel}: ${safeDescPart}`;
    const finalTitle = truncateAtWordBoundary(result, TITLE_MAX_LENGTH);

    if (isValidTitle(finalTitle)) {
      return finalTitle;
    }
  }

  // 3. Determinista: solo el label de categoría
  const fallback = truncateAtWordBoundary(categoryLabel, TITLE_MAX_LENGTH);
  if (isValidTitle(fallback)) {
    return fallback;
  }

  // Sin ruta válida → no invocar provider
  throw new TitleValidationError(
    `all fallback paths exhausted for category="${category}" — cannot generate valid title`,
    'TITLE_REQUIRED',
  );
}
