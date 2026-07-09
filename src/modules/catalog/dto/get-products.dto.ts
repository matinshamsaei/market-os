import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { PaginationQueryParamsDto } from '@/shared/pagination';

import { PRODUCT_SORT_FIELDS } from '../constants';

export class GetProductsQueryParamsDto extends PaginationQueryParamsDto {
  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sortBy?: (typeof PRODUCT_SORT_FIELDS)[number] = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;
}
