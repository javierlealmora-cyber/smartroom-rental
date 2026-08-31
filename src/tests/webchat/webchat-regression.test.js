import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT    = resolve(__dirname, '../../../');
const srcDir  = resolve(ROOT, 'src/features/webchat');
const docsDir = resolve(ROOT, 'docs/smart-conversations/webchat-widget');

function src(rel)  { return readFileSync(resolve(srcDir, rel), 'utf-8'); }
function exists(p) { return existsSync(p); }

describe('WebChat Regression', () => {
  it('103. webchat-config.js existe en utils/', () => {
    expect(exists(resolve(srcDir, 'utils/webchat-config.js'))).toBe(true);
  });

  it('104. webchat-api.js existe en services/', () => {
    expect(exists(resolve(srcDir, 'services/webchat-api.js'))).toBe(true);
  });

  it('105. webchat-storage.js existe en services/', () => {
    expect(exists(resolve(srcDir, 'services/webchat-storage.js'))).toBe(true);
  });

  it('106. webchat-dedupe.js existe en utils/', () => {
    expect(exists(resolve(srcDir, 'utils/webchat-dedupe.js'))).toBe(true);
  });

  it('107. webchat-errors.js existe en utils/', () => {
    expect(exists(resolve(srcDir, 'utils/webchat-errors.js'))).toBe(true);
  });

  it('108. useWebChat.js existe en hooks/', () => {
    expect(exists(resolve(srcDir, 'hooks/useWebChat.js'))).toBe(true);
  });

  it('109. WebChatPanel.jsx existe en components/', () => {
    expect(exists(resolve(srcDir, 'components/WebChatPanel.jsx'))).toBe(true);
  });

  it('110. WebChatErrorBoundary.jsx existe en components/', () => {
    expect(exists(resolve(srcDir, 'components/WebChatErrorBoundary.jsx'))).toBe(true);
  });

  it('111. README.md de docs existe', () => {
    expect(exists(resolve(docsDir, 'README.md'))).toBe(true);
  });

  it('112. integration-guide.md de docs existe', () => {
    expect(exists(resolve(docsDir, 'integration-guide.md'))).toBe(true);
  });

  it('113. security.md de docs existe', () => {
    expect(exists(resolve(docsDir, 'security.md'))).toBe(true);
  });

  it('114. accessibility.md de docs existe', () => {
    expect(exists(resolve(docsDir, 'accessibility.md'))).toBe(true);
  });

  it('115. webchat-config.js no importa supabaseClient directamente', () => {
    expect(src('utils/webchat-config.js')).not.toContain('supabaseClient');
  });

  it('116. webchat-api.js usa fetch nativo, no supabaseClient', () => {
    const s = src('services/webchat-api.js');
    expect(s).toContain('fetch(');
    expect(s).not.toContain('supabaseClient');
  });

  it('117. index.js no re-exporta servicios internos (saveSession, etc.)', () => {
    const s = src('index.js');
    expect(s).not.toContain('saveSession');
    expect(s).not.toContain('loadSession');
  });
});
