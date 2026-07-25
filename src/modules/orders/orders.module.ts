import { Module } from '@nestjs/common';

import { PrismaModule } from '@/database/prisma/prisma.module';

import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';
import { CartModule } from '../cart/cart.module';

import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrderStateMachine } from './helpers';

@Module({
  imports: [AuthModule, InventoryModule, CartModule, PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrderStateMachine],
  exports: [OrdersService],
})
export class OrdersModule {}
