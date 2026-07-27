import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateInventoryDto {
  @ApiProperty({ example: 50, minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;
}
