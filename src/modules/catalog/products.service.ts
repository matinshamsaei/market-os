import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductStatus, UserRole } from '@prisma/client';
import { isObjectEmpty } from '@/shared/utils';
import type { TokenPayload } from '@/shared/types';

import { ProductsRepository } from './products.repository';
import { CreateProductDto, UpdateProductDto } from './dto/products';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  createProduct(body: CreateProductDto, userId: string) {
    return this.productsRepository.create({
      ...body,
      vendor: { connect: { id: userId } },
      status: ProductStatus.DRAFT,
    });
  }

  async updateProduct(id: string, body: UpdateProductDto, user: TokenPayload) {
    if (!body || isObjectEmpty(body)) {
      throw new BadRequestException('Body cannot be empty!');
    }

    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found!');
    }

    if (user.role !== UserRole.ADMIN && user.userId !== product.vendorId) {
      throw new ForbiddenException('You are not allowed to update this product!');
    }

    return this.productsRepository.update(id, body);
  }
}
