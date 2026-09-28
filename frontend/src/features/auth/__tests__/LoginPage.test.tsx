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
  it('renders login form elements correctly and omits non-functional controls', () => {
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
    const emailInput = screen.getByLabelText(/Email address/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-required', 'true');
    expect(passwordInput).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();

    // Verify non-functional dead controls are honestly removed
    expect(screen.queryByText(/Remember me/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Forgot password/i)).not.toBeInTheDocument();
  });

  it('displays field validation errors with accessible aria attributes when submitted empty', async () => {
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

    const emailError = await screen.findByText('Email is required');
    expect(emailError).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Email address/i)).toHaveAttribute('aria-describedby', 'email-error');

    const passwordError = await screen.findByText('Password is required');
    expect(passwordError).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Password/i)).toHaveAttribute('aria-describedby', 'password-error');
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
