import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';

import { PaginationMetaDto, PaginationQueryParamsDto } from '../../../shared/pagination';

import { PRODUCT_SORT_FIELDS } from '../constants';

export class GetProductsQueryParamsDto extends PaginationQueryParamsDto {
  @ApiPropertyOptional({
    enum: PRODUCT_SORT_FIELDS,
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sortBy?: (typeof PRODUCT_SORT_FIELDS)[number] = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], example: 'desc', default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({ example: 'mouse', maxLength: 128 })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}

export class PublicVendorDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'vendor@example.com' })
  email: string;
}

export class ProductResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  title: string;

  @ApiPropertyOptional({ example: 'Ergonomic wireless mouse', nullable: true })
  description: string | null;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.PUBLISHED, nullable: true })
  status: ProductStatus | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  vendorId: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class GetProductByIdResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  title: string;

  @ApiPropertyOptional({ example: 'Ergonomic wireless mouse', nullable: true })
  description: string | null;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiPropertyOptional({
    enum: ProductStatus,
    example: ProductStatus.PUBLISHED,
    description: 'Only included for admin or the owning vendor',
  })
  status?: ProductStatus | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  vendorId: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: PublicVendorDto })
  vendor?: PublicVendorDto;
}

export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductResponseDto] })
  data: ProductResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
