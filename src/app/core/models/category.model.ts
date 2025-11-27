import { PageFilter } from "./common.model";
import { Product } from "./product.model";

export interface Category {
  id: number;
  name: string;
  description?: string;
  status: number;
  products: Product[]; 
  createdAt: Date;
  updatedAt: Date;
}
export interface CategoryCreate {
  name: string;
  description?: string;
  status?: string;
}
export interface CategoryUpdate {
  id: number;
  name: string;
  description?: string;
  status: number;
}

export interface CategoryFilter extends PageFilter {
  name?: string;
  status?: string;
}