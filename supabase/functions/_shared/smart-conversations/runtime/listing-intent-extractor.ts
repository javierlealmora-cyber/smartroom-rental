/**
 * listing-intent-extractor -- Adapter para extraer intencion de busqueda de listing.
 *
 * Mode=mock (default): heuristica local sin fetch externo.
 * Mode=real: llama al proveedor de IA via ai-client con operacion allowlisted.
 *
 * Privacidad: message_text es sensible -- nunca loguear.
 * contact (name, phone, email) es PII -- nunca loguear.
 * La IA no puede recibir ni devolver phone, email, sender_ref, identity_data.
 * Fuente: rules-80, SmartConversations WF-30.
 */

import { aiCall, validateListingOutput, getAiIntegrationMode } from './ai-client.ts';
import type { AiIntegrationMode } from './ai-client.ts';

export type IntentType =
  | 'search_listing'
  | 'ask_details'
  | 'request_visit'
  | 'leave_contact'
  | 'unknown';

export interface ListingExtraction {
  intent_type:     IntentType;
  location?:       string;
  budget_max?:     number;
  move_in_date?:   string;
  room_type?:      string;
  listing_id?:     string;
  contact_name?:   string;
  contact_phone?:  string;
  contact_email?:  string;
  is_complete:     boolean;
  missing_fields?: string[];
}

export type ListingIntentExtractor = {
  extract(messageText: string): ListingExtraction;
};

export type AsyncListingIntentExtractor = {
  extract(messageText: string, ctx?: { client_account_id?: string; session_id?: string; channel?: 'whatsapp' | 'webchat' }): Promise<ListingExtraction>;
};

// ---------------------------------------------------------------------------
// Mock extractor -- heuristica local sin fetch externo
// ---------------------------------------------------------------------------

const mockListingIntentExtractor: ListingIntentExtractor = {
  extract(messageText: string): ListingExtraction {
    // No loguear messageText ni contact_phone/contact_email
    const text = messageText.toLowerCase();

    let intent_type: IntentType = 'unknown';

    if (
      text.includes('quiero visitar') || text.includes('visita') ||
      text.includes('ver el piso') || text.includes('ver la habitación') ||
      text.includes('concertar') || text.includes('cita')
    ) {
      intent_type = 'request_visit';
    } else if (
      text.includes('dejo mis datos') || text.includes('interesado') ||
      text.includes('me interesa') || text.includes('dejar contacto') ||
      text.includes('me pueden contactar')
    ) {
      intent_type = 'leave_contact';
    } else if (
      text.includes('mas detalles') || text.includes('mas informacion') ||
      text.includes('cuentame mas') || text.includes('hab-') ||
      text.includes('detalles de') || text.includes('informacion sobre')
    ) {
      intent_type = 'ask_details';
    } else if (
      text.includes('habitación') || text.includes('piso') ||
      text.includes('disponible') || text.includes('busco') ||
      text.includes('alquiler') || text.includes('precio')
    ) {
      intent_type = 'search_listing';
    }

    let location: string | undefined;
    const locationMatch = text.match(/en\s+([a-z\s]+?)(?:\s+para|\s+con|\s+de|\.|$)/i);
    if (locationMatch) location = locationMatch[1].trim();

    let budget_max: number | undefined;
    const budgetMatch = text.match(/(\d{3,4})\s*(?:€|euros)/i);
    if (budgetMatch) budget_max = parseInt(budgetMatch[1], 10);

    let listing_id: string | undefined;
    const listingMatch = text.match(/hab-(\d+)/i);
    if (listingMatch) listing_id = `lst-${String(parseInt(listingMatch[1], 10)).padStart(3, '0')}`;

    // PII: contact_phone/contact_email -- solo para uso interno en WF-30, NUNCA loguear
    let contact_phone: string | undefined;
    let contact_email: string | undefined;

    const phoneMatch = messageText.match(/(\+?[\d\s\-]{9,15})/);
    if (phoneMatch && phoneMatch[1].replace(/\D/g, '').length >= 9) {
      contact_phone = phoneMatch[1].trim();
    }
    const emailMatch = messageText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) contact_email = emailMatch[0];

    const has_contact    = !!(contact_phone || contact_email);
    const is_complete    = (intent_type === 'request_visit' || intent_type === 'leave_contact')
      ? has_contact
      : intent_type !== 'unknown';

    const missing_fields: string[] = [];
    if ((intent_type === 'request_visit' || intent_type === 'leave_contact') && !has_contact) {
      missing_fields.push('contact_phone_or_email');
    }

    return {
      intent_type, location, budget_max, listing_id,
      contact_phone, contact_email,
      is_complete, missing_fields,
    };
  },
};

// ---------------------------------------------------------------------------
// Real extractor -- usa ai-client con operacion allowlisted
// La IA NO recibe phone, email ni sender_ref -- solo texto seguro.
// ---------------------------------------------------------------------------

const realListingIntentExtractor: AsyncListingIntentExtractor = {
  async extract(messageText, ctx = {}): Promise<ListingExtraction> {
    // safe_input: NO enviar phone, email ni sender_ref a la IA
    // Solo texto descriptivo de busqueda
    const safeText = messageText.replace(/(\+?[\d\s\-]{9,15})/g, '[PHONE]')
      .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
      .slice(0, 1000);

    const resp = await aiCall<Record<string, unknown>>({
      operation:         'ai.listing.extract',
      client_account_id: ctx.client_account_id ?? 'unknown',
      session_id:        ctx.session_id ?? 'unknown',
      channel:           ctx.channel ?? 'webchat',
      safe_input:        safeText,
    });

    if (!resp.ok || !resp.data) {
      return mockListingIntentExtractor.extract(messageText);
    }

    const validated = validateListingOutput(resp.data);
    // Rellenar contact PII desde mock (la IA no los devuelve)
    const mockResult = mockListingIntentExtractor.extract(messageText);

    return {
      intent_type:     (validated['interest_type'] as IntentType) ?? mockResult.intent_type,
      location:        typeof validated['city'] === 'string' ? validated['city'] : mockResult.location,
      budget_max:      typeof validated['budget_range'] === 'number' ? validated['budget_range'] : mockResult.budget_max,
      move_in_date:    typeof validated['dates'] === 'string' ? validated['dates'] : mockResult.move_in_date,
      // contact_phone/contact_email vienen del mock (extraccion local) -- IA no los devuelve
      contact_phone:   mockResult.contact_phone,
      contact_email:   mockResult.contact_email,
      missing_fields:  (validated['missing_fields'] as string[]) ?? mockResult.missing_fields,
      is_complete:     mockResult.is_complete,
    };
  },
};

// ---------------------------------------------------------------------------
// Factory -- devuelve adapter async (mock envuelto o real)
// ---------------------------------------------------------------------------

export function buildListingIntentExtractor(mode?: AiIntegrationMode): AsyncListingIntentExtractor {
  const resolved = mode ?? getAiIntegrationMode();
  if (resolved === 'real') return realListingIntentExtractor;
  return {
    extract: async (text, _ctx) => mockListingIntentExtractor.extract(text),
  };
}

/** Default export: siempre mock para backward compatibility */
export const defaultListingIntentExtractor: ListingIntentExtractor = mockListingIntentExtractor;
