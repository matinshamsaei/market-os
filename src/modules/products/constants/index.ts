import { ProductStatus } from '@prisma/client';

export const DEFAULT_PRODUCT_STATUS = ProductStatus.DRAFT;

export const ALLOWED_STATUS_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  [ProductStatus.DRAFT]: [ProductStatus.PUBLISHED, ProductStatus.ARCHIVED],
  [ProductStatus.PUBLISHED]: [ProductStatus.ARCHIVED],
  [ProductStatus.ARCHIVED]: [ProductStatus.PUBLISHED],
};

export const PRODUCT_SORT_FIELDS = ['createdAt', 'title', 'price'] as const;
