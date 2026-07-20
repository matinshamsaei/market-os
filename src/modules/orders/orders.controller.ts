import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { Order, UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  getOrders(@CurrentUser() user: TokenPayload): Promise<Order[]> {
    return this.ordersService.getOrders(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  getOrderById(@Param('id') id: string, @CurrentUser() user: TokenPayload): Promise<Order> {
    return this.ordersService.getOrderById(id, user);
  }

  @Get('vendor/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  getVendorOrders(@CurrentUser() user: TokenPayload): Promise<Order[]> {
    return this.ordersService.getVendorOrders(user);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  checkout(
    @CurrentUser() user: TokenPayload,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<Order> {
    return this.ordersService.checkout(user, idempotencyKey);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Order> {
    return this.ordersService.updateStatus(id, dto.status, user);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  cancelOrder(@Param('id') id: string, @CurrentUser() user: TokenPayload): Promise<Order> {
    return this.ordersService.cancelOrder(id, user);
  }
}
