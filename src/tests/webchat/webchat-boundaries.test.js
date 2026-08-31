import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../../');
const srcDir = resolve(ROOT, 'src/features/webchat');

function src(rel) { return readFileSync(resolve(srcDir, rel), 'utf-8'); }

describe('WebChat Boundaries', () => {
  it('96. index.js exporta WebChatLauncher', () => {
    expect(src('index.js')).toContain('WebChatLauncher');
  });

  it('97. index.js exporta WebChatPanel', () => {
    expect(src('index.js')).toContain('WebChatPanel');
  });

  it('98. index.js exporta useWebChat', () => {
    expect(src('index.js')).toContain('useWebChat');
  });

  it('99. index.js exporta WebChatErrorBoundary', () => {
    expect(src('index.js')).toContain('WebChatErrorBoundary');
  });

  it('100. WebChatErrorBoundary extiende React.Component', () => {
    expect(src('components/WebChatErrorBoundary.jsx')).toContain('React.Component');
  });

  it('101. WebChatErrorBoundary implementa getDerivedStateFromError', () => {
    expect(src('components/WebChatErrorBoundary.jsx')).toContain('getDerivedStateFromError');
  });

  it('102. WebChatErrorBoundary tiene fallback prop de tipo texto', () => {
    expect(src('components/WebChatErrorBoundary.jsx')).toContain('fallback');
  });
});
