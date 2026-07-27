import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 'Wireless Mouse' })
  title: string;

  @ApiProperty({ example: 29.99 })
  price: number;

  @ApiProperty({ example: 59.98 })
  lineTotal: number;
}

export class GetCartResponseDto {
  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty({ example: 59.98 })
  subtotal: number;

  @ApiProperty({ example: 2 })
  totalItems: number;
}

export type CartItemResponse = CartItemResponseDto;
export type GetCartResponse = GetCartResponseDto;
