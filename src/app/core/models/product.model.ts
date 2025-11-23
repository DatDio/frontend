import { PageFilter } from "./common.model";

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  categoryId: number;
  categoryName: string;
  status: string;
  quantity: number;
}

export interface ProductCreate {
  name: string;
  description?: string;
  price: number;
  categoryId: number;
}

export interface ProductUpdate {
  id: number;
  name?: string;
  description?: string;
  price?: number;
  categoryId?: number;
  status?: string;
}

export interface ProductFilter extends PageFilter {
  name?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  minStock?: number;
}