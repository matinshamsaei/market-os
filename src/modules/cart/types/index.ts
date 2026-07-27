export interface CartProduct {
  id: string;
  title: string;
  price: number;
}

export interface CustomerCartItem {
  id: string;
  productId: string;
  quantity: number;
  product: CartProduct;
}

export interface CustomerCart {
  id: string;
  customerId: string;
  cartItems: CustomerCartItem[];
}

export interface AvailableProduct {
  id: string;
  inventory: { quantity: number } | null;
}

export interface OwnedCartItem {
  id: string;
  productId: string;
  cart: { customerId: string };
}

export interface ExistingCartItem {
  id: string;
  quantity: number;
}
