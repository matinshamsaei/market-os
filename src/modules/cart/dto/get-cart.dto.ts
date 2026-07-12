export type CartItemResponse = {
  id: string;
  productId: string;
  quantity: number;
  title: string;
  price: number;
  lineTotal: number;
};

export type GetCartResponse = {
  items: CartItemResponse[];
  subtotal: number;
  totalItems: number;
};
