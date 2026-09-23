import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from '../pages/RegisterPage';
import * as AuthProviderModule from '../AuthProvider';
import { ApiError } from '../../../shared/api/ApiError';

vi.mock('../AuthProvider', async () => {
  const actual = await vi.importActual<typeof AuthProviderModule>('../AuthProvider');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('RegisterPage', () => {
  it('renders register form elements correctly', () => {
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'anonymous',
      user: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Create an account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Register/i })).toBeInTheDocument();
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
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    expect(await screen.findByText('Username is required')).toBeInTheDocument();
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('displays 409 duplicate email error message', async () => {
    const mockRegister = vi.fn().mockRejectedValue(new ApiError(409, 'Conflict', 'DUPLICATE_EMAIL'));
    vi.mocked(AuthProviderModule.useAuth).mockReturnValue({
      status: 'anonymous',
      user: null,
      login: vi.fn(),
      register: mockRegister,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'existinguser' } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /Register/i }));

    await waitFor(() => {
      expect(screen.getByText('An account with this email already exists.')).toBeInTheDocument();
    });
  });
});
