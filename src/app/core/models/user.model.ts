import { PageFilter } from "./common.model";

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;

  authProvider?: string | null;
  emailVerified: boolean;

  roles: string[];
  status: number;

  createdAt: string; // hoặc Date nếu bạn map sang Date
  updatedAt: string; // hoặc Date

  balance?: number; // Wallet balance
  totalDeposit?: number; // Total deposited amount
  totalSpent?: number; // Total spent amount
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  password: string;
  phone?: string;
  address?: string;
  roles: string[];
  status?: string;
}

export interface UpdateUserRequest {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  address?: string;
  roles?: string[];
  status: number;
}

export interface UserFilter extends PageFilter {
  email?: string;
  username?: string;
  role?: string;
  status?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  fullName: string;
  password: string;
}
