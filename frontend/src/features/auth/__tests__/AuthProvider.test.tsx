import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../AuthProvider';
import { tokenStorage } from '../tokenStorage';
import * as authApi from '../api';

vi.mock('../api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  getCurrentUser: vi.fn(),
}));

function TestConsumer() {
  const { status, user, logout } = useAuth();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="username">{user?.username || 'none'}</div>
      <div data-testid="role">{user?.role || 'none'}</div>
      <button onClick={() => void logout()}>Logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    sessionStorage.clear();
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('starts in anonymous status when no token is present', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('anonymous');
    expect(screen.getByTestId('username').textContent).toBe('none');
  });

  it('loads user via getCurrentUser when token exists in storage', async () => {
    tokenStorage.setToken('existing-jwt-token');
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: 7,
      username: 'spikeuser',
      email: 'spikeuser@example.com',
      role: 'USER',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('status').textContent).toBe('loading');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated');
      expect(screen.getByTestId('username').textContent).toBe('spikeuser');
      expect(screen.getByTestId('role').textContent).toBe('USER');
    });
  });

  it('clears token and query cache on logout', async () => {
    tokenStorage.setToken('valid-token');
    vi.mocked(authApi.getCurrentUser).mockResolvedValue({
      id: 7,
      username: 'spikeuser',
      email: 'spikeuser@example.com',
      role: 'USER',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('authenticated');
    });

    const logoutButton = screen.getByText('Logout');
    await act(async () => {
      logoutButton.click();
    });

    expect(tokenStorage.getToken()).toBeNull();
    expect(screen.getByTestId('status').textContent).toBe('anonymous');
    expect(screen.getByTestId('username').textContent).toBe('none');
  });
});
