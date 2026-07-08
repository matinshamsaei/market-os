import { Injectable } from '@nestjs/common';

import { ProductStatus } from '@prisma/client';

import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/products';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  createProduct(createProductPayload: CreateProductDto, userId: string) {
    return this.productsRepository.create({
      ...createProductPayload,
      vendor: { connect: { id: userId } },
      status: ProductStatus.DRAFT,
    });
  }
}
