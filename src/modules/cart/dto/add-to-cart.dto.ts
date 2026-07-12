import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class AddToCartDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
