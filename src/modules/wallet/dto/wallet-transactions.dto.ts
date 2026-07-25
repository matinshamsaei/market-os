import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { WalletTransactionType } from '@prisma/client';

import { PaginationQueryParamsDto } from '@/shared/pagination';

export class GetWalletTransactionsQueryDto extends PaginationQueryParamsDto {
  @IsOptional()
  @IsEnum(WalletTransactionType)
  type?: WalletTransactionType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
