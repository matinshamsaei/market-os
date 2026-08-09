import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '../../shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import {
  DepositDto,
  GetWalletTransactionsQueryDto,
  PaginatedWalletTransactionsResponseDto,
  WalletResponseDto,
  WalletTransactionResponseDto,
} from './dto';
import { WalletService } from './wallet.service';

@ApiTags('wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current customer wallet' })
  @ApiOkResponse({ type: WalletResponseDto })
  getWallet(@CurrentUser() user: TokenPayload) {
    return this.walletService.getWallet(user);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'List wallet transactions' })
  @ApiOkResponse({ type: PaginatedWalletTransactionsResponseDto })
  getTransactions(
    @CurrentUser() user: TokenPayload,
    @Query() query: GetWalletTransactionsQueryDto,
  ) {
    return this.walletService.getTransactions(user, query);
  }

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit funds into the wallet' })
  @ApiCreatedResponse({ type: WalletTransactionResponseDto })
  deposit(@CurrentUser() user: TokenPayload, @Body() body: DepositDto) {
    return this.walletService.deposit(user, body);
  }
}
