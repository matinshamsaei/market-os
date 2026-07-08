import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  price: number;
}
