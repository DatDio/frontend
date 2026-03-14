import { PageFilter } from './common.model';

export type ExpirationType =
  | 'NONE'
  | 'HOURS_1'
  | 'HOURS_2'
  | 'HOURS_3'
  | 'HOURS_6'
  | 'MONTH_1'
  | 'MONTH_2'
  | 'MONTH_6';

export interface ExpirationTypeOption {
  value: ExpirationType;
  label: string;
}

export const EXPIRATION_TYPE_OPTIONS: readonly ExpirationTypeOption[] = [
  { value: 'NONE', label: 'Không hết hạn' },
  { value: 'HOURS_1', label: '1 giờ' },
  { value: 'HOURS_2', label: '2 giờ' },
  { value: 'HOURS_3', label: '3 giờ' },
  { value: 'HOURS_6', label: '6 giờ' },
  { value: 'MONTH_1', label: '1 tháng' },
  { value: 'MONTH_2', label: '2 tháng' },
  { value: 'MONTH_6', label: '6 tháng' }
];

export const HOUR_EXPIRATION_TYPES: readonly ExpirationType[] = [
  'HOURS_1',
  'HOURS_2',
  'HOURS_3',
  'HOURS_6'
];

export const MONTH_EXPIRATION_TYPES: readonly ExpirationType[] = [
  'MONTH_1',
  'MONTH_2',
  'MONTH_6'
];

export interface ProductItem {
  id: number;
  productId: number;
  accountData: string;
  sold: boolean;
  buyerId?: number;
  buyerName?: string;
  orderId?: number;
  soldAt?: string;
  createdAt?: string;
  expirationType?: ExpirationType;
  expirationLabel?: string;
  expiresAt?: string;
  expired?: boolean;
  expiredAt?: string;
  isTimeExpired?: boolean;
  serverTime?: string;
}

export interface ProductItemCreate {
  productId: number;
  accountData: string;
  expirationHours?: number;
}

export interface ProductItemFilter extends PageFilter {
  productId?: number;
  sold?: boolean | string;
  accountData?: string;
  expirationType?: ExpirationType;
}
