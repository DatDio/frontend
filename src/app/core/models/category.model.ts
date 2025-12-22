import { PageFilter } from "./common.model";
import { Product } from "./product.model";

export interface Category {
  id: number;
  name: string;
  description?: string;
  imageUrl?: string;
  status: number;
  sortOrder?: number;
  products: Product[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryCreate {
  name: string;
  description?: string;
  status?: string;
  sortOrder?: number;
}

export interface CategoryUpdate {
  id: number;
  name: string;
  description?: string;
  status: number;
  sortOrder?: number;
}

export interface CategoryFilter extends PageFilter {
  name?: string;
  status?: string;
}