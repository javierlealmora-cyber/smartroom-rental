/**
 * constant-time.ts — Comparaciones criptográficas constant-time.
 *
 * Previene ataques de timing en comparación de secrets, tokens y HMACs.
 * Usa crypto.subtle.timingSafeEqual (disponible en Deno y navegadores modernos).
 *
 * Fuente: SEC-012 — ef-auth.ts usa `===` (timing attack teórico).
 */

const encoder = new TextEncoder();

/**
 * Compara dos strings de forma constant-time.
 * Devuelve false si no son iguales O si cualquiera está vacío.
 *
 * Nota: Para ser realmente constant-time, ambos strings deben tener
 * la misma longitud. Si difieren, la función devuelve false sin revelar
 * cuál es más largo (padding interno).
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (!a || !b) return false;

  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);

  // Para comparar longitudes sin timing leak: si difieren, comparamos
  // igualmente pero retornamos false. No hacemos short-circuit.
  const lenMatch = aBytes.length === bBytes.length;

  // Padding al máximo para comparar siempre la misma cantidad de bytes
  const maxLen = Math.max(aBytes.length, bBytes.length);
  const aPadded = new Uint8Array(maxLen);
  const bPadded = new Uint8Array(maxLen);
  aPadded.set(aBytes);
  bPadded.set(bBytes);

  try {
    // crypto.subtle.timingSafeEqual requiere misma longitud
    const equal = crypto.subtle.timingSafeEqual(aPadded, bPadded);
    return equal && lenMatch;
  } catch {
    // Fallback si timingSafeEqual no está disponible (debería estarlo en Deno)
    return constantTimeStringCompare(aPadded, bPadded) && lenMatch;
  }
}

/**
 * Fallback manual constant-time compare (XOR sobre todos los bytes).
 * Solo se usa si crypto.subtle.timingSafeEqual no está disponible.
 */
function constantTimeStringCompare(a: Uint8Array, b: Uint8Array): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Compara dos Uint8Array de forma constant-time.
 * Para comparar HMACs o hashes binarios.
 */
export async function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) {
    // Siempre comparamos para evitar timing leak en la comprobación de longitud
    const maxLen = Math.max(a.length, b.length);
    const aPad = new Uint8Array(maxLen);
    const bPad = new Uint8Array(maxLen);
    aPad.set(a);
    bPad.set(b);
    try {
      crypto.subtle.timingSafeEqual(aPad, bPad);
    } catch { /* noop */ }
    return false;
  }
  try {
    return crypto.subtle.timingSafeEqual(a, b);
  } catch {
    return constantTimeStringCompare(a, b);
  }
}
