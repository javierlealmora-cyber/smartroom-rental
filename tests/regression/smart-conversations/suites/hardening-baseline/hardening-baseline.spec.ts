/**
 * Hardening Baseline — Static Analysis Tests
 * Fase 11A · SmartConversations
 *
 * Tests estáticos que verifican invariantes de seguridad, configuración y estructura.
 * No conectan a ningún servicio real. No activan flags de producción.
 * Deben pasar en cualquier entorno (local, CI, staging).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../../');
const HARDENING_DIR = path.join(ROOT, 'docs/smart-conversations/hardening');
const SRC_WEBCHAT = path.join(ROOT, 'src/features/webchat');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const PACKAGE_JSON = path.join(ROOT, 'package.json');

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function readFile(p: string): string {
  return fs.readFileSync(p, 'utf-8');
}
function fileExists(p: string): boolean {
  return fs.existsSync(p);
}

// ---------------------------------------------------------------------------
// HB-01..07 — Documentos de hardening existen
// ---------------------------------------------------------------------------
describe('HB-01..07 — Documentos de hardening', () => {
  const docs = [
    'component-readiness-matrix.md',
    'environment-matrix.md',
    'feature-flag-matrix.md',
    'historical-test-debt.md',
    'risk-register.md',
    'release-gates.md',
    'test-baseline.md',
  ];

  docs.forEach((doc, i) => {
    it(`HB-0${i + 1}: ${doc} existe`, () => {
      expect(fileExists(path.join(HARDENING_DIR, doc))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-08..12 — Feature flags en .env.example
// ---------------------------------------------------------------------------
describe('HB-08..12 — Feature flags seguros en .env.example', () => {
  let envContent: string;

  beforeAll(() => {
    envContent = readFile(ENV_EXAMPLE);
  });

  it('HB-08: VITE_WEBCHAT_WIDGET_ENABLED=false en .env.example', () => {
    expect(envContent).toMatch(/VITE_WEBCHAT_WIDGET_ENABLED=false/);
  });

  it('HB-09: VITE_WEBCHAT_REALTIME_ENABLED=false en .env.example', () => {
    expect(envContent).toMatch(/VITE_WEBCHAT_REALTIME_ENABLED=false/);
  });

  it('HB-10: VITE_WEBCHAT_DEBUG=false en .env.example', () => {
    expect(envContent).toMatch(/VITE_WEBCHAT_DEBUG=false/);
  });

  it('HB-11: VITE_WEBCHAT_SESSION_STORAGE_MODE=memory en .env.example', () => {
    expect(envContent).toMatch(/VITE_WEBCHAT_SESSION_STORAGE_MODE=memory/);
  });

  it('HB-12: .env.example no contiene service_role (case-insensitive)', () => {
    expect(envContent.toLowerCase()).not.toMatch(/service_role/);
  });
});

// ---------------------------------------------------------------------------
// HB-13..17 — Seguridad: variables prohibidas
// ---------------------------------------------------------------------------
describe('HB-13..17 — Variables prohibidas en .env.example', () => {
  let envContent: string;

  beforeAll(() => {
    envContent = readFile(ENV_EXAMPLE);
  });

  const forbidden = [
    'VITE_SUPABASE_SERVICE_ROLE_KEY',
    'VITE_WEBCHAT_SERVICE_ROLE',
    'VITE_N8N_API_KEY',
    'VITE_WASENDER_API_KEY',
    'VITE_OPENAI_API_KEY',
  ];

  forbidden.forEach((v, i) => {
    it(`HB-${13 + i}: ${v} NO existe en .env.example`, () => {
      expect(envContent).not.toContain(v);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-18..24 — Archivos críticos de WebChat existen
// ---------------------------------------------------------------------------
describe('HB-18..24 — Archivos WebChat existen', () => {
  const files = [
    'utils/webchat-config.js',
    'utils/webchat-dedupe.js',
    'utils/webchat-errors.js',
    'utils/webchat-accessibility.js',
    'services/webchat-api.js',
    'services/webchat-storage.js',
    'services/webchat-realtime.js',
  ];

  files.forEach((f, i) => {
    it(`HB-${18 + i}: src/features/webchat/${f} existe`, () => {
      expect(fileExists(path.join(SRC_WEBCHAT, f))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-25..30 — Componentes WebChat existen
// ---------------------------------------------------------------------------
describe('HB-25..30 — Componentes WebChat existen', () => {
  const components = [
    'components/WebChatLauncher.jsx',
    'components/WebChatPanel.jsx',
    'components/WebChatMessageList.jsx',
    'components/WebChatMessageBubble.jsx',
    'components/WebChatComposer.jsx',
    'components/WebChatWidget.jsx',
  ];

  components.forEach((c, i) => {
    it(`HB-${25 + i}: src/features/webchat/${c} existe`, () => {
      expect(fileExists(path.join(SRC_WEBCHAT, c))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-31..36 — Hooks WebChat existen
// ---------------------------------------------------------------------------
describe('HB-31..36 — Hooks WebChat existen', () => {
  const hooks = [
    'hooks/useWebChat.js',
    'hooks/useWebChatSession.js',
    'hooks/useWebChatMessages.js',
    'hooks/useWebChatPolling.js',
    'hooks/useWebChatRealtime.js',
  ];

  hooks.forEach((h, i) => {
    it(`HB-${31 + i}: src/features/webchat/${h} existe`, () => {
      expect(fileExists(path.join(SRC_WEBCHAT, h))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-36..40 — Seguridad: archivos fuente no contienen service_role
// ---------------------------------------------------------------------------
describe('HB-36..40 — Sin service_role en código fuente WebChat', () => {
  const files = [
    'services/webchat-api.js',
    'services/webchat-storage.js',
    'hooks/useWebChat.js',
    'components/WebChatWidget.jsx',
    'utils/webchat-config.js',
  ];

  files.forEach((f, i) => {
    it(`HB-${36 + i}: ${f} no contiene "service_role"`, () => {
      const content = readFile(path.join(SRC_WEBCHAT, f));
      expect(content.toLowerCase()).not.toMatch(/service_role/);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-41..43 — Seguridad: sin dangerouslySetInnerHTML en WebChat
// ---------------------------------------------------------------------------
describe('HB-41..43 — Sin dangerouslySetInnerHTML en WebChat', () => {
  const components = [
    'components/WebChatMessageBubble.jsx',
    'components/WebChatPanel.jsx',
    'components/WebChatMessageList.jsx',
  ];

  components.forEach((c, i) => {
    it(`HB-${41 + i}: ${c} no usa dangerouslySetInnerHTML`, () => {
      const content = readFile(path.join(SRC_WEBCHAT, c));
      expect(content).not.toContain('dangerouslySetInnerHTML');
    });
  });
});

// ---------------------------------------------------------------------------
// HB-44..48 — Accesibilidad: ARIA roles en componentes
// ---------------------------------------------------------------------------
describe('HB-44..48 — ARIA roles en código fuente', () => {
  it('HB-44: WebChatPanel tiene role="dialog"', () => {
    const c = readFile(path.join(SRC_WEBCHAT, 'components/WebChatPanel.jsx'));
    expect(c).toMatch(/role=.dialog/);
  });

  it('HB-45: WebChatPanel tiene aria-modal', () => {
    const c = readFile(path.join(SRC_WEBCHAT, 'components/WebChatPanel.jsx'));
    expect(c).toMatch(/aria-modal/);
  });

  it('HB-46: WebChatMessageList tiene role="log"', () => {
    const c = readFile(path.join(SRC_WEBCHAT, 'components/WebChatMessageList.jsx'));
    expect(c).toMatch(/role=.log/);
  });

  it('HB-47: WebChatLauncher tiene aria-label', () => {
    const c = readFile(path.join(SRC_WEBCHAT, 'components/WebChatLauncher.jsx'));
    expect(c).toMatch(/aria-label/);
  });

  it('HB-48: WebChatLauncher tiene aria-expanded', () => {
    const c = readFile(path.join(SRC_WEBCHAT, 'components/WebChatLauncher.jsx'));
    expect(c).toMatch(/aria-expanded/);
  });
});

// ---------------------------------------------------------------------------
// HB-49..52 — Scripts npm existen en package.json
// ---------------------------------------------------------------------------
describe('HB-49..52 — Scripts npm de SC', () => {
  let pkg: Record<string, unknown>;

  beforeAll(() => {
    pkg = JSON.parse(readFile(PACKAGE_JSON));
  });

  const scripts = [
    'test:sc:webchat',
    'test:sc:webchat-realtime',
    'test:sc:hardening-baseline',
    'validate:sc:release-readiness',
  ];

  scripts.forEach((s, i) => {
    it(`HB-${49 + i}: script "${s}" existe en package.json`, () => {
      expect((pkg as { scripts: Record<string, string> }).scripts).toHaveProperty(s);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-53..56 — Suites de regresión SC existen
// ---------------------------------------------------------------------------
describe('HB-53..56 — Suites scaffold de regresión existen', () => {
  const suites = [
    'activity-log/activity-log.spec.ts',
    'conversation-routing/conversation-routing.spec.ts',
    'failure-recovery/failure-recovery.spec.ts',
    'identity-validation/identity-validation.spec.ts',
  ];

  const basePath = path.join(ROOT, 'tests/regression/smart-conversations/suites');

  suites.forEach((s, i) => {
    it(`HB-${53 + i}: suite ${s} existe`, () => {
      expect(fileExists(path.join(basePath, s))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-57..60 — it.todo count por suite (invariante)
// ---------------------------------------------------------------------------
describe('HB-57..60 — Conteo de it.todo por suite (no deben crecer ni decrecer)', () => {
  const basePath = path.join(ROOT, 'tests/regression/smart-conversations/suites');

  const expected: Record<string, number> = {
    'activity-log/activity-log.spec.ts': 17,
    'conversation-routing/conversation-routing.spec.ts': 19,
    'failure-recovery/failure-recovery.spec.ts': 33,
    'identity-validation/identity-validation.spec.ts': 24,
  };

  Object.entries(expected).forEach(([suite, count], i) => {
    it(`HB-${57 + i}: ${suite} tiene exactamente ${count} it.todo`, () => {
      const content = readFile(path.join(basePath, suite));
      const matches = content.match(/it\.todo/g);
      expect(matches?.length ?? 0).toBe(count);
    });
  });
});

// ---------------------------------------------------------------------------
// HB-61..62 — it.todo restantes (incidents-flow + permissions-and-privacy)
// ---------------------------------------------------------------------------
describe('HB-61..62 — it.todo suites restantes', () => {
  const basePath = path.join(ROOT, 'tests/regression/smart-conversations/suites');

  it('HB-61: incidents-flow.spec.ts tiene exactamente 22 it.todo', () => {
    const c = readFile(path.join(basePath, 'incidents-flow/incidents-flow.spec.ts'));
    expect(c.match(/it\.todo/g)?.length ?? 0).toBe(22);
  });

  it('HB-62: permissions-and-privacy.spec.ts tiene exactamente 31 it.todo', () => {
    const c = readFile(path.join(basePath, 'permissions-and-privacy/permissions-and-privacy.spec.ts'));
    expect(c.match(/it\.todo/g)?.length ?? 0).toBe(31);
  });
});

// ---------------------------------------------------------------------------
// HB-63..65 — V2Layout integra WebChat correctamente
// ---------------------------------------------------------------------------
describe('HB-63..65 — V2Layout integración', () => {
  const v2Layout = path.join(ROOT, 'src/layouts/V2Layout.jsx');

  it('HB-63: V2Layout.jsx existe', () => {
    expect(fileExists(v2Layout)).toBe(true);
  });

  it('HB-64: V2Layout importa getWebchatConfig', () => {
    const c = readFile(v2Layout);
    expect(c).toMatch(/getWebchatConfig/);
  });

  it('HB-65: V2Layout importa WebChatWidget', () => {
    const c = readFile(v2Layout);
    expect(c).toMatch(/WebChatWidget/);
  });
});

// ---------------------------------------------------------------------------
// HB-66..70 — validate-release-readiness.mjs existe y tiene estructura
// ---------------------------------------------------------------------------
describe('HB-66..70 — validate-release-readiness.mjs', () => {
  const script = path.join(ROOT, 'scripts/smart-conversations/validate-release-readiness.mjs');

  it('HB-66: validate-release-readiness.mjs existe', () => {
    expect(fileExists(script)).toBe(true);
  });

  it('HB-67: script contiene GATE_0 check', () => {
    const c = readFile(script);
    expect(c).toMatch(/GATE_0/);
  });

  it('HB-68: script verifica VITE_WEBCHAT_WIDGET_ENABLED', () => {
    const c = readFile(script);
    expect(c).toMatch(/VITE_WEBCHAT_WIDGET_ENABLED/);
  });

  it('HB-69: script verifica ausencia de service_role', () => {
    const c = readFile(script);
    expect(c).toMatch(/service_role/);
  });

  it('HB-70: script es ESM (usa import o export)', () => {
    const c = readFile(script);
    expect(c).toMatch(/^import |^export /m);
  });
});

// ---------------------------------------------------------------------------
// HB-71..80 — Risk Register: invariantes de tabla canónica
// ---------------------------------------------------------------------------
describe('HB-71..80 — Risk Register: invariantes canónicos', () => {
  const rr = path.join(HARDENING_DIR, 'risk-register.md');

  it('HB-71: risk-register.md existe', () => {
    expect(fileExists(rr)).toBe(true);
  });

  it('HB-72: contiene exactamente 26 risk_id (R-01..R-26)', () => {
    const c = readFile(rr);
    const matches = c.match(/\| R-\d{2} \|/g) ?? [];
    // Tabla canónica tiene cada R-ID 2 veces (tabla principal + tabla severidad/estado)
    const unique = new Set(matches.map(m => m.trim()));
    expect(unique.size).toBe(26);
  });

  it('HB-73: CRITICAL count = 6 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/CRITICAL\s*\|\s*6/);
  });

  it('HB-74: HIGH count = 6 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/HIGH\s*\|\s*6/);
  });

  it('HB-75: MEDIUM count = 8 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/MEDIUM\s*\|\s*8/);
  });

  it('HB-76: LOW count = 6 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/LOW\s*\|\s*6/);
  });

  it('HB-77: OPEN count = 17 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/OPEN\s*\|\s*17/);
  });

  it('HB-78: MITIGATED count = 4 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/MITIGATED\s*\|\s*4/);
  });

  it('HB-79: CLOSED count = 4 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/CLOSED\s*\|\s*4/);
  });

  it('HB-80: ACCEPTED count = 1 en resumen', () => {
    const c = readFile(rr);
    expect(c).toMatch(/ACCEPTED\s*\|\s*1/);
  });
});

// ---------------------------------------------------------------------------
// HB-81..87 — Historical Test Debt: métricas exactas
// ---------------------------------------------------------------------------
describe('HB-81..87 — Historical Test Debt: métricas canónicas', () => {
  const htd = path.join(HARDENING_DIR, 'historical-test-debt.md');

  it('HB-81: historical-test-debt.md existe', () => {
    expect(fileExists(htd)).toBe(true);
  });

  it('HB-82: documenta 7 archivos afectados', () => {
    const c = readFile(htd);
    expect(c).toMatch(/Archivos afectados\s*\|\s*7/);
  });

  it('HB-83: documenta 10 casos individuales fallando', () => {
    const c = readFile(htd);
    expect(c).toMatch(/Casos de test individuales fallando[^\|]*\|\s*10/);
  });

  it('HB-84: documenta 5 archivos con fallo de nivel archivo', () => {
    const c = readFile(htd);
    expect(c).toMatch(/Archivos con fallo de nivel archivo[^\|]*\|\s*5/);
  });

  it('HB-85: contiene debt_id D-01 y D-10', () => {
    const c = readFile(htd);
    expect(c).toMatch(/D-01/);
    expect(c).toMatch(/D-10/);
  });

  it('HB-86: contiene debt_id D-F01 y D-F05', () => {
    const c = readFile(htd);
    expect(c).toMatch(/D-F01/);
    expect(c).toMatch(/D-F05/);
  });

  it('HB-87: tiene 3 clasificaciones: product_defect, obsolete_test, environment_dependent', () => {
    const c = readFile(htd);
    expect(c).toMatch(/product_defect/);
    expect(c).toMatch(/obsolete_test/);
    expect(c).toMatch(/environment_dependent/);
  });
});

// ---------------------------------------------------------------------------
// HB-88..97 — GATE_0: estado canónico PASS_WITH_WARNINGS
// ---------------------------------------------------------------------------
describe('HB-88..97 — GATE_0: estado canónico PASS_WITH_WARNINGS', () => {
  const gateReport = path.join(HARDENING_DIR, 'gate-0-report.md');
  const releaseGates = path.join(HARDENING_DIR, 'release-gates.md');
  const riskReg = path.join(HARDENING_DIR, 'risk-register.md');
  const testBase = path.join(HARDENING_DIR, 'test-baseline.md');

  it('HB-88: gate-0-report.md contiene PASS_WITH_WARNINGS', () => {
    const c = readFile(gateReport);
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });

  it('HB-89: gate-0-report.md NO contiene "GATE_0: APROBADO" como estado final', () => {
    const c = readFile(gateReport);
    // "APROBADO" no debe aparecer como estado oficial del gate
    expect(c).not.toMatch(/\*\*Estado:.*APROBADO\*\*/);
    expect(c).not.toMatch(/GATE_0.*APROBADO[^S]/);
  });

  it('HB-90: release-gates.md contiene PASS_WITH_WARNINGS', () => {
    const c = readFile(releaseGates);
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });

  it('HB-91: release-gates.md NO contiene "✅ APROBADO" para GATE_0', () => {
    const c = readFile(releaseGates);
    expect(c).not.toMatch(/GATE_0.*✅.*APROBADO/);
  });

  it('HB-92: risk-register.md contiene PASS_WITH_WARNINGS', () => {
    const c = readFile(riskReg);
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });

  it('HB-93: test-baseline.md contiene PASS_WITH_WARNINGS', () => {
    const c = readFile(testBase);
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });

  it('HB-94: gate-0-report.md distingue validador PASS vs gate PASS_WITH_WARNINGS', () => {
    const c = readFile(gateReport);
    expect(c).toMatch(/54\/54/);
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });

  it('HB-95: gate-0-report.md menciona deuda histórica', () => {
    const c = readFile(gateReport);
    expect(c).toMatch(/deuda hist[oó]rica|historical.test.debt/i);
  });

  it('HB-96: gate-0-report.md menciona riesgos abiertos', () => {
    const c = readFile(gateReport);
    expect(c).toMatch(/R-01|R-06|OPEN/);
  });

  it('HB-97: historical-test-debt.md contiene PASS_WITH_WARNINGS', () => {
    const htd = path.join(HARDENING_DIR, 'historical-test-debt.md');
    const c = readFile(htd);
    expect(c).toMatch(/PASS_WITH_WARNINGS/);
  });
});

// ---------------------------------------------------------------------------
// HB-98..110 — CI: job sc-hardening-baseline en pr-checks.yml
// ---------------------------------------------------------------------------
describe('HB-98..110 — CI: job sc-hardening-baseline', () => {
  const ciFile = path.join(ROOT, '.github/workflows/pr-checks.yml');

  it('HB-98: pr-checks.yml existe', () => {
    expect(fileExists(ciFile)).toBe(true);
  });

  it('HB-99: contiene job sc-hardening-baseline', () => {
    const c = readFile(ciFile);
    expect(c).toMatch(/sc-hardening-baseline:/);
  });

  it('HB-100: job sc-hardening-baseline NO tiene continue-on-error', () => {
    const c = readFile(ciFile);
    // Extraer sección del job y verificar que no tiene continue-on-error
    const jobSection = c.substring(c.indexOf('sc-hardening-baseline:'));
    const nextJobIdx = jobSection.indexOf('\n  pr-summary:');
    const section = nextJobIdx > 0 ? jobSection.substring(0, nextJobIdx) : jobSection;
    expect(section).not.toMatch(/continue-on-error:\s*true/);
  });

  it('HB-101: job sc-hardening-baseline ejecuta test:sc:hardening-baseline', () => {
    const c = readFile(ciFile);
    expect(c).toMatch(/test:sc:hardening-baseline/);
  });

  it('HB-102: job sc-hardening-baseline ejecuta validate:sc:release-readiness', () => {
    const c = readFile(ciFile);
    expect(c).toMatch(/validate:sc:release-readiness/);
  });

  it('HB-103: job sc-hardening-baseline ejecuta test:sc:regression', () => {
    const c = readFile(ciFile);
    expect(c).toMatch(/test:sc:regression/);
  });

  it('HB-104: job sc-hardening-baseline ejecuta test:webchat', () => {
    const c = readFile(ciFile);
    expect(c).toMatch(/test:webchat/);
  });

  it('HB-105: job sc-hardening-baseline usa actions/checkout@v4', () => {
    const c = readFile(ciFile);
    const jobSection = c.substring(c.indexOf('sc-hardening-baseline:'));
    expect(jobSection).toMatch(/actions\/checkout@v4/);
  });

  it('HB-106: job sc-hardening-baseline usa actions/setup-node@v4', () => {
    const c = readFile(ciFile);
    const jobSection = c.substring(c.indexOf('sc-hardening-baseline:'));
    expect(jobSection).toMatch(/actions\/setup-node@v4/);
  });

  it('HB-107: job sc-hardening-baseline ejecuta npm ci', () => {
    const c = readFile(ciFile);
    const jobSection = c.substring(c.indexOf('sc-hardening-baseline:'));
    expect(jobSection).toMatch(/npm ci/);
  });

  it('HB-108: pr-summary depende de sc-hardening-baseline', () => {
    const c = readFile(ciFile);
    const summarySection = c.substring(c.indexOf('pr-summary:'));
    expect(summarySection).toMatch(/sc-hardening-baseline/);
  });

  it('HB-109: job NO referencia secrets de Supabase', () => {
    const c = readFile(ciFile);
    const jobSection = c.substring(c.indexOf('sc-hardening-baseline:'));
    const nextJobIdx = jobSection.indexOf('\n  pr-summary:');
    const section = nextJobIdx > 0 ? jobSection.substring(0, nextJobIdx) : jobSection;
    expect(section).not.toMatch(/SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE/);
  });

  it('HB-110: job usa ubuntu-latest como runner', () => {
    const c = readFile(ciFile);
    const jobSection = c.substring(c.indexOf('sc-hardening-baseline:'));
    const nextJobIdx = jobSection.indexOf('\n  pr-summary:');
    const section = nextJobIdx > 0 ? jobSection.substring(0, nextJobIdx) : jobSection;
    expect(section).toMatch(/ubuntu-latest/);
  });
});
