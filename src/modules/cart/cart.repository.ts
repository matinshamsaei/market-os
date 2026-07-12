import { Injectable } from '@nestjs/common';

import { ProductStatus } from '@prisma/client';

import { PrismaService } from '@/database/prisma/prisma.service';

import type { CustomerCart, AvailableProduct, OwnedCartItem, ExistingCartItem } from './types';

@Injectable()
export class CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCustomerId(customerId: string): Promise<CustomerCart | null> {
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      include: {
        cartItems: {
          include: {
            product: true,
          },
        },
      },
    });

    return cart as CustomerCart | null;
  }

  async findPublishedProductWithInventory(productId: string): Promise<AvailableProduct | null> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        status: ProductStatus.PUBLISHED,
      },
      include: {
        inventory: true,
      },
    });

    return product as AvailableProduct | null;
  }

  async findCartItemById(itemId: string): Promise<OwnedCartItem | null> {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: {
          include: {
            inventory: true,
          },
        },
      },
    });

    return cartItem as OwnedCartItem | null;
  }

  async findCartItemByProductId(
    cartId: string,
    productId: string,
  ): Promise<ExistingCartItem | null> {
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
      },
    });

    return cartItem as ExistingCartItem | null;
  }

  createCartWithItem(customerId: string, productId: string, quantity: number) {
    return this.prisma.cart.create({
      data: {
        customerId,
        cartItems: {
          create: {
            productId,
            quantity,
          },
        },
      },
    });
  }

  createCartItem(cartId: string, productId: string, quantity: number) {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        productId,
        quantity,
      },
    });
  }

  updateCartItemQuantity(itemId: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  deleteCartItem(itemId: string) {
    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }
}
