/**
 * constant-time.ts — Comparación constant-time para tokens Bearer de Smart Incidents.
 *
 * JSR_PREFLIGHT_RESULT: jsr:@std/crypto/timing-safe-equal no puede resolverse
 * en Vitest 2.1.9 (entorno Node.js). El resolutor de módulos de Node.js no
 * reconoce el esquema jsr:. Incompatibilidad verificada: sin plugin JSR en Vite/Vitest.
 *
 * Mecanismo alternativo: node:crypto.timingSafeEqual.
 * Fundamento: disponible en Node.js nativo y en Deno 1.25+ (capa de compatibilidad).
 * Contradicción documentada en SI-P3B1 §11 — mecanismo actualizado a:
 * CONSTANT_TIME_MECHANISM_SELECTED: node:crypto.timingSafeEqual + SHA-256.
 *
 * Pre-hash SHA-256: garantiza arrays de longitud fija (32 bytes) para timingSafeEqual,
 * eliminando la necesidad de padding manual y homogeneizando la duración de la operación.
 *
 * OFFLINE: Sin efectos secundarios. Sin Deno.env. Sin fetch.
 * Estado: CONSTANT_TIME_COMPARISON_IMPLEMENTED_OFFLINE
 */

// node:crypto disponible en Node.js nativo y en Deno 1.25+ (compat. layer).
// Deno reconoce el especificador node: via lib: ["deno.window"].
// deno-lint-ignore-file
import { timingSafeEqual } from "node:crypto";

const _textEncoder = new TextEncoder();

/**
 * Compara dos strings de forma constant-time usando SHA-256 + timingSafeEqual.
 *
 * Ambos strings se hashean con SHA-256 antes de comparar para garantizar arrays
 * de 32 bytes de longitud fija. La duración no varía según los valores comparados.
 *
 * No registra a, b ni sus digests en ningún log ni estructura de error.
 */
export async function safeTokenEqual(a: string, b: string): Promise<boolean> {
  const [aDigest, bDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", _textEncoder.encode(a)),
    crypto.subtle.digest("SHA-256", _textEncoder.encode(b)),
  ]);
  return timingSafeEqual(new Uint8Array(aDigest), new Uint8Array(bDigest));
}
