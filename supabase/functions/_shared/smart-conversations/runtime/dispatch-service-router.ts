/**
 * dispatch-service-router — Mapeo oficial service_code → EF de WF.
 *
 * Fuente única de verdad para las rutas de WF desde conv-dispatch-message.
 * No llamar a EFs de negocio desde aquí — solo exponer el mapping.
 */

/** Mapa oficial: service_code → nombre de la EF de negocio. */
export const SERVICE_TO_EF: Readonly<Record<string, string>> = {
  conv_incidencias:   'conv-wf20-incidents',
  conv_publicaciones: 'conv-wf30-listings',
  conv_ayuda:         'conv-wf40-help',
} as const;

/** service_codes oficialmente enrutables. */
export const ROUTABLE_SERVICES = new Set(Object.keys(SERVICE_TO_EF));

/** Devuelve el nombre de la EF para un service_code o null si no existe. */
export function getWfEfName(serviceCode: string): string | null {
  return SERVICE_TO_EF[serviceCode] ?? null;
}
