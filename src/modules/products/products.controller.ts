import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { Product, UserRole } from '@prisma/client';

import type { PaginatedResult } from '@/shared/pagination';
import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import {
  CreateProductDto,
  GetProductByIdResponseDto,
  GetProductsQueryParamsDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  getProducts(@Query() query: GetProductsQueryParamsDto): Promise<PaginatedResult<Product>> {
    return this.productsService.getPublishedProducts(query);
  }

  @Get(':id')
  getProductById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload,
  ): Promise<GetProductByIdResponseDto> {
    return this.productsService.getProductById(id, user);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  createProduct(
    @Body() body: CreateProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Product> {
    return this.productsService.createProduct(body, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Product> {
    return this.productsService.updateProduct(id, body, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  updateProductStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductStatusDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Product> {
    return this.productsService.updateProductStatus(id, body, user);
  }
}
