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
  quantity: number;
  sortOrder?: number;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  liveTime?: string;
  country?: string;
  categoryId: number;
  sortOrder?: number;
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
}

export interface ProductFilter extends PageFilter {
  name?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  minStock?: number;
}