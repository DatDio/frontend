import { PageFilter } from "./common.model";

export interface TransactionResponse {
  id: number;
  transactionCode: string;
  userId: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  description: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: string;   // ISO datetime
  completedAt: string; // ISO datetime
}
export interface TransactionFilter extends PageFilter {
  transactionCode?: string;
  userId?: number;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
}