/**
 * Suite: Schema — Modelo de datos Fase 1
 * Verifica que la migración 20260716000001 cumple las reglas del modelo de datos.
 *
 * IMPORTANTE: estos tests son estructurales — leen el SQL de la migración
 * y verifican su contenido. No conectan a ninguna base de datos real.
 * Esto permite que los tests pasen en CI sin Supabase disponible.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const MIGRATION_PATH = join(
  process.cwd(),
  'supabase/migrations/20260716000001_smart_conversations_core_schema.sql'
);

let sql: string;

beforeAll(() => {
  sql = readFileSync(MIGRATION_PATH, 'utf-8');
});

// ---------------------------------------------------------------------------
// Existencia de tablas
// ---------------------------------------------------------------------------

describe('[SCHEMA] Existencia de tablas conv_*', () => {
  const expectedTables = [
    'conv_service_activations',
    'conv_wa_sessions',
    'conv_wc_configs',
    'conv_sessions',
    'conv_cases',
    'conv_messages',
    'conv_send_queue',
    'conv_admin_notifications',
  ];

  for (const table of expectedTables) {
    it(`[SCHEMA-T] CREATE TABLE ${table} existe en la migración`, () => {
      expect(sql).toContain(`CREATE TABLE ${table}`);
    });
  }
});

// ---------------------------------------------------------------------------
// Prefijo conv_ — ninguna tabla nueva sin prefijo
// ---------------------------------------------------------------------------

describe('[SCHEMA] Todas las tablas nuevas tienen prefijo conv_', () => {
  it('[SCHEMA-P01] No existe CREATE TABLE sin prefijo conv_ (tablas propias del add-on)', () => {
    // Extrae todos los nombres de tabla del CREATE TABLE
    const matches = [...sql.matchAll(/CREATE TABLE (\w+)/g)].map(m => m[1]);
    const nonConv = matches.filter(name => !name.startsWith('conv_'));
    expect(
      nonConv,
      `Tablas sin prefijo conv_ detectadas: ${nonConv.join(', ')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Índice parcial de deduplicación WhatsApp
// ---------------------------------------------------------------------------

describe('[SCHEMA] Índice parcial uq_wa_message_id', () => {
  it('[SCHEMA-IDX01] Existe CREATE UNIQUE INDEX uq_wa_message_id', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX uq_wa_message_id');
  });

  it('[SCHEMA-IDX02] uq_wa_message_id aplica WHERE wasender_message_id IS NOT NULL', () => {
    expect(sql).toContain('WHERE wasender_message_id IS NOT NULL');
  });

  it('[SCHEMA-IDX03] uq_wa_message_id es sobre conv_messages', () => {
    expect(sql).toMatch(/CREATE UNIQUE INDEX uq_wa_message_id\s+ON conv_messages/);
  });

  it('[SCHEMA-IDX04] No usa NULLS NOT DISTINCT (prohibido en la especificación)', () => {
    expect(sql).not.toContain('NULLS NOT DISTINCT');
  });
});

// ---------------------------------------------------------------------------
// conv_send_queue — nomenclatura oficial
// ---------------------------------------------------------------------------

describe('[SCHEMA] conv_send_queue — campos oficiales', () => {
  it('[SCHEMA-Q01] Existe columna next_attempt_at (no next_retry_at)', () => {
    expect(sql).toContain('next_attempt_at');
  });

  it('[SCHEMA-Q02] No existe next_retry_at (campo prohibido por la especificación)', () => {
    expect(sql).not.toContain('next_retry_at');
  });

  it('[SCHEMA-Q03] Existe columna attempts (no attempt_count)', () => {
    expect(sql).toContain('attempts');
  });

  it('[SCHEMA-Q04] No existe attempt_count (campo prohibido por la especificación)', () => {
    expect(sql).not.toContain('attempt_count');
  });

  it('[SCHEMA-Q05] status de conv_send_queue incluye pending', () => {
    const block = extractTableBlock(sql, 'conv_send_queue');
    expect(block).toContain("'pending'");
  });

  it('[SCHEMA-Q06] status de conv_send_queue incluye processing', () => {
    const block = extractTableBlock(sql, 'conv_send_queue');
    expect(block).toContain("'processing'");
  });

  it('[SCHEMA-Q07] status de conv_send_queue incluye succeeded', () => {
    const block = extractTableBlock(sql, 'conv_send_queue');
    expect(block).toContain("'succeeded'");
  });

  it('[SCHEMA-Q08] status de conv_send_queue incluye failed', () => {
    const block = extractTableBlock(sql, 'conv_send_queue');
    expect(block).toContain("'failed'");
  });
});

// ---------------------------------------------------------------------------
// conv_cases — estados válidos
// ---------------------------------------------------------------------------

describe('[SCHEMA] conv_cases — estados válidos', () => {
  const expectedStatuses = ['open', 'waiting_user', 'waiting_internal', 'escalated', 'resolved', 'closed'];

  for (const status of expectedStatuses) {
    it(`[SCHEMA-C] conv_cases.status incluye '${status}'`, () => {
      const block = extractTableBlock(sql, 'conv_cases');
      expect(block).toContain(`'${status}'`);
    });
  }
});

// ---------------------------------------------------------------------------
// conv_messages — estados válidos
// ---------------------------------------------------------------------------

describe('[SCHEMA] conv_messages — estados válidos', () => {
  const expectedStatuses = ['received', 'processing', 'sent', 'failed'];

  for (const status of expectedStatuses) {
    it(`[SCHEMA-M] conv_messages.status incluye '${status}'`, () => {
      const block = extractTableBlock(sql, 'conv_messages');
      expect(block).toContain(`'${status}'`);
    });
  }
});

// ---------------------------------------------------------------------------
// conv_sessions — identity_level
// ---------------------------------------------------------------------------

describe('[SCHEMA] conv_sessions — identity_level', () => {
  const validLevels = [
    'NO_MATCH',
    'MATCH_INACTIVE',
    'PARTIAL_MATCH_ACTIVE',
    'STRONG_MATCH_ACTIVE',
    'UNVERIFIED_LEAD',
  ];

  for (const level of validLevels) {
    it(`[SCHEMA-IL] conv_sessions.identity_level incluye '${level}'`, () => {
      const block = extractTableBlock(sql, 'conv_sessions');
      expect(block).toContain(`'${level}'`);
    });
  }

  it('[SCHEMA-IL-NEG] conv_sessions.identity_level no incluye UNVERIFIED (nivel prohibido)', () => {
    // UNVERIFIED sin sufijo no es un nivel válido (rules-40)
    // Solo es válido UNVERIFIED_LEAD
    const block = extractTableBlock(sql, 'conv_sessions');
    // Verificar que 'UNVERIFIED' solo aparece como parte de 'UNVERIFIED_LEAD'
    const standaloneUnverified = block.match(/'UNVERIFIED'(?!_LEAD)/g);
    expect(standaloneUnverified).toBeNull();
  });

  it('[SCHEMA-IL-COMMENT] sender_ref no almacena phone_number (comentado en migración)', () => {
    expect(sql).toContain('phone_number');
    // El campo phone_number debe aparecer solo en comentarios, nunca como columna
    expect(sql).not.toMatch(/^\s+phone_number\s+/m);
  });
});

// ---------------------------------------------------------------------------
// RLS habilitado
// ---------------------------------------------------------------------------

describe('[SCHEMA] RLS habilitado en todas las tablas conv_*', () => {
  const tables = [
    'conv_service_activations',
    'conv_wa_sessions',
    'conv_wc_configs',
    'conv_sessions',
    'conv_cases',
    'conv_messages',
    'conv_send_queue',
    'conv_admin_notifications',
  ];

  for (const table of tables) {
    it(`[SCHEMA-RLS] ${table} tiene ENABLE ROW LEVEL SECURITY`, () => {
      expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`);
    });
  }
});

// ---------------------------------------------------------------------------
// Separación con el Core
// ---------------------------------------------------------------------------

describe('[SCHEMA] Separación con SmartRoom Core', () => {
  it('[SCHEMA-CORE01] No existe ALTER TABLE con tablas del Core (accounts, profiles, rooms, etc.)', () => {
    const coreTablePatterns = [
      'ALTER TABLE accounts',
      'ALTER TABLE profiles',
      'ALTER TABLE rooms',
      'ALTER TABLE tenants',
      'ALTER TABLE buildings',
      'ALTER TABLE contracts',
      'ALTER TABLE invoices',
    ];
    for (const pattern of coreTablePatterns) {
      expect(sql, `Detectada modificación de tabla Core: "${pattern}"`).not.toContain(pattern);
    }
  });

  it('[SCHEMA-CORE02] No existe ADD COLUMN sobre tablas del Core', () => {
    // Cualquier ALTER TABLE que no sea sobre conv_* es sospechoso
    const alterMatches = [...sql.matchAll(/ALTER TABLE (\w+)/g)].map(m => m[1]);
    const nonConv = alterMatches.filter(name => !name.startsWith('conv_'));
    expect(
      nonConv,
      `ALTER TABLE sobre tablas no-conv_: ${nonConv.join(', ')}`
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Fixtures de regresión — coherencia con el modelo
// ---------------------------------------------------------------------------

describe('[SCHEMA] Coherencia fixtures vs modelo de datos', () => {
  it('[SCHEMA-F01] PARTIAL_MATCH_ACTIVE pre-incidencia usa status=open (no waiting_user)', () => {
    // Verificación documental: el modelo declara open como default en conv_cases
    // y rules-40 §4.6 establece que PARTIAL_MATCH_ACTIVE crea pre-incidencia en conv_cases
    const block = extractTableBlock(sql, 'conv_cases');
    expect(block).toContain("DEFAULT 'open'");
  });

  it('[SCHEMA-F02] conv_send_queue tiene max_retries DEFAULT 3 (backoff 1s→5s→30s, 3 intentos totales)', () => {
    const block = extractTableBlock(sql, 'conv_send_queue');
    expect(block).toContain('DEFAULT 3');
  });

  it('[SCHEMA-F03] conv_sessions.identity_attempts máximo es 3 (rules-40 §3.7)', () => {
    const block = extractTableBlock(sql, 'conv_sessions');
    expect(block).toContain('identity_attempts <= 3');
  });

  it('[SCHEMA-F04] conv_wa_sessions.status incluye disconnected, connecting, active, error', () => {
    const block = extractTableBlock(sql, 'conv_wa_sessions');
    expect(block).toContain("'disconnected'");
    expect(block).toContain("'connecting'");
    expect(block).toContain("'active'");
    expect(block).toContain("'error'");
  });
});

// ---------------------------------------------------------------------------
// Helper: extraer el bloque CREATE TABLE de una tabla específica
// ---------------------------------------------------------------------------

function extractTableBlock(fullSql: string, tableName: string): string {
  const startMarker = `CREATE TABLE ${tableName}`;
  const startIdx = fullSql.indexOf(startMarker);
  if (startIdx === -1) return '';

  // Buscar el cierre del bloque CREATE TABLE: línea que comience con ');'
  // Un ';' dentro de un comentario inline no es el fin del bloque.
  const afterStart = fullSql.slice(startIdx);
  const endMatch = afterStart.match(/^\s*\)\s*;/m);
  if (!endMatch || endMatch.index === undefined) return afterStart;

  return afterStart.slice(0, endMatch.index + endMatch[0].length);
}
