// =============================================================================
// DATOS MOCK PARA LA NUEVA ESTRUCTURA v2 (client_accounts)
// =============================================================================
// NOTA: Esta es una rama paralela. NO afecta a public.companies ni public.profiles
// =============================================================================

// Planes disponibles
export const PLANS = {
  BASIC: "basic",
  INVESTOR: "investor",
  BUSINESS: "business",
  AGENCY: "agency",
};

// Estados disponibles
export const STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
  INACTIVE: "inactive",
};

// Tipos de empresa legal
export const LEGAL_COMPANY_TYPES = {
  ACCOUNT: "account",
  FISCAL: "fiscal",
};

// Formas legales
export const LEGAL_FORMS = {
  PERSONA_FISICA: "persona_fisica",
  AUTONOMO: "autonomo",
  PERSONA_JURIDICA: "persona_juridica",
};

// Estados de habitación
export const ROOM_STATUS = {
  FREE: "free",
  OCCUPIED: "occupied",
  PENDING_CHECKOUT: "pending_checkout",
  INACTIVE: "inactive",
};

// Estados de inquilino
export const TENANT_STATUS = {
  INVITED: "invited",
  ACTIVE: "active",
  INACTIVE: "inactive",
  PENDING_CHECKOUT: "pending_checkout",
};

// Estados de ocupación
export const OCCUPANCY_STATUS = {
  ACTIVE: "active",
  PENDING_CHECKOUT: "pending_checkout",
  ENDED: "ended",
};

// Roles globales
export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  API: "api",
  STUDENT: "student",
  VIEWER: "viewer",
};

// =============================================================================
// CLIENT ACCOUNTS (Cuentas Cliente / Tenants SaaS)
// =============================================================================
export const mockClientAccounts = [
  {
    id: "ca-001",
    name: "Residencias Universidad Madrid",
    slug: "residencias-madrid",
    plan: PLANS.BUSINESS,
    status: STATUS.ACTIVE,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-12-01T15:30:00Z",
    billing_start_date: "2024-02-01",
    theme_primary_color: "#1E40AF",
    logo_url: "/logos/residencias-madrid.png",
    theme_secondary_color: "#3B82F6",
    // Estadísticas calculadas
    stats: {
      total_accommodations: 5,
      total_rooms: 48,
      occupied_rooms: 42,
      total_tenants: 42,
    },
  },
  {
    id: "ca-002",
    name: "Inversiones Inmobiliarias García",
    slug: "inversiones-garcia",
    plan: PLANS.INVESTOR,
    status: STATUS.ACTIVE,
    created_at: "2024-03-20T09:00:00Z",
    updated_at: "2024-11-15T11:00:00Z",
    billing_start_date: "2024-04-01",
    theme_primary_color: "#059669",
    logo_url: null,
    theme_secondary_color: "#10B981",
    stats: {
      total_accommodations: 3,
      total_rooms: 24,
      occupied_rooms: 18,
      total_tenants: 18,
    },
  },
  {
    id: "ca-003",
    name: "Apartamentos Centro Histórico",
    slug: "centro-historico",
    plan: PLANS.BASIC,
    status: STATUS.ACTIVE,
    created_at: "2024-06-01T14:00:00Z",
    updated_at: "2024-10-20T09:00:00Z",
    billing_start_date: "2024-06-15",
    theme_primary_color: "#7C3AED",
    logo_url: null,
    theme_secondary_color: null,
    stats: {
      total_accommodations: 2,
      total_rooms: 12,
      occupied_rooms: 10,
      total_tenants: 10,
    },
  },
  {
    id: "ca-004",
    name: "Agencia Gestión Integral",
    slug: "agencia-gestion",
    plan: PLANS.AGENCY,
    status: STATUS.ACTIVE,
    created_at: "2024-02-10T08:00:00Z",
    updated_at: "2024-12-10T16:00:00Z",
    billing_start_date: "2024-03-01",
    theme_primary_color: "#DC2626",
    logo_url: "/logos/agencia-gestion.png",
    theme_secondary_color: "#EF4444",
    stats: {
      total_accommodations: 15,
      total_rooms: 120,
      occupied_rooms: 98,
      total_tenants: 98,
    },
  },
  {
    id: "ca-005",
    name: "Pisos Estudiantes Barcelona",
    slug: "estudiantes-bcn",
    plan: PLANS.INVESTOR,
    status: STATUS.SUSPENDED,
    created_at: "2024-01-05T12:00:00Z",
    updated_at: "2024-09-01T10:00:00Z",
    billing_start_date: "2024-01-15",
    theme_primary_color: "#F59E0B",
    logo_url: null,
    theme_secondary_color: null,
    stats: {
      total_accommodations: 4,
      total_rooms: 32,
      occupied_rooms: 0,
      total_tenants: 0,
    },
  },
];

// =============================================================================
// LEGAL COMPANIES (Empresas Legales: Pagadora y Fiscales)
// =============================================================================
export const mockLegalCompanies = [
  // Cuenta Cliente 1 - Residencias Universidad Madrid
  {
    id: "lc-001",
    client_account_id: "ca-001",
    type: LEGAL_COMPANY_TYPES.ACCOUNT,
    legal_name: "Residencias Universitarias de Madrid S.L.",
    legal_form: LEGAL_FORMS.PERSONA_JURIDICA,
    tax_id: "B12345678",
    address_line1: "Calle Gran Vía, 45",
    address_line2: "Planta 3, Oficina 12",
    postal_code: "28013",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "facturacion@residencias-madrid.es",
    contact_phone: "+34 915 123 456",
    status: STATUS.ACTIVE,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "lc-002",
    client_account_id: "ca-001",
    type: LEGAL_COMPANY_TYPES.FISCAL,
    legal_name: "Grupo Residencial Norte S.L.",
    legal_form: LEGAL_FORMS.PERSONA_JURIDICA,
    tax_id: "B87654321",
    address_line1: "Paseo de la Castellana, 100",
    address_line2: null,
    postal_code: "28046",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "fiscal.norte@residencias-madrid.es",
    contact_phone: "+34 915 987 654",
    status: STATUS.ACTIVE,
    created_at: "2024-02-01T10:00:00Z",
    updated_at: "2024-02-01T10:00:00Z",
  },
  // Cuenta Cliente 2 - Inversiones García
  {
    id: "lc-003",
    client_account_id: "ca-002",
    type: LEGAL_COMPANY_TYPES.ACCOUNT,
    legal_name: "Juan García López",
    legal_form: LEGAL_FORMS.AUTONOMO,
    tax_id: "12345678A",
    address_line1: "Calle Mayor, 23",
    address_line2: null,
    postal_code: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "juan.garcia@inversiones-garcia.es",
    contact_phone: "+34 666 123 456",
    status: STATUS.ACTIVE,
    created_at: "2024-03-20T09:00:00Z",
    updated_at: "2024-03-20T09:00:00Z",
  },
  {
    id: "lc-004",
    client_account_id: "ca-002",
    type: LEGAL_COMPANY_TYPES.FISCAL,
    legal_name: "Inversiones Inmobiliarias García S.L.",
    legal_form: LEGAL_FORMS.PERSONA_JURIDICA,
    tax_id: "B11223344",
    address_line1: "Calle Serrano, 50",
    address_line2: null,
    postal_code: "28006",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "fiscal@inversiones-garcia.es",
    contact_phone: "+34 915 111 222",
    status: STATUS.ACTIVE,
    created_at: "2024-04-01T10:00:00Z",
    updated_at: "2024-04-01T10:00:00Z",
  },
  // Cuenta Cliente 3 - Centro Histórico
  {
    id: "lc-005",
    client_account_id: "ca-003",
    type: LEGAL_COMPANY_TYPES.ACCOUNT,
    legal_name: "María Fernández Ruiz",
    legal_form: LEGAL_FORMS.PERSONA_FISICA,
    tax_id: "87654321B",
    address_line1: "Plaza Mayor, 5",
    address_line2: null,
    postal_code: "28012",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "maria@centro-historico.es",
    contact_phone: "+34 666 789 012",
    status: STATUS.ACTIVE,
    created_at: "2024-06-01T14:00:00Z",
    updated_at: "2024-06-01T14:00:00Z",
  },
  // Cuenta Cliente 4 - Agencia
  {
    id: "lc-006",
    client_account_id: "ca-004",
    type: LEGAL_COMPANY_TYPES.ACCOUNT,
    legal_name: "Agencia Gestión Integral S.A.",
    legal_form: LEGAL_FORMS.PERSONA_JURIDICA,
    tax_id: "A55667788",
    address_line1: "Avenida de América, 200",
    address_line2: "Torre Norte, Planta 15",
    postal_code: "28027",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "administracion@agencia-gestion.es",
    contact_phone: "+34 912 345 678",
    status: STATUS.ACTIVE,
    created_at: "2024-02-10T08:00:00Z",
    updated_at: "2024-02-10T08:00:00Z",
  },
  {
    id: "lc-007",
    client_account_id: "ca-004",
    type: LEGAL_COMPANY_TYPES.FISCAL,
    legal_name: "Inmuebles Madrid Centro S.L.",
    legal_form: LEGAL_FORMS.PERSONA_JURIDICA,
    tax_id: "B99887766",
    address_line1: "Calle Alcalá, 150",
    address_line2: null,
    postal_code: "28028",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "fiscal.centro@agencia-gestion.es",
    contact_phone: "+34 912 111 111",
    status: STATUS.ACTIVE,
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
  },
  {
    id: "lc-008",
    client_account_id: "ca-004",
    type: LEGAL_COMPANY_TYPES.FISCAL,
    legal_name: "Gestión Residencial Norte S.L.",
    legal_form: LEGAL_FORMS.PERSONA_JURIDICA,
    tax_id: "B44556677",
    address_line1: "Paseo de la Habana, 80",
    address_line2: null,
    postal_code: "28036",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    contact_email: "fiscal.norte@agencia-gestion.es",
    contact_phone: "+34 912 222 222",
    status: STATUS.ACTIVE,
    created_at: "2024-03-15T10:00:00Z",
    updated_at: "2024-03-15T10:00:00Z",
  },
];

// =============================================================================
// INTERNAL COMPANIES (Empresas Internas / Operativas)
// =============================================================================
export const mockInternalCompanies = [
  // CA-001: Business - 1 interna oculta
  {
    id: "ic-001",
    client_account_id: "ca-001",
    name: "Operaciones Residencias Madrid",
    status: STATUS.ACTIVE,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
    is_hidden: true, // Oculta en UI para Business
  },
  // CA-002: Investor - 1 interna oculta
  {
    id: "ic-002",
    client_account_id: "ca-002",
    name: "Operaciones García",
    status: STATUS.ACTIVE,
    created_at: "2024-03-20T09:00:00Z",
    updated_at: "2024-03-20T09:00:00Z",
    is_hidden: true,
  },
  // CA-003: Basic - 1 interna oculta
  {
    id: "ic-003",
    client_account_id: "ca-003",
    name: "Operaciones Centro Histórico",
    status: STATUS.ACTIVE,
    created_at: "2024-06-01T14:00:00Z",
    updated_at: "2024-06-01T14:00:00Z",
    is_hidden: true,
  },
  // CA-004: Agency - Múltiples internas VISIBLES
  {
    id: "ic-004",
    client_account_id: "ca-004",
    name: "Cartera Zona Centro",
    status: STATUS.ACTIVE,
    created_at: "2024-02-10T08:00:00Z",
    updated_at: "2024-02-10T08:00:00Z",
    is_hidden: false, // Visible en Agencia
  },
  {
    id: "ic-005",
    client_account_id: "ca-004",
    name: "Cartera Zona Norte",
    status: STATUS.ACTIVE,
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-02-15T10:00:00Z",
    is_hidden: false,
  },
  {
    id: "ic-006",
    client_account_id: "ca-004",
    name: "Cartera Estudiantes UAM",
    status: STATUS.ACTIVE,
    created_at: "2024-03-01T08:00:00Z",
    updated_at: "2024-03-01T08:00:00Z",
    is_hidden: false,
  },
];

// =============================================================================
// ACCOMMODATIONS (Alojamientos)
// =============================================================================
export const mockAccommodations = [
  // CA-001: Residencias Madrid
  {
    id: "acc-001",
    client_account_id: "ca-001",
    internal_company_id: "ic-001",
    fiscal_company_id: "lc-002",
    name: "Residencia Universitaria Central",
    status: STATUS.ACTIVE,
    address_line1: "Calle Princesa, 25",
    postal_code: "28008",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-02-01T10:00:00Z",
    updated_at: "2024-02-01T10:00:00Z",
    stats: { total_rooms: 15, occupied: 14, free: 1, pending: 0 },
  },
  {
    id: "acc-002",
    client_account_id: "ca-001",
    internal_company_id: "ic-001",
    fiscal_company_id: "lc-002",
    name: "Residencia Campus Norte",
    status: STATUS.ACTIVE,
    address_line1: "Avenida Complutense, 50",
    postal_code: "28040",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-02-15T10:00:00Z",
    stats: { total_rooms: 12, occupied: 10, free: 1, pending: 1 },
  },
  {
    id: "acc-003",
    client_account_id: "ca-001",
    internal_company_id: "ic-001",
    fiscal_company_id: "lc-001",
    name: "Apartamentos Moncloa",
    status: STATUS.ACTIVE,
    address_line1: "Calle Isaac Peral, 15",
    postal_code: "28015",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
    stats: { total_rooms: 8, occupied: 7, free: 1, pending: 0 },
  },
  // CA-002: Inversiones García
  {
    id: "acc-004",
    client_account_id: "ca-002",
    internal_company_id: "ic-002",
    fiscal_company_id: "lc-004",
    name: "Edificio Salamanca",
    status: STATUS.ACTIVE,
    address_line1: "Calle Goya, 80",
    postal_code: "28001",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-04-01T10:00:00Z",
    updated_at: "2024-04-01T10:00:00Z",
    stats: { total_rooms: 10, occupied: 8, free: 2, pending: 0 },
  },
  {
    id: "acc-005",
    client_account_id: "ca-002",
    internal_company_id: "ic-002",
    fiscal_company_id: "lc-004",
    name: "Piso Chamberí",
    status: STATUS.ACTIVE,
    address_line1: "Calle Fuencarral, 120",
    postal_code: "28010",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-04-15T10:00:00Z",
    updated_at: "2024-04-15T10:00:00Z",
    stats: { total_rooms: 6, occupied: 5, free: 0, pending: 1 },
  },
  // CA-003: Centro Histórico (Basic)
  {
    id: "acc-006",
    client_account_id: "ca-003",
    internal_company_id: "ic-003",
    fiscal_company_id: null, // Basic puede tener null
    name: "Apartamento Sol",
    status: STATUS.ACTIVE,
    address_line1: "Calle Arenal, 10",
    postal_code: "28013",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    stats: { total_rooms: 5, occupied: 4, free: 1, pending: 0 },
  },
  {
    id: "acc-007",
    client_account_id: "ca-003",
    internal_company_id: "ic-003",
    fiscal_company_id: null,
    name: "Estudio Opera",
    status: STATUS.ACTIVE,
    address_line1: "Plaza de Oriente, 3",
    postal_code: "28013",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-07-01T10:00:00Z",
    updated_at: "2024-07-01T10:00:00Z",
    stats: { total_rooms: 7, occupied: 6, free: 1, pending: 0 },
  },
  // CA-004: Agencia (múltiples internas)
  {
    id: "acc-008",
    client_account_id: "ca-004",
    internal_company_id: "ic-004", // Cartera Centro
    fiscal_company_id: "lc-007",
    name: "Residencia Gran Vía",
    status: STATUS.ACTIVE,
    address_line1: "Gran Vía, 30",
    postal_code: "28013",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-03-01T10:00:00Z",
    stats: { total_rooms: 20, occupied: 18, free: 2, pending: 0 },
  },
  {
    id: "acc-009",
    client_account_id: "ca-004",
    internal_company_id: "ic-005", // Cartera Norte
    fiscal_company_id: "lc-008",
    name: "Apartamentos Chamartín",
    status: STATUS.ACTIVE,
    address_line1: "Paseo de la Castellana, 200",
    postal_code: "28046",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-03-15T10:00:00Z",
    updated_at: "2024-03-15T10:00:00Z",
    stats: { total_rooms: 15, occupied: 12, free: 2, pending: 1 },
  },
  {
    id: "acc-010",
    client_account_id: "ca-004",
    internal_company_id: "ic-006", // Cartera UAM
    fiscal_company_id: "lc-007",
    name: "Residencia UAM Campus",
    status: STATUS.ACTIVE,
    address_line1: "Campus UAM, Edificio B",
    postal_code: "28049",
    city: "Madrid",
    province: "Madrid",
    country: "España",
    created_at: "2024-04-01T10:00:00Z",
    updated_at: "2024-04-01T10:00:00Z",
    stats: { total_rooms: 25, occupied: 22, free: 2, pending: 1 },
  },
];

// =============================================================================
// ROOMS (Habitaciones)
// =============================================================================
export const mockRooms = [
  // Habitaciones para acc-001 (Residencia Universitaria Central)
  { id: "room-001", client_account_id: "ca-001", accommodation_id: "acc-001", number: "101", status: ROOM_STATUS.OCCUPIED, monthly_rent: 450, notes: null },
  { id: "room-002", client_account_id: "ca-001", accommodation_id: "acc-001", number: "102", status: ROOM_STATUS.OCCUPIED, monthly_rent: 450, notes: null },
  { id: "room-003", client_account_id: "ca-001", accommodation_id: "acc-001", number: "103", status: ROOM_STATUS.OCCUPIED, monthly_rent: 480, notes: "Suite con baño privado" },
  { id: "room-004", client_account_id: "ca-001", accommodation_id: "acc-001", number: "104", status: ROOM_STATUS.FREE, monthly_rent: 450, notes: null },
  { id: "room-005", client_account_id: "ca-001", accommodation_id: "acc-001", number: "105", status: ROOM_STATUS.OCCUPIED, monthly_rent: 450, notes: null },
  { id: "room-006", client_account_id: "ca-001", accommodation_id: "acc-001", number: "201", status: ROOM_STATUS.OCCUPIED, monthly_rent: 470, notes: null },
  { id: "room-007", client_account_id: "ca-001", accommodation_id: "acc-001", number: "202", status: ROOM_STATUS.OCCUPIED, monthly_rent: 470, notes: null },
  { id: "room-008", client_account_id: "ca-001", accommodation_id: "acc-001", number: "203", status: ROOM_STATUS.OCCUPIED, monthly_rent: 500, notes: "Suite premium" },

  // Habitaciones para acc-006 (Apartamento Sol - Basic)
  { id: "room-020", client_account_id: "ca-003", accommodation_id: "acc-006", number: "1A", status: ROOM_STATUS.OCCUPIED, monthly_rent: 550, notes: null },
  { id: "room-021", client_account_id: "ca-003", accommodation_id: "acc-006", number: "1B", status: ROOM_STATUS.OCCUPIED, monthly_rent: 550, notes: null },
  { id: "room-022", client_account_id: "ca-003", accommodation_id: "acc-006", number: "2A", status: ROOM_STATUS.FREE, monthly_rent: 580, notes: "Exterior con vistas" },
  { id: "room-023", client_account_id: "ca-003", accommodation_id: "acc-006", number: "2B", status: ROOM_STATUS.OCCUPIED, monthly_rent: 550, notes: null },
  { id: "room-024", client_account_id: "ca-003", accommodation_id: "acc-006", number: "3A", status: ROOM_STATUS.OCCUPIED, monthly_rent: 600, notes: "Ático" },

  // Habitaciones para acc-008 (Residencia Gran Vía - Agencia)
  { id: "room-030", client_account_id: "ca-004", accommodation_id: "acc-008", number: "101", status: ROOM_STATUS.OCCUPIED, monthly_rent: 650, notes: null },
  { id: "room-031", client_account_id: "ca-004", accommodation_id: "acc-008", number: "102", status: ROOM_STATUS.OCCUPIED, monthly_rent: 650, notes: null },
  { id: "room-032", client_account_id: "ca-004", accommodation_id: "acc-008", number: "103", status: ROOM_STATUS.FREE, monthly_rent: 650, notes: null },
  { id: "room-033", client_account_id: "ca-004", accommodation_id: "acc-008", number: "104", status: ROOM_STATUS.PENDING_CHECKOUT, monthly_rent: 650, notes: "Baja programada 31/01" },
  { id: "room-034", client_account_id: "ca-004", accommodation_id: "acc-008", number: "105", status: ROOM_STATUS.OCCUPIED, monthly_rent: 680, notes: "Suite" },
];

// =============================================================================
// TENANTS (Inquilinos)
// =============================================================================
export const mockTenants = [
  // Inquilinos CA-001
  {
    id: "tenant-001",
    client_account_id: "ca-001",
    profile_user_id: "user-101",
    full_name: "Ana García López",
    email: "ana.garcia@estudiante.es",
    phone: "+34 666 111 001",
    status: TENANT_STATUS.ACTIVE,
    created_at: "2024-02-01T10:00:00Z",
    updated_at: "2024-02-01T10:00:00Z",
    current_room: "101",
    current_accommodation: "Residencia Universitaria Central",
  },
  {
    id: "tenant-002",
    client_account_id: "ca-001",
    profile_user_id: "user-102",
    full_name: "Carlos Martín Ruiz",
    email: "carlos.martin@estudiante.es",
    phone: "+34 666 111 002",
    status: TENANT_STATUS.ACTIVE,
    created_at: "2024-02-15T10:00:00Z",
    updated_at: "2024-02-15T10:00:00Z",
    current_room: "102",
    current_accommodation: "Residencia Universitaria Central",
  },
  {
    id: "tenant-003",
    client_account_id: "ca-001",
    profile_user_id: null,
    full_name: "Laura Fernández Gómez",
    email: "laura.fernandez@email.com",
    phone: "+34 666 111 003",
    status: TENANT_STATUS.INVITED,
    created_at: "2024-12-01T10:00:00Z",
    updated_at: "2024-12-01T10:00:00Z",
    current_room: null,
    current_accommodation: null,
  },
  {
    id: "tenant-004",
    client_account_id: "ca-001",
    profile_user_id: "user-104",
    full_name: "Pedro Sánchez Díaz",
    email: "pedro.sanchez@estudiante.es",
    phone: "+34 666 111 004",
    status: TENANT_STATUS.PENDING_CHECKOUT,
    created_at: "2024-03-01T10:00:00Z",
    updated_at: "2024-12-15T10:00:00Z",
    current_room: "201",
    current_accommodation: "Residencia Campus Norte",
  },
  // Inquilinos CA-003 (Basic)
  {
    id: "tenant-010",
    client_account_id: "ca-003",
    profile_user_id: "user-110",
    full_name: "María López Hernández",
    email: "maria.lopez@gmail.com",
    phone: "+34 666 222 001",
    status: TENANT_STATUS.ACTIVE,
    created_at: "2024-07-01T10:00:00Z",
    updated_at: "2024-07-01T10:00:00Z",
    current_room: "1A",
    current_accommodation: "Apartamento Sol",
  },
  {
    id: "tenant-011",
    client_account_id: "ca-003",
    profile_user_id: "user-111",
    full_name: "José García Martín",
    email: "jose.garcia@gmail.com",
    phone: "+34 666 222 002",
    status: TENANT_STATUS.ACTIVE,
    created_at: "2024-07-15T10:00:00Z",
    updated_at: "2024-07-15T10:00:00Z",
    current_room: "1B",
    current_accommodation: "Apartamento Sol",
  },
  // Inquilinos CA-004 (Agencia)
  {
    id: "tenant-020",
    client_account_id: "ca-004",
    profile_user_id: "user-120",
    full_name: "Elena Torres Vega",
    email: "elena.torres@estudiante.uam.es",
    phone: "+34 666 333 001",
    status: TENANT_STATUS.ACTIVE,
    created_at: "2024-04-01T10:00:00Z",
    updated_at: "2024-04-01T10:00:00Z",
    current_room: "101",
    current_accommodation: "Residencia Gran Vía",
  },
  {
    id: "tenant-021",
    client_account_id: "ca-004",
    profile_user_id: "user-121",
    full_name: "Miguel Ángel Ruiz",
    email: "miguel.ruiz@estudiante.uam.es",
    phone: "+34 666 333 002",
    status: TENANT_STATUS.PENDING_CHECKOUT,
    created_at: "2024-04-15T10:00:00Z",
    updated_at: "2024-12-20T10:00:00Z",
    current_room: "104",
    current_accommodation: "Residencia Gran Vía",
  },
];

// =============================================================================
// ROOM OCCUPANCIES (Ocupaciones)
// =============================================================================
export const mockRoomOccupancies = [
  {
    id: "occ-001",
    client_account_id: "ca-001",
    room_id: "room-001",
    tenant_id: "tenant-001",
    move_in_date: "2024-02-01",
    billing_start_date: "2024-02-01",
    move_out_date: null,
    billing_end_date: null,
    bill_services_during_gap: false,
    status: OCCUPANCY_STATUS.ACTIVE,
  },
  {
    id: "occ-002",
    client_account_id: "ca-001",
    room_id: "room-002",
    tenant_id: "tenant-002",
    move_in_date: "2024-02-15",
    billing_start_date: "2024-03-01", // Facturación desde 1 de marzo
    move_out_date: null,
    billing_end_date: null,
    bill_services_during_gap: false,
    status: OCCUPANCY_STATUS.ACTIVE,
  },
  {
    id: "occ-003",
    client_account_id: "ca-001",
    room_id: "room-006",
    tenant_id: "tenant-004",
    move_in_date: "2024-03-01",
    billing_start_date: "2024-03-01",
    move_out_date: "2025-01-31",
    billing_end_date: "2025-01-31",
    bill_services_during_gap: false,
    status: OCCUPANCY_STATUS.PENDING_CHECKOUT,
  },
  // Ocupaciones CA-003
  {
    id: "occ-010",
    client_account_id: "ca-003",
    room_id: "room-020",
    tenant_id: "tenant-010",
    move_in_date: "2024-07-01",
    billing_start_date: "2024-07-01",
    move_out_date: null,
    billing_end_date: null,
    bill_services_during_gap: false,
    status: OCCUPANCY_STATUS.ACTIVE,
  },
  // Ocupaciones CA-004
  {
    id: "occ-020",
    client_account_id: "ca-004",
    room_id: "room-030",
    tenant_id: "tenant-020",
    move_in_date: "2024-04-01",
    billing_start_date: "2024-04-01",
    move_out_date: null,
    billing_end_date: null,
    bill_services_during_gap: false,
    status: OCCUPANCY_STATUS.ACTIVE,
  },
  {
    id: "occ-021",
    client_account_id: "ca-004",
    room_id: "room-033",
    tenant_id: "tenant-021",
    move_in_date: "2024-04-15",
    billing_start_date: "2024-04-15",
    move_out_date: "2025-01-31",
    billing_end_date: "2025-01-31",
    bill_services_during_gap: false,
    status: OCCUPANCY_STATUS.PENDING_CHECKOUT,
  },
];

// =============================================================================
// USERS (Usuarios del sistema)
// =============================================================================
export const mockUsers = [
  // Superadmin (SmartRent Systems)
  {
    id: "user-superadmin",
    email: "admin@smartrentsystems.com",
    full_name: "Administrador SmartRent",
    phone: "+34 900 123 456",
    role: ROLES.SUPERADMIN,
    client_account_id: null, // Superadmin no pertenece a ningún tenant
    status: STATUS.ACTIVE,
  },
  // Admins de tenants
  {
    id: "user-admin-001",
    email: "admin@residencias-madrid.es",
    full_name: "Director Residencias Madrid",
    phone: "+34 915 123 456",
    role: ROLES.ADMIN,
    client_account_id: "ca-001",
    status: STATUS.ACTIVE,
  },
  {
    id: "user-admin-002",
    email: "juan.garcia@inversiones-garcia.es",
    full_name: "Juan García López",
    phone: "+34 666 123 456",
    role: ROLES.ADMIN,
    client_account_id: "ca-002",
    status: STATUS.ACTIVE,
  },
  {
    id: "user-admin-003",
    email: "maria@centro-historico.es",
    full_name: "María Fernández Ruiz",
    phone: "+34 666 789 012",
    role: ROLES.ADMIN,
    client_account_id: "ca-003",
    status: STATUS.ACTIVE,
  },
  {
    id: "user-admin-004",
    email: "director@agencia-gestion.es",
    full_name: "Director Agencia Gestión",
    phone: "+34 912 345 678",
    role: ROLES.ADMIN,
    client_account_id: "ca-004",
    status: STATUS.ACTIVE,
  },
  // API users
  {
    id: "user-api-001",
    email: "api@residencias-madrid.es",
    full_name: "Sistema API Residencias",
    phone: null,
    role: ROLES.API,
    client_account_id: "ca-001",
    status: STATUS.ACTIVE,
  },
  // Viewers (solo Agencia)
  {
    id: "user-viewer-001",
    email: "viewer.centro@agencia-gestion.es",
    full_name: "Gestor Zona Centro",
    phone: "+34 666 444 001",
    role: ROLES.VIEWER,
    client_account_id: "ca-004",
    internal_company_id: "ic-004", // Solo ve Cartera Zona Centro
    status: STATUS.ACTIVE,
  },
  {
    id: "user-viewer-002",
    email: "viewer.norte@agencia-gestion.es",
    full_name: "Gestor Zona Norte",
    phone: "+34 666 444 002",
    role: ROLES.VIEWER,
    client_account_id: "ca-004",
    internal_company_id: "ic-005", // Solo ve Cartera Zona Norte
    status: STATUS.ACTIVE,
  },
];

// =============================================================================
// CONSUMPTION DATA (Datos de consumo - para gráficas)
// =============================================================================
export const mockConsumptionData = {
  // Datos de consumo diario del último mes para un inquilino
  daily: [
    { date: "2025-01-01", kwh: 5.2, cost: 1.25 },
    { date: "2025-01-02", kwh: 4.8, cost: 1.15 },
    { date: "2025-01-03", kwh: 6.1, cost: 1.45 },
    { date: "2025-01-04", kwh: 5.5, cost: 1.32 },
    { date: "2025-01-05", kwh: 7.2, cost: 1.72 },
    { date: "2025-01-06", kwh: 6.8, cost: 1.63 },
    { date: "2025-01-07", kwh: 5.9, cost: 1.42 },
    { date: "2025-01-08", kwh: 5.1, cost: 1.22 },
    { date: "2025-01-09", kwh: 4.9, cost: 1.18 },
    { date: "2025-01-10", kwh: 5.3, cost: 1.27 },
    { date: "2025-01-11", kwh: 6.5, cost: 1.56 },
    { date: "2025-01-12", kwh: 7.8, cost: 1.87 },
    { date: "2025-01-13", kwh: 6.2, cost: 1.49 },
    { date: "2025-01-14", kwh: 5.7, cost: 1.37 },
    { date: "2025-01-15", kwh: 5.4, cost: 1.30 },
    { date: "2025-01-16", kwh: 5.0, cost: 1.20 },
    { date: "2025-01-17", kwh: 4.6, cost: 1.10 },
    { date: "2025-01-18", kwh: 5.8, cost: 1.39 },
    { date: "2025-01-19", kwh: 6.9, cost: 1.66 },
    { date: "2025-01-20", kwh: 7.1, cost: 1.70 },
    { date: "2025-01-21", kwh: 6.4, cost: 1.54 },
    { date: "2025-01-22", kwh: 5.6, cost: 1.34 },
    { date: "2025-01-23", kwh: 5.2, cost: 1.25 },
    { date: "2025-01-24", kwh: 4.9, cost: 1.18 },
    { date: "2025-01-25", kwh: 6.0, cost: 1.44 },
    { date: "2025-01-26", kwh: 6.7, cost: 1.61 },
    { date: "2025-01-27", kwh: 5.5, cost: 1.32 },
    { date: "2025-01-28", kwh: 5.3, cost: 1.27 },
    { date: "2025-01-29", kwh: 5.1, cost: 1.22 },
  ],
  // Resumen mensual
  monthly_summary: {
    total_kwh: 168.4,
    total_cost: 40.42,
    avg_daily_kwh: 5.81,
    avg_daily_cost: 1.39,
  },
};

// =============================================================================
// BULLETINS (Boletines energéticos)
// =============================================================================
export const mockBulletins = [
  {
    id: "bulletin-001",
    client_account_id: "ca-001",
    tenant_id: "tenant-001",
    period_start: "2024-12-01",
    period_end: "2024-12-31",
    total_kwh: 152.3,
    total_cost: 36.55,
    fixed_cost: 12.50,
    variable_cost: 24.05,
    status: "generated",
    generated_at: "2025-01-05T10:00:00Z",
    pdf_url: "/bulletins/2024-12/tenant-001.pdf",
  },
  {
    id: "bulletin-002",
    client_account_id: "ca-001",
    tenant_id: "tenant-001",
    period_start: "2024-11-01",
    period_end: "2024-11-30",
    total_kwh: 145.8,
    total_cost: 34.99,
    fixed_cost: 12.50,
    variable_cost: 22.49,
    status: "generated",
    generated_at: "2024-12-05T10:00:00Z",
    pdf_url: "/bulletins/2024-11/tenant-001.pdf",
  },
  {
    id: "bulletin-003",
    client_account_id: "ca-001",
    tenant_id: "tenant-001",
    period_start: "2024-10-01",
    period_end: "2024-10-31",
    total_kwh: 138.2,
    total_cost: 33.17,
    fixed_cost: 12.50,
    variable_cost: 20.67,
    status: "generated",
    generated_at: "2024-11-05T10:00:00Z",
    pdf_url: "/bulletins/2024-10/tenant-001.pdf",
  },
];

// =============================================================================
// SURVEYS (Encuestas)
// =============================================================================
export const mockSurveys = [
  {
    id: "survey-001",
    client_account_id: "ca-001",
    title: "Encuesta de Satisfacción Mensual - Enero 2025",
    description: "Queremos conocer tu opinión sobre nuestros servicios",
    status: "active",
    due_date: "2025-02-15",
    questions: [
      { id: "q1", text: "¿Cómo valorarías la limpieza de las zonas comunes?", type: "rating" },
      { id: "q2", text: "¿Estás satisfecho con la temperatura de tu habitación?", type: "rating" },
      { id: "q3", text: "¿Tienes alguna sugerencia para mejorar?", type: "text" },
    ],
  },
  {
    id: "survey-002",
    client_account_id: "ca-001",
    title: "Encuesta de Satisfacción - Diciembre 2024",
    description: "Tu opinión nos ayuda a mejorar",
    status: "completed",
    due_date: "2025-01-10",
    questions: [
      { id: "q1", text: "¿Cómo valorarías la limpieza de las zonas comunes?", type: "rating" },
      { id: "q2", text: "¿Estás satisfecho con la temperatura de tu habitación?", type: "rating" },
    ],
  },
];

// =============================================================================
// TICKETS (Incidencias)
// =============================================================================
export const mockTickets = [
  {
    id: "ticket-001",
    client_account_id: "ca-001",
    tenant_id: "tenant-001",
    subject: "Calefacción no funciona correctamente",
    description: "La calefacción de mi habitación no calienta bien. Hace frío por las noches.",
    status: "open",
    priority: "high",
    created_at: "2025-01-25T14:30:00Z",
    updated_at: "2025-01-25T14:30:00Z",
    room_number: "101",
    category: "mantenimiento",
  },
  {
    id: "ticket-002",
    client_account_id: "ca-001",
    tenant_id: "tenant-001",
    subject: "Bombilla fundida en el baño",
    description: "La bombilla del baño se ha fundido y necesito que la cambien.",
    status: "in_progress",
    priority: "low",
    created_at: "2025-01-20T09:00:00Z",
    updated_at: "2025-01-22T11:00:00Z",
    room_number: "101",
    category: "electricidad",
  },
  {
    id: "ticket-003",
    client_account_id: "ca-001",
    tenant_id: "tenant-001",
    subject: "WiFi lento",
    description: "El WiFi va muy lento últimamente, especialmente por las tardes.",
    status: "resolved",
    priority: "medium",
    created_at: "2025-01-10T16:00:00Z",
    updated_at: "2025-01-12T10:00:00Z",
    room_number: "101",
    category: "conectividad",
    resolution: "Se ha actualizado el router y mejorado la señal en la zona.",
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Obtener cuenta cliente por ID
export const getClientAccountById = (id) => {
  return mockClientAccounts.find((ca) => ca.id === id) || null;
};

// Obtener empresas legales por cuenta cliente
export const getLegalCompaniesByClientAccount = (clientAccountId) => {
  return mockLegalCompanies.filter((lc) => lc.client_account_id === clientAccountId);
};

// Obtener empresas internas por cuenta cliente
export const getInternalCompaniesByClientAccount = (clientAccountId) => {
  return mockInternalCompanies.filter((ic) => ic.client_account_id === clientAccountId);
};

// Obtener alojamientos por cuenta cliente
export const getAccommodationsByClientAccount = (clientAccountId) => {
  return mockAccommodations.filter((acc) => acc.client_account_id === clientAccountId);
};

// Obtener habitaciones por alojamiento
export const getRoomsByAccommodation = (accommodationId) => {
  return mockRooms.filter((room) => room.accommodation_id === accommodationId);
};

// Obtener inquilinos por cuenta cliente
export const getTenantsByClientAccount = (clientAccountId) => {
  return mockTenants.filter((t) => t.client_account_id === clientAccountId);
};

// Obtener usuarios por cuenta cliente
export const getUsersByClientAccount = (clientAccountId) => {
  return mockUsers.filter((u) => u.client_account_id === clientAccountId);
};

// Obtener label del plan
export const getPlanLabel = (plan) => {
  const labels = {
    [PLANS.BASIC]: "Basic",
    [PLANS.INVESTOR]: "Investor",
    [PLANS.BUSINESS]: "Business",
    [PLANS.AGENCY]: "Agencia",
  };
  return labels[plan] || plan;
};

// Obtener color del plan
export const getPlanColor = (plan) => {
  const colors = {
    [PLANS.BASIC]: "#6B7280",
    [PLANS.INVESTOR]: "#059669",
    [PLANS.BUSINESS]: "#1E40AF",
    [PLANS.AGENCY]: "#DC2626",
  };
  return colors[plan] || "#6B7280";
};

// Obtener label del estado
export const getStatusLabel = (status) => {
  const labels = {
    [STATUS.ACTIVE]: "Activo",
    [STATUS.SUSPENDED]: "Suspendido",
    [STATUS.CANCELLED]: "Cancelado",
    [STATUS.INACTIVE]: "Inactivo",
  };
  return labels[status] || status;
};

// Obtener color del estado
export const getStatusColor = (status) => {
  const colors = {
    [STATUS.ACTIVE]: "#059669",
    [STATUS.SUSPENDED]: "#F59E0B",
    [STATUS.CANCELLED]: "#DC2626",
    [STATUS.INACTIVE]: "#6B7280",
  };
  return colors[status] || "#6B7280";
};

// Obtener label del estado de habitación
export const getRoomStatusLabel = (status) => {
  const labels = {
    [ROOM_STATUS.FREE]: "Libre",
    [ROOM_STATUS.OCCUPIED]: "Ocupada",
    [ROOM_STATUS.PENDING_CHECKOUT]: "Pendiente de baja",
    [ROOM_STATUS.INACTIVE]: "Inactiva",
  };
  return labels[status] || status;
};

// Obtener color del estado de habitación
export const getRoomStatusColor = (status) => {
  const colors = {
    [ROOM_STATUS.FREE]: "#059669",
    [ROOM_STATUS.OCCUPIED]: "#DC2626",
    [ROOM_STATUS.PENDING_CHECKOUT]: "#F59E0B",
    [ROOM_STATUS.INACTIVE]: "#6B7280",
  };
  return colors[status] || "#6B7280";
};

// Formatear fecha
export const formatDate = (dateString) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Formatear moneda
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};
