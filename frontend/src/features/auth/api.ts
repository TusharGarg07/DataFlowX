import { http } from '../../shared/api/http';
import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from './types';

export async function login(body: LoginRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>('/auth/login', body);
}

export async function register(body: RegisterRequest): Promise<AuthResponse> {
  return http.post<AuthResponse>('/auth/register', body);
}

export async function getCurrentUser(): Promise<UserResponse> {
  return http.get<UserResponse>('/auth/me');
}
