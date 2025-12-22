import { PageFilter } from "./common.model";

export interface TransactionResponse {
  id: number;
  transactionCode: string;
  userId: number;
  userEmail?: string;
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
  email?: string;        // Tìm theo email user
  userId?: number;
  status?: number;       // 0=PENDING, 2=SUCCESS, 3=FAILED
  type?: number;         // 0=DEPOSIT, 1=PURCHASE, 2=REFUND, 3=ADMIN_ADJUST
  minAmount?: number;
  maxAmount?: number;
  dateFrom?: string;     // ISO date
  dateTo?: string;       // ISO date
}
