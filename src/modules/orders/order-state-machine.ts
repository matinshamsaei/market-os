import { Injectable } from '@nestjs/common';

import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderStateMachine {
  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PROCESSING],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.allowedTransitions[from]?.includes(to) ?? false;
  }
}
