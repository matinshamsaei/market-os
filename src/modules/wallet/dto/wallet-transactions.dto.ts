import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { WalletTransactionType } from '@prisma/client';

import { PaginationMetaDto, PaginationQueryParamsDto } from '../../../shared/pagination';

export class GetWalletTransactionsQueryDto extends PaginationQueryParamsDto {
  @ApiPropertyOptional({ enum: WalletTransactionType, example: WalletTransactionType.DEPOSIT })
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class WalletResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 250.5 })
  balance: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class WalletTransactionResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ enum: WalletTransactionType, example: WalletTransactionType.DEPOSIT })
  type: WalletTransactionType;

  @ApiProperty({ example: 100 })
  amount: number;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  walletId: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedWalletTransactionsResponseDto {
  @ApiProperty({ type: [WalletTransactionResponseDto] })
  data: WalletTransactionResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
