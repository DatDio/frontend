import { PageFilter } from "./common.model";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  liveTime?: string;
  country?: string;
  imageUrl?: string;
  categoryId: number;
  categoryName: string;
  status: number;
  quantity: number;           // Số lượng kho phụ (hiển thị cho khách)
  primaryQuantity?: number;   // Số lượng kho chính (chỉ admin xem)
  minSecondaryStock?: number; // Ngưỡng tối thiểu kho phụ
  maxSecondaryStock?: number; // Giới hạn tối đa kho phụ
  sortOrder?: number;
  sourceType?: 'LOCAL' | 'EXTERNAL';  // Nguồn sản phẩm
  lastSyncedStock?: number;   // Stock từ external provider (chỉ có với EXTERNAL)
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  liveTime?: string;
  country?: string;
  categoryId: number;
  sortOrder?: number;
  minSecondaryStock?: number;
  maxSecondaryStock?: number;
}

export interface ProductUpdate {
  id: number;
  name?: string;
  description?: string;
  price?: number;
  liveTime?: string;
  country?: string;
  categoryId?: number;
  status?: string;
  sortOrder?: number;
  minSecondaryStock?: number;
  maxSecondaryStock?: number;
}

export interface ProductFilter extends PageFilter {
  name?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  minStock?: number;
}