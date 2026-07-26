import { Body, Controller, Get, Headers, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Order, UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { OrderResponseDto, UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List orders for the current customer (or all for admin)' })
  @ApiOkResponse({ type: [OrderResponseDto] })
  getOrders(@CurrentUser() user: TokenPayload): Promise<Order[]> {
    return this.ordersService.getOrders(user);
  }

  @Get('vendor/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'List orders that include the vendor products' })
  @ApiOkResponse({ type: [OrderResponseDto] })
  getVendorOrders(@CurrentUser() user: TokenPayload): Promise<Order[]> {
    return this.ordersService.getVendorOrders(user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get an order by id' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: OrderResponseDto })
  getOrderById(@Param('id') id: string, @CurrentUser() user: TokenPayload): Promise<Order> {
    return this.ordersService.getOrderById(id, user);
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'Checkout the current cart into an order' })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Optional key to make checkout idempotent',
  })
  @ApiCreatedResponse({ type: OrderResponseDto })
  checkout(
    @CurrentUser() user: TokenPayload,
    @Headers('Idempotency-Key') idempotencyKey?: string,
  ): Promise<Order> {
    return this.ordersService.checkout(user, idempotencyKey);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update order status' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: OrderResponseDto })
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
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiOkResponse({ type: OrderResponseDto })
  cancelOrder(@Param('id') id: string, @CurrentUser() user: TokenPayload): Promise<Order> {
    return this.ordersService.cancelOrder(id, user);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Refund an order (admin)' })
  @ApiParam({ name: 'id', description: 'Order id' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  refundOrder(@Param('id') id: string, @CurrentUser() user: TokenPayload): Promise<Order> {
    return this.ordersService.refundOrder(id, user);
  }
}
