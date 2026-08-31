/**
 * dispatch-outbound-router — Decide qué EF de outbound usar según canal.
 *
 * Fuente única de verdad para el routing de salida de conv-dispatch-message.
 * conv-dispatch-message nunca llama a Wasender directamente.
 * conv-dispatch-message nunca construye jids de WhatsApp.
 */

export type OutboundChannel = 'whatsapp' | 'webchat';

/** Mapa oficial: channel → EF de outbound. */
export const CHANNEL_TO_OUTBOUND_EF: Readonly<Record<OutboundChannel, string>> = {
  whatsapp: 'conv-send-wa',
  webchat:  'conv-web-deliver',
} as const;

/** Devuelve el nombre de la EF de outbound para un canal o null. */
export function getOutboundEfName(channel: string): string | null {
  if (channel === 'whatsapp' || channel === 'webchat') {
    return CHANNEL_TO_OUTBOUND_EF[channel];
  }
  return null;
}
