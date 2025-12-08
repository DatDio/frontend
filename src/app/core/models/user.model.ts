import { PageFilter } from "./common.model";
import { UserRankInfo } from "./rank.model";

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

  createdAt: string;
  updatedAt: string;

  balance?: number;
  totalDeposit?: number;
  totalSpent?: number;

  rank?: UserRankInfo;
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
