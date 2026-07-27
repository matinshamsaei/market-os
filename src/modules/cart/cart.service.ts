import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { TokenPayload } from '@/shared/types';

import { AddToCartDto, GetCartResponse, UpdateCartItemDto } from './dto';
import type { AvailableProduct, CustomerCart } from './types';
import { CartRepository } from './cart.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly cartRepository: CartRepository) {}

  async getCart(user: TokenPayload): Promise<GetCartResponse> {
    const cart = await this.cartRepository.findByCustomerId(user.userId);

    if (!cart) {
      return { items: [], subtotal: 0, totalItems: 0 };
    }

    return this.buildCartSummary(cart);
  }

  async addToCart(body: AddToCartDto, user: TokenPayload): Promise<GetCartResponse> {
    const product = this.assertProductAvailable(
      await this.cartRepository.findPublishedProductWithInventory(body.productId),
      body.quantity,
    );

    const cart = await this.cartRepository.findByCustomerId(user.userId);

    if (!cart) {
      await this.cartRepository.createCartWithItem(user.userId, body.productId, body.quantity);
      return this.getCart(user);
    }

    await this.addItemToExistingCart(cart, product, body);

    return this.getCart(user);
  }

  async updateCartItem(
    itemId: string,
    body: UpdateCartItemDto,
    user: TokenPayload,
  ): Promise<GetCartResponse> {
    const cartItem = await this.cartRepository.findCartItemById(itemId);

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    this.assertCartOwnership(cartItem.cart.customerId, user.userId);

    this.assertProductAvailable(
      await this.cartRepository.findPublishedProductWithInventory(cartItem.productId),
      body.quantity,
    );

    await this.cartRepository.updateCartItemQuantity(itemId, body.quantity);

    return this.getCart(user);
  }

  async removeCartItem(itemId: string, user: TokenPayload): Promise<GetCartResponse> {
    const cartItem = await this.cartRepository.findCartItemById(itemId);

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    this.assertCartOwnership(cartItem.cart.customerId, user.userId);

    await this.cartRepository.deleteCartItem(itemId);

    return this.getCart(user);
  }

  async clearCart(
    user: TokenPayload,
    transaction?: Prisma.TransactionClient,
  ): Promise<GetCartResponse> {
    await this.cartRepository.clearCart(user.userId, transaction);
    return this.getCart(user);
  }

  private async addItemToExistingCart(
    cart: CustomerCart,
    product: AvailableProduct,
    body: AddToCartDto,
  ) {
    const { id: cartId } = cart;
    const { productId, quantity } = body;
    const existingItem = await this.cartRepository.findCartItemByProductId(cartId, productId);

    if (existingItem) {
      const nextQuantity = existingItem.quantity + quantity;
      const inventory = product.inventory;

      if (!inventory) {
        throw new BadRequestException('Product inventory does not exist');
      }

      this.assertSufficientStock(inventory.quantity, nextQuantity);
      await this.cartRepository.updateCartItemQuantity(existingItem.id, nextQuantity);
      return;
    }

    await this.cartRepository.createCartItem(cartId, productId, quantity);
  }

  private buildCartSummary(cart: CustomerCart): GetCartResponse {
    const items = cart.cartItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      title: item.product.title,
      price: item.product.price,
      lineTotal: item.quantity * item.product.price,
    }));

    return {
      items,
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  private assertProductAvailable(
    product: AvailableProduct | null,
    quantity: number,
  ): AvailableProduct {
    if (!product) {
      throw new BadRequestException('Product is not published or does not exist');
    }

    if (!product.inventory) {
      throw new BadRequestException('Product inventory does not exist');
    }

    this.assertSufficientStock(product.inventory.quantity, quantity);

    return product;
  }

  private assertSufficientStock(stock: number, requestedQuantity: number) {
    if (requestedQuantity > stock) {
      throw new BadRequestException('Requested quantity exceeds available stock');
    }
  }

  private assertCartOwnership(cartCustomerId: string, userId: string) {
    if (cartCustomerId !== userId) {
      throw new ForbiddenException('You are not allowed to modify this cart');
    }
  }
}
