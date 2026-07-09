import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Product, ProductStatus, UserRole } from '@prisma/client';
import { PaginatedResult } from '@/shared/pagination';
import type { TokenPayload } from '@/shared/types';
import { isObjectEmpty } from '@/shared/utils';

import {
  CreateProductDto,
  GetProductByIdResponseDto,
  GetProductsQueryParamsDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto';
import { ALLOWED_STATUS_TRANSITIONS, DEFAULT_PRODUCT_STATUS } from './constants';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  getPublishedProducts(query: GetProductsQueryParamsDto): Promise<PaginatedResult<Product>> {
    return this.productsRepository.findAllPublishedProducts(query);
  }

  async getProductById(id: string, user: TokenPayload): Promise<GetProductByIdResponseDto> {
    const product = await this.productsRepository.findByIdWithVendor(id);

    if (
      !product ||
      ((user?.role === UserRole.CUSTOMER || !user) && product.status !== ProductStatus.PUBLISHED)
    ) {
      throw new NotFoundException('Product not found!');
    }

    if (user?.role === UserRole.VENDOR && user?.userId !== product.vendorId) {
      throw new ForbiddenException('You are not allowed to view this product!');
    }

    const canViewStatus =
      user?.role === UserRole.ADMIN ||
      (user?.role === UserRole.VENDOR && user?.userId === product.vendorId);

    const { status, ...rest } = product;

    return {
      ...rest,
      ...(canViewStatus ? { status } : {}),
    };
  }

  createProduct(body: CreateProductDto, userId: string) {
    return this.productsRepository.create({
      ...body,
      vendor: { connect: { id: userId } },
      status: DEFAULT_PRODUCT_STATUS,
    });
  }

  async updateProduct(id: string, body: UpdateProductDto, user: TokenPayload): Promise<Product> {
    if (!body || isObjectEmpty(body)) {
      throw new BadRequestException('Body cannot be empty!');
    }

    await this.assertCanModifyProduct(id, user);

    return this.productsRepository.update(id, body);
  }

  async updateProductStatus(
    id: string,
    body: UpdateProductStatusDto,
    user: TokenPayload,
  ): Promise<Product> {
    const product = await this.assertCanModifyProduct(id, user);

    this.assertValidStatusTransition(product.status, body.status);

    return this.productsRepository.update(id, { status: body.status });
  }

  private async assertCanModifyProduct(id: string, user: TokenPayload): Promise<Product> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found!');
    }

    if (user.role !== UserRole.ADMIN && user.userId !== product.vendorId) {
      throw new ForbiddenException('You are not allowed to update this product!');
    }

    return product;
  }

  private assertValidStatusTransition(status: ProductStatus, nextStatus: ProductStatus): void {
    if (status === nextStatus) {
      throw new BadRequestException('Status cannot be the same as the current status!');
    }

    if (nextStatus === ProductStatus.DRAFT) {
      throw new BadRequestException('Status cannot be changed back to draft');
    }

    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[status];

    if (!allowedTransitions.includes(nextStatus)) {
      throw new BadRequestException(`Cannot change status from ${status} to ${nextStatus}`);
    }
  }
}
