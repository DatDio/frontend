export interface OrderItem {
  id: number;

  // Thông tin product
  productId: number;
  productName: string;

  // Thông tin product item (tài khoản cụ thể)
  productItemId: number;
  accountData: string;

  // Trạng thái bán
  sold: boolean;
  buyerId?: number;
  orderId?: number;
  soldAt?: string;   

  createdAt: string;
}
