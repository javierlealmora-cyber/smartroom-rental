import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../');

function src(rel) {
  return readFileSync(resolve(ROOT, 'src/features/webchat', rel), 'utf-8');
}

describe('WebChat Security', () => {
  it('82. webchat-config.js no lee VITE_SUPABASE_SERVICE_ROLE_KEY', () => {
    expect(src('utils/webchat-config.js')).not.toContain('SERVICE_ROLE');
  });

  it('83. webchat-config.js no lee VITE_SUPABASE_SECRET ni signing secret', () => {
    const s = src('utils/webchat-config.js');
    expect(s).not.toMatch(/SECRET|SIGNING/i);
  });

  it('84. webchat-api.js no usa service_role en headers', () => {
    expect(src('services/webchat-api.js')).not.toContain('service_role');
  });

  it('85. webchat-api.js Authorization usa Bearer, no apikey', () => {
    const s = src('services/webchat-api.js');
    if (s.includes('Authorization')) {
      expect(s).toContain('Bearer');
      expect(s).not.toContain('apikey');
    }
  });

  it('86. webchat-storage.js no almacena service_role', () => {
    expect(src('services/webchat-storage.js')).not.toContain('service_role');
  });

  it('87. webchat-storage.js no almacena profile_id ni identity_data', () => {
    const s = src('services/webchat-storage.js');
    expect(s).not.toContain('profile_id');
    expect(s).not.toContain('identity_data');
  });

  it('88. ningún componente usa dangerouslySetInnerHTML', () => {
    const components = [
      'components/WebChatLauncher.jsx',
      'components/WebChatPanel.jsx',
      'components/WebChatHeader.jsx',
      'components/WebChatMessageList.jsx',
      'components/WebChatMessageBubble.jsx',
      'components/WebChatComposer.jsx',
      'components/WebChatStatus.jsx',
      'components/WebChatErrorBoundary.jsx',
    ];
    for (const c of components) {
      expect(src(c)).not.toContain('dangerouslySetInnerHTML');
    }
  });

  it('89. WebChatMessageBubble no usa innerHTML', () => {
    expect(src('components/WebChatMessageBubble.jsx')).not.toContain('innerHTML');
  });

  it('90. webchat-errors.js SAFE_MESSAGES no expone stack traces', () => {
    const s = src('utils/webchat-errors.js');
    expect(s).not.toMatch(/err\.stack|error\.stack/);
  });

  it('91. webchat-config.js no incluye clave privada ni token de firma', () => {
    const s = src('utils/webchat-config.js');
    expect(s).not.toMatch(/private.key|signing.secret|jwt.secret/i);
  });

  it('92. webchat-api.js no incluye wasender ni conv-send-wa', () => {
    const s = src('services/webchat-api.js');
    expect(s).not.toMatch(/wasender|conv-send-wa/i);
  });

  it('93. webchat-api.js no llama directamente a conv-ingest (solo web-message)', () => {
    const s = src('services/webchat-api.js');
    expect(s).not.toContain('conv-ingest');
  });

  it('94. webchat-realtime.js no contiene service_role', () => {
    expect(src('services/webchat-realtime.js')).not.toContain('service_role');
  });

  it('95. webchat-storage.js no almacena message_text en sessionStorage', () => {
    const s = src('services/webchat-storage.js');
    expect(s).not.toContain('message_text');
  });
});
