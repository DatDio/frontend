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

  // External order info (for external products)
  externalOrderNumber?: string;   // Mã đơn từ external API
  providerName?: string;          // Tên provider nguồn

  createdAt: string;
}



export interface OrderCreate {
  productId: number;
  quantity: number;

}

export interface OrderFilter extends PageFilter {
  orderNumber?: string;
  userEmail?: string;
  orderStatus?: string;
}