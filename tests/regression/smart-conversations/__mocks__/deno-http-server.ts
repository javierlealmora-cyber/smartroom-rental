/**
 * Shim de Deno.land/std/http/server.ts para entorno Vitest/Node.js.
 * serve() es no-op: los handlers se exportan y se llaman directamente en tests.
 */
export const serve = (_handler: unknown): void => { /* no-op en tests */ };
