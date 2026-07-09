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
  GetProductsQueryParamsDto,
  UpdateProductDto,
  UpdateProductStatusDto,
} from './dto';
import { ProductsRepository } from './products.repository';
import { ALLOWED_STATUS_TRANSITIONS } from './constants';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  getPublishedProducts(query: GetProductsQueryParamsDto): Promise<PaginatedResult<Product>> {
    return this.productsRepository.findAllPublishedProducts(query);
  }

  createProduct(body: CreateProductDto, userId: string) {
    return this.productsRepository.create({
      ...body,
      vendor: { connect: { id: userId } },
      status: ProductStatus.DRAFT,
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
