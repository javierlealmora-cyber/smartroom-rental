/**
 * incidents-channel-resolution.spec.ts — Fase 11C5E-SECURITY-BOUNDARY-CLOSURE (Suite 7/8)
 *
 * Tests de resolución fail-closed del canal (CONSUMER_SOURCE_CHANNEL_RESOLVED_SERVER_SIDE).
 * Verifica que source_channel se obtiene de conv_session.channel (fuente canónica),
 * que el body no puede sobrescribir el canal persistido, y que cualquier valor desconocido
 * o mismatch falla cerrado antes de invocar el adapter.
 *
 * Clasificación: RUNTIME_BEHAVIOR — resolveIncidentSourceChannel + assertSourceChannelNotOverridden
 *
 * Total: 12 tests activos.
 */

import { describe, it, expect } from 'vitest';

import {
  resolveIncidentSourceChannel,
  assertSourceChannelNotOverridden,
} from '../../../../../supabase/functions/_shared/smart-conversations/incidents-integration-port.ts';

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../../../../');

// ─────────────────────────────────────────────────────────────────────────────
// N11C5E-SECURITY-CHANNEL — Resolución fail-closed del canal (RUNTIME_BEHAVIOR)
// ─────────────────────────────────────────────────────────────────────────────

describe('N11C5E-SECURITY-CHANNEL — Source channel resolution (RUNTIME_BEHAVIOR)', () => {
  it('CHANNEL-01: session whatsapp → provider whatsapp', () => {
    expect(resolveIncidentSourceChannel('whatsapp')).toBe('whatsapp');
  });

  it('CHANNEL-02: session webchat → provider webchat', () => {
    expect(resolveIncidentSourceChannel('webchat')).toBe('webchat');
  });

  it('CHANNEL-03: source ausente (undefined) → error INCIDENT_SOURCE_CHANNEL_INVALID', () => {
    expect(() => resolveIncidentSourceChannel(undefined)).toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-04: source desconocido (sms) → error INCIDENT_SOURCE_CHANNEL_INVALID', () => {
    expect(() => resolveIncidentSourceChannel('sms')).toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-05: email → error INCIDENT_SOURCE_CHANNEL_INVALID', () => {
    expect(() => resolveIncidentSourceChannel('email')).toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-06: voice → error INCIDENT_SOURCE_CHANNEL_INVALID', () => {
    expect(() => resolveIncidentSourceChannel('voice')).toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-07: typo webcaht → error INCIDENT_SOURCE_CHANNEL_INVALID', () => {
    expect(() => resolveIncidentSourceChannel('webcaht')).toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-08: body whatsapp y session webchat → error (mismatch falla cerrado)', () => {
    const sessionChannel = resolveIncidentSourceChannel('webchat');
    expect(() => assertSourceChannelNotOverridden(sessionChannel, 'whatsapp'))
      .toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-09: body webchat y session whatsapp → error (mismatch falla cerrado)', () => {
    const sessionChannel = resolveIncidentSourceChannel('whatsapp');
    expect(() => assertSourceChannelNotOverridden(sessionChannel, 'webchat'))
      .toThrow('INCIDENT_SOURCE_CHANNEL_INVALID');
  });

  it('CHANNEL-10: adapter no se invoca ante canal inválido (función lanza antes)', () => {
    let adapterInvoked = false;
    try {
      resolveIncidentSourceChannel('invalid-channel');
      adapterInvoked = true;
    } catch {
      // Expected: lanza antes de cualquier llamada al adapter
    }
    expect(adapterInvoked).toBe(false);
  });

  it('CHANNEL-11: n8n no puede sobrescribir el canal persistido — entrypoint usa resolveIncidentSourceChannel', () => {
    const entrypointSrc = fs.readFileSync(
      path.join(ROOT, 'supabase/functions/conv-core-create-incident/index.ts'), 'utf8',
    );
    expect(entrypointSrc).toContain('resolveIncidentSourceChannel');
    expect(entrypointSrc).toContain('assertSourceChannelNotOverridden');
    const clean = entrypointSrc.replace(/\/\/[^\n]*/g, '');
    expect(clean).not.toMatch(/source\s*===\s*['"]webchat['"]\s*\?\s*['"]webchat['"]\s*:\s*['"]whatsapp['"]/);
  });

  it('CHANNEL-12: OpenAPI permite exclusivamente whatsapp y webchat', () => {
    const oasSrc = fs.readFileSync(
      path.join(ROOT, 'docs/smart-conversations/integrations/incidents-addon-openapi-consumer.yaml'), 'utf8',
    );
    expect(oasSrc).toContain('source_channel');
    expect(oasSrc).toContain('whatsapp');
    expect(oasSrc).toContain('webchat');
    expect(oasSrc).not.toContain("'voice'");
    expect(oasSrc).not.toContain("'email'");
    expect(oasSrc).not.toContain("'sms'");
  });
});
