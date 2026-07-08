import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/products';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  createProduct(@Body() body: CreateProductDto, @CurrentUser() user: TokenPayload) {
    return this.productsService.createProduct(body, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: TokenPayload,
  ) {
    return this.productsService.updateProduct(id, body, user);
  }
}
