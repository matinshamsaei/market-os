import { Injectable, NotFoundException } from '@nestjs/common';

import { Order, OrderStatus, Prisma } from '@prisma/client';

import { OrdersRepository } from './orders.repository';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { TokenPayload } from '@/shared/types';
import { PrismaService } from '@/database/prisma/prisma.service';
import { CartItemResponse } from '../cart/dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly inventoryService: InventoryService,
    private readonly cartService: CartService,
    private readonly prisma: PrismaService,
  ) {}

  async checkout(user: TokenPayload): Promise<Order> {
    const cart = await this.cartService.getCart(user);

    if (!cart?.items?.length) {
      throw new NotFoundException('The user does not have a cart');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.decrementProductStock(tx, cart.items);

      const pureProductsTotalPrice = cart.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );
      const order = await this.ordersRepository.createOrder(tx, {
        user: { connect: { id: user.userId } },
        subTotal: pureProductsTotalPrice,
        total: pureProductsTotalPrice, // TODO: add shipping price and other fees
        status: OrderStatus.PENDING,
        orderItems: {
          create: cart.items.map((item) => {
            return {
              product: { connect: { id: item.productId } },
              productTitleSnapshot: item.title,
              productPriceSnapshot: item.price,
              quantity: item.quantity,
            };
          }),
        },
      });

      await this.cartService.clearCart(user, tx);

      return order;
    });
  }

  private async decrementProductStock(
    transaction: Prisma.TransactionClient,
    cartItems: CartItemResponse[],
  ) {
    for (const item of cartItems) {
      await this.inventoryService.decrementProductStock(transaction, item.productId, item.quantity);
    }
  }
}
