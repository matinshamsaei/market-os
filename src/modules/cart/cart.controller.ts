import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '../../shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CartService } from './cart.service';
import { AddToCartDto, GetCartResponseDto, UpdateCartItemDto } from './dto';

@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current customer cart' })
  @ApiOkResponse({ type: GetCartResponseDto })
  getCart(@CurrentUser() user: TokenPayload) {
    return this.cartService.getCart(user);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a product to the cart' })
  @ApiOkResponse({ type: GetCartResponseDto })
  addToCart(@Body() body: AddToCartDto, @CurrentUser() user: TokenPayload) {
    return this.cartService.addToCart(body, user);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiParam({ name: 'id', description: 'Cart item id' })
  @ApiOkResponse({ type: GetCartResponseDto })
  updateCartItem(
    @Param('id') id: string,
    @Body() body: UpdateCartItemDto,
    @CurrentUser() user: TokenPayload,
  ) {
    return this.cartService.updateCartItem(id, body, user);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Remove a cart item' })
  @ApiParam({ name: 'id', description: 'Cart item id' })
  @ApiOkResponse({ type: GetCartResponseDto })
  removeCartItem(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    return this.cartService.removeCartItem(id, user);
  }
}
