import { PageFilter } from "./common.model";

export interface ProductItem {
  id: number;
  productId: number;
  accountData: string;     // mail|pass|recovery
  sold: boolean;
  buyerId?: number; 
  buyerName?: string;          
  orderId?: number;       
  soldAt?: string;        
}
export interface ProductItemCreate {
  productId: number;
  accountData: string;
}

export interface ProductItemFilter extends PageFilter {
  productId?: number;
  sold?: boolean;
}