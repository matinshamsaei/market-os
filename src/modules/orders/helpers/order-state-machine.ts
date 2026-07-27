import { Injectable } from '@nestjs/common';

import { OrderStatus } from '@prisma/client';

@Injectable()
class OrderStateMachine {
  private readonly allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
    [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [OrderStatus.CANCELLED],
    [OrderStatus.CANCELLED]: [],
  };

  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return this.allowedTransitions[from]?.includes(to) ?? false;
  }
}

export default OrderStateMachine;
