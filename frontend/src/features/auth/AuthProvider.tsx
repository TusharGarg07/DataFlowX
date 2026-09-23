import React, { useEffect, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setTokenGetter, setUnauthorizedHandler } from '../../shared/api/http';
import { getCurrentUser, login as loginApi, register as registerApi } from './api';
import { tokenStorage } from './tokenStorage';
import type { LoginRequest, RegisterRequest, UserResponse } from './types';
import { AuthContext, type AuthStatus } from './AuthContext';

// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState<string | null>(() => tokenStorage.getToken());

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    tokenStorage.clearToken();
    setTokenState(null);
  }, [queryClient]);

  useEffect(() => {
    setTokenGetter(() => tokenStorage.getToken());
    setUnauthorizedHandler(() => {
      void logout();
    });
  }, [logout]);

  const login = useCallback(
    async (credentials: LoginRequest): Promise<UserResponse> => {
      const authResp = await loginApi(credentials);
      tokenStorage.setToken(authResp.token);
      setTokenState(authResp.token);
      const userResp = await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: getCurrentUser,
      });
      return userResp;
    },
    [queryClient]
  );

  const register = useCallback(
    async (credentials: RegisterRequest): Promise<UserResponse> => {
      const authResp = await registerApi(credentials);
      tokenStorage.setToken(authResp.token);
      setTokenState(authResp.token);
      const userResp = await queryClient.fetchQuery({
        queryKey: ['auth', 'me'],
        queryFn: getCurrentUser,
      });
      return userResp;
    },
    [queryClient]
  );

  let status: AuthStatus = 'anonymous';
  let user: UserResponse | null = null;

  if (token) {
    if (meQuery.isLoading) {
      status = 'loading';
    } else if (meQuery.isSuccess && meQuery.data) {
      status = 'authenticated';
      user = meQuery.data;
    } else {
      status = 'anonymous';
      user = null;
    }
  } else {
    status = 'anonymous';
    user = null;
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
