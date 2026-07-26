import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderItemResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  orderId: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  productId: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  productTitleSnapshot: string;

  @ApiProperty({ example: 29.99 })
  productPriceSnapshot: number;

  @ApiProperty({ example: 2 })
  quantity: number;
}

export class OrderResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PENDING })
  status: OrderStatus;

  @ApiProperty({ example: 59.98 })
  total: number;

  @ApiProperty({ example: 59.98 })
  subTotal: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [OrderItemResponseDto] })
  orderItems?: OrderItemResponseDto[];
}
