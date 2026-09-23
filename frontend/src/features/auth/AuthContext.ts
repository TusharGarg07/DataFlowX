import { createContext, useContext } from 'react';
import type { UserResponse } from './types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserResponse | null;
  login: (credentials: { email: string; password: string }) => Promise<UserResponse>;
  register: (credentials: { username: string; email: string; password: string }) => Promise<UserResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
