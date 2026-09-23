import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from '../AppShell/AppShell';
import * as AuthProviderModule from '../../features/auth/AuthProvider';

vi.mock('../../features/auth/AuthProvider', async () => {
  const actual = await vi.importActual<typeof AuthProviderModule>('../../features/auth/AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('AppShell', () => {
  it('renders sidebar brand, nav links, and user info for USER role', () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 1, username: 'johndoe', email: 'john@example.com', role: 'USER' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/datasets']}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="datasets" element={<div>Datasets View</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getAllByText('DataFlowX').length).toBeGreaterThan(0);
    expect(screen.getByText('Datasets View')).toBeInTheDocument();
    expect(screen.getAllByText('johndoe').length).toBeGreaterThan(0);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument(); // Dashboard nav item hidden for USER
  });

  it('renders Dashboard nav link for ADMIN role', () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'authenticated',
      user: { id: 2, username: 'adminuser', email: 'admin@example.com', role: 'ADMIN' },
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="dashboard" element={<div>Dashboard View</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});
