export type UserRole = 'USER' | 'ADMIN';

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}
