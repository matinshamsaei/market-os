import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { Product, UserRole } from '@prisma/client';

import type { PaginatedResult } from '@/shared/pagination';
import type { TokenPayload } from '@/shared/types';

import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import {
  CreateProductDto,
  GetProductByIdResponseDto,
  GetProductsQueryParamsDto,
  PaginatedProductsResponseDto,
  ProductResponseDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List published products' })
  @ApiOkResponse({ type: PaginatedProductsResponseDto })
  getProducts(@Query() query: GetProductsQueryParamsDto): Promise<PaginatedResult<Product>> {
    return this.productsService.getPublishedProducts(query);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get a product by id',
    description: 'Optional JWT: vendors/admins may see non-published products they own.',
  })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOkResponse({ type: GetProductByIdResponseDto })
  getProductById(
    @Param('id') id: string,
    @CurrentUser() user: TokenPayload | null,
  ): Promise<GetProductByIdResponseDto> {
    return this.productsService.getProductById(id, user ?? undefined);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Create a product' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  createProduct(
    @Body() body: CreateProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Product> {
    return this.productsService.createProduct(body, user.userId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Update product fields' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOkResponse({ type: ProductResponseDto })
  updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Product> {
    return this.productsService.updateProduct(id, body, user);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Update product status' })
  @ApiParam({ name: 'id', description: 'Product id' })
  @ApiOkResponse({ type: ProductResponseDto })
  updateProductStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductStatusDto,
    @CurrentUser() user: TokenPayload,
  ): Promise<Product> {
    return this.productsService.updateProductStatus(id, body, user);
  }
}
