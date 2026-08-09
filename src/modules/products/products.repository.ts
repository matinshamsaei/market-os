import { Injectable } from '@nestjs/common';

import { ProductStatus } from '@prisma/client';

import type { Prisma, Product } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { buildOrderBy } from '../../shared/pagination/utils';
import { paginate } from '../../shared/pagination';

import type { PaginatedResult } from '../../shared/pagination';

import { GetProductsQueryParamsDto, PublicVendorDto } from './dto';
import { PRODUCT_SORT_FIELDS } from './constants';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllPublishedProducts(query: GetProductsQueryParamsDto): Promise<PaginatedResult<Product>> {
    const where = {
      status: ProductStatus.PUBLISHED,
      ...(query.search?.trim()
        ? {
            title: {
              contains: query.search.trim(),
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder, PRODUCT_SORT_FIELDS, 'createdAt');

    return paginate(this.prisma.product, {
      where,
      orderBy,
      page: query.page,
      perPage: query.perPage,
    });
  }

  create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  findById(id: string, options?: Omit<Prisma.ProductFindUniqueArgs, 'where'>) {
    return this.prisma.product.findUnique({ where: { id }, ...options });
  }

  findByIdWithVendor(id: string): Promise<Product & { vendor: PublicVendorDto }> {
    return this.prisma.product.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, email: true } } },
    });
  }
}
