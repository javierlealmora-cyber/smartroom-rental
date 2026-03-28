// qa/unit/components/guards/RequireAuth.test.jsx
// Tests del guard RequireAuth (AUTH-04)

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAuth from '../../../../src/router/RequireAuth.jsx';

// Mock de useAuth
vi.mock('../../../../src/providers/AuthProvider', () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from '../../../../src/providers/AuthProvider';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderGuard(loginPath) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route element={<RequireAuth loginPath={loginPath} />}>
          <Route path="/protected" element={<div>Contenido protegido</div>} />
        </Route>
        <Route path="/v2/auth/login" element={<div>Login Comercial</div>} />
        <Route path="/v2/admin/auth/login" element={<div>Login Admin</div>} />
        <Route path="/v2/lodger/auth/login" element={<div>Login Lodger</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// ── AUTH-04 ───────────────────────────────────────────────────────────────────

describe('RequireAuth', () => {
  it('loading=true → muestra "Cargando..."', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderGuard();
    expect(screen.getByText('Cargando...')).toBeTruthy();
  });

  it('sin sesión → redirige al loginPath por defecto', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderGuard('/v2/auth/login');
    expect(screen.getByText('Login Comercial')).toBeTruthy();
  });

  it('sin sesión + loginPath=/v2/admin/auth/login → redirige a Login Admin', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderGuard('/v2/admin/auth/login');
    expect(screen.getByText('Login Admin')).toBeTruthy();
  });

  it('con sesión → renderiza el Outlet (contenido protegido)', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1' }, loading: false });
    renderGuard();
    expect(screen.getByText('Contenido protegido')).toBeTruthy();
  });
});
