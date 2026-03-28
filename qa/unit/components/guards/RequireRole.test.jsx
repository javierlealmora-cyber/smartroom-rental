// qa/unit/components/guards/RequireRole.test.jsx
// Tests del guard RequireRole (AUTH-05)

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireRole from '../../../../src/router/RequireRole.jsx';

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

function renderWithRole(allow) {
  return render(
    <MemoryRouter initialEntries={['/panel']}>
      <Routes>
        <Route element={<RequireRole allow={allow} />}>
          <Route path="/panel" element={<div>Panel</div>} />
        </Route>
        <Route path="/v2/auth/login"         element={<div>Login Comercial</div>} />
        <Route path="/v2/admin/auth/login"   element={<div>Login Admin</div>} />
        <Route path="/v2/lodger/auth/login"  element={<div>Login Lodger</div>} />
      </Routes>
    </MemoryRouter>
  );
}

function auth(role, overrides = {}) {
  return {
    user: { id: 'u-1' },
    profile: role ? { id: 'u-1', role } : null,
    loading: false,
    profileLoading: false,
    ...overrides,
  };
}

// ── AUTH-05 ───────────────────────────────────────────────────────────────────

describe('RequireRole', () => {
  it('loading=true → muestra "Cargando..."', () => {
    useAuth.mockReturnValue(auth('admin', { loading: true }));
    renderWithRole(['admin']);
    expect(screen.getByText('Cargando...')).toBeTruthy();
  });

  it('profileLoading=true → muestra "Cargando..."', () => {
    useAuth.mockReturnValue(auth('admin', { profileLoading: true }));
    renderWithRole(['admin']);
    expect(screen.getByText('Cargando...')).toBeTruthy();
  });

  it('rol permitido → renderiza Outlet', () => {
    useAuth.mockReturnValue(auth('admin'));
    renderWithRole(['admin']);
    expect(screen.getByText('Panel')).toBeTruthy();
  });

  it('rol no permitido (admin en portal lodger) → redirige a Login Lodger', () => {
    useAuth.mockReturnValue(auth('admin'));
    renderWithRole(['lodger']);
    expect(screen.getByText('Login Lodger')).toBeTruthy();
  });

  it('rol no permitido (lodger en portal admin) → redirige a Login Admin', () => {
    useAuth.mockReturnValue(auth('lodger'));
    renderWithRole(['admin']);
    expect(screen.getByText('Login Admin')).toBeTruthy();
  });

  it('sin perfil (user presente, profile=null) → muestra aviso de perfil', () => {
    useAuth.mockReturnValue({ user: { id: 'u-1' }, profile: null, loading: false, profileLoading: false });
    renderWithRole(['admin']);
    expect(screen.getByText(/no se ha podido cargar tu perfil/i)).toBeTruthy();
  });

  it('sin sesión ni perfil → redirige según allow (admin)', () => {
    useAuth.mockReturnValue({ user: null, profile: null, loading: false, profileLoading: false });
    renderWithRole(['admin']);
    expect(screen.getByText('Login Admin')).toBeTruthy();
  });

  it('sin sesión ni perfil → redirige según allow (lodger)', () => {
    useAuth.mockReturnValue({ user: null, profile: null, loading: false, profileLoading: false });
    renderWithRole(['lodger']);
    expect(screen.getByText('Login Lodger')).toBeTruthy();
  });
});
