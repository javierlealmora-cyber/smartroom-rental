/**
 * core-listings-client — Adapter para consultar publicaciones en Core.
 *
 * Mode=mock (default): devuelve datos públicos locales sin fetch externo.
 * Mode=real: llama a Core vía core-http-client con operación allowlisted.
 *
 * Solo devuelve campos públicos del anuncio:
 *   listing_id, listing_ref, title, public_location, price, availability, public_room_label.
 * NO devuelve campos internos de contrato, datos privados de tenencia ni PII.
 * NO acepta campos de identidad ni referencias de usuario.
 *
 * Fuente: rules-80, SmartConversations WF-30.
 */

import { coreHttpCall, getCoreIntegrationMode } from "./core-http-client.ts";
import type { CoreIntegrationMode } from "./core-http-client.ts";

export interface ListingFilters {
  location?:     string;
  budget_max?:   number;
  move_in_date?: string;
  room_type?:    string;
}

export interface PublicListing {
  listing_id:        string;
  listing_ref:       string;
  title:             string;
  public_location:   string;
  price:             number;
  availability:      'available' | 'reserved' | 'unavailable';
  public_room_label: string;
}

export interface QueryListingsInput {
  client_account_id: string;
  channel:           string;
  filters:           ListingFilters;
  // No acepta referencias de identidad ni PII del usuario
}

export interface QueryListingsResult {
  listings: PublicListing[];
}

export type CoreListingsClient = {
  queryListings(input: QueryListingsInput): Promise<QueryListingsResult>;
};

// ---------------------------------------------------------------------------
// Mock client — datos públicos locales, sin fetch externo
// Solo contiene campos del anuncio público — sin datos internos de contrato ni PII
// ---------------------------------------------------------------------------

const MOCK_LISTINGS: PublicListing[] = [
  {
    listing_id:        'lst-001',
    listing_ref:       'HAB-001',
    title:             'Habitación luminosa en Madrid centro',
    public_location:   'Madrid centro',
    price:             650,
    availability:      'available',
    public_room_label: 'Habitación 1',
  },
  {
    listing_id:        'lst-002',
    listing_ref:       'HAB-002',
    title:             'Habitación amplia cerca de la universidad',
    public_location:   'Madrid norte',
    price:             580,
    availability:      'available',
    public_room_label: 'Habitación 2',
  },
  {
    listing_id:        'lst-003',
    listing_ref:       'HAB-003',
    title:             'Estudio individual bien comunicado',
    public_location:   'Barcelona centro',
    price:             750,
    availability:      'reserved',
    public_room_label: 'Estudio A',
  },
];

const mockCoreListingsClient: CoreListingsClient = {
  async queryListings(input: QueryListingsInput): Promise<QueryListingsResult> {
    // No llamar al Core real. No hacer fetch. No aceptar ni devolver PII ni campos internos.
    let listings = MOCK_LISTINGS.filter(l => l.availability === 'available');

    if (input.filters.location) {
      const loc = input.filters.location.toLowerCase();
      listings = listings.filter(l => l.public_location.toLowerCase().includes(loc));
    }

    if (input.filters.budget_max !== undefined) {
      listings = listings.filter(l => l.price <= input.filters.budget_max!);
    }

    return { listings };
  },
};

// ---------------------------------------------------------------------------
// Real client — usa core-http-client con operación allowlisted
// Solo devuelve campos públicos — filtra assignment_id, room_id interno
// ---------------------------------------------------------------------------

const realCoreListingsClient: CoreListingsClient = {
  async queryListings(input: QueryListingsInput): Promise<QueryListingsResult> {
    const resp = await coreHttpCall<{ listings: Record<string, unknown>[] }>({
      method:            'POST',
      operation:         'core.listings.query',
      client_account_id: input.client_account_id,
      body: {
        channel: input.channel,
        filters: input.filters,
        // Solo se envían filtros de búsqueda pública — sin referencias de identidad
      },
    });

    if (!resp.ok || !resp.data) {
      return { listings: [] };
    }

    // Mapear solo campos públicos — descartar assignment_id, room_id, dirección exacta
    const listings: PublicListing[] = (resp.data.listings ?? []).map(raw => ({
      listing_id:        String(raw['listing_id'] ?? ''),
      listing_ref:       String(raw['listing_ref'] ?? ''),
      title:             String(raw['title'] ?? ''),
      public_location:   String(raw['public_location'] ?? ''),
      price:             Number(raw['price'] ?? 0),
      availability:      (raw['availability'] as PublicListing['availability']) ?? 'unavailable',
      public_room_label: String(raw['public_room_label'] ?? ''),
      // campos internos de Core omitidos intencionalmente (no son públicos del anuncio)
    }));

    return { listings };
  },
};

// ---------------------------------------------------------------------------
// Factory — selecciona implementación según modo
// ---------------------------------------------------------------------------

export function buildCoreListingsClient(mode?: CoreIntegrationMode): CoreListingsClient {
  const resolved = mode ?? getCoreIntegrationMode();
  return resolved === 'real' ? realCoreListingsClient : mockCoreListingsClient;
}

/** Default export: siempre mock para backward compatibility */
export const defaultCoreListingsClient: CoreListingsClient = mockCoreListingsClient;
