import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from '../pages/LoginPage';
import * as AuthProviderModule from '../AuthProvider';
import { ApiError } from '../../../shared/api/ApiError';

vi.mock('../AuthProvider', async () => {
  const actual = await vi.importActual<typeof AuthProviderModule>('../AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('LoginPage', () => {
  it('renders login form elements correctly', () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'anonymous',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('displays field validation errors when submitted empty', async () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'anonymous',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('displays 401 error message when credentials are bad', async () => {
    const mockLogin = vi.fn().mockRejectedValue(new ApiError(401, 'Unauthorized', 'UNAUTHORIZED'));
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'anonymous',
      user: null,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });
});
