import { PageFilter } from "./common.model";
import { OrderItem } from "./order-item.model";

export interface Order {
  id: number;
  orderNumber: string;

  userId: number;
  userEmail: string;

  orderStatus: string;
  totalAmount: number;

  productId: number;
  productName: string;

  accountData: string[];

  createdAt: string;
}



export interface OrderCreate {
    productId:number;
    quantity:number;

}

export interface OrderFilter extends PageFilter {
    orderNumber?: string;
    userEmail?: string;
    orderStatus?: string;
}