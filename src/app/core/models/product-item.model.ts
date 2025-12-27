import { PageFilter } from "./common.model";

// Các giá trị union type cho ExpirationType
export type ExpirationType = 'NONE' | 'HOURS_3' | 'HOURS_6' | 'MONTH_1' | 'MONTH_6';

export interface ProductItem {
  id: number;
  productId: number;
  accountData: string;     // mail|pass|recovery
  sold: boolean;
  buyerId?: number;
  buyerName?: string;
  orderId?: number;
  soldAt?: string;
  // Expiration info (per item)
  createdAt?: string;
  expirationType?: ExpirationType;  // Loại: NONE, HOURS_3, HOURS_6, MONTH_1, MONTH_6
  expirationLabel?: string;         // Label hiển thị: "3 giờ", "6 giờ", "1 tháng", "6 tháng", "Không hết hạn"
  expiresAt?: string;               // Thời điểm hết hạn (null = không hết hạn)
  expired?: boolean;
  expiredAt?: string;
}
export interface ProductItemCreate {
  productId: number;
  accountData: string;
  expirationHours?: number; // 0 = không hết hạn, 3 = 3h, 6 = 6h, 720 = 1 tháng, 4320 = 6 tháng
}

export interface ProductItemFilter extends PageFilter {
  productId?: number;
  sold?: boolean | string;
  accountData?: string;
  expirationType?: ExpirationType; // Filter theo loại hết hạn
}
