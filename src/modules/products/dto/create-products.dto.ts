import { IsNumber, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Mouse', maxLength: 128 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  @ApiPropertyOptional({ example: 'Ergonomic wireless mouse', maxLength: 512 })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiProperty({ example: 29.99 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  price: number;
}
