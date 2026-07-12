import { IsEnum, IsNotEmpty } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ProductStatus } from '@prisma/client';

import { CreateProductDto } from './create-products.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class UpdateProductStatusDto {
  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus;
}
