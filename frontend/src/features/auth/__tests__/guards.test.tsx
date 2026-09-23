import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth, RequireRole } from '../guards';
import * as AuthProviderModule from '../AuthProvider';

vi.mock('../AuthProvider', async () => {
  const actual = await vi.importActual<typeof AuthProviderModule>('../AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('Auth Guards', () => {
  describe('RequireAuth', () => {
    it('renders loading state when auth status is loading', () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
        status: 'loading',
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/protected" element={<RequireAuth><div>Protected Content</div></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText(/Authenticating session/i)).toBeInTheDocument();
    });

    it('redirects anonymous users to /login', () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
        status: 'anonymous',
        user: null,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page Target</div>} />
            <Route path="/protected" element={<RequireAuth><div>Protected Content</div></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Login Page Target')).toBeInTheDocument();
    });

    it('renders protected content when authenticated', () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
        status: 'authenticated',
        user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'USER' },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/protected" element={<RequireAuth><div>Protected Content</div></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('RequireRole', () => {
    it('renders forbidden view when user does not have required role', () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
        status: 'authenticated',
        user: { id: 1, username: 'normaluser', email: 'user@example.com', role: 'USER' },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/admin-only']}>
          <Routes>
            <Route path="/admin-only" element={<RequireRole role="ADMIN"><div>Admin Panel</div></RequireRole>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Access Restricted')).toBeInTheDocument();
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });

    it('renders children when user possesses required role', () => {
      vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
        status: 'authenticated',
        user: { id: 2, username: 'adminuser', email: 'admin@example.com', role: 'ADMIN' },
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      });

      render(
        <MemoryRouter initialEntries={['/admin-only']}>
          <Routes>
            <Route path="/admin-only" element={<RequireRole role="ADMIN"><div>Admin Panel</div></RequireRole>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });
  });
});
