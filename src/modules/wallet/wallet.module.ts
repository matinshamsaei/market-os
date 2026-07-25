import { forwardRef, Module } from '@nestjs/common';

import { PrismaModule } from '@/database/prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';

import { WalletController } from './wallet.controller';
import { WalletRepository } from './wallet.repository';
import { WalletService } from './wallet.service';

@Module({
  imports: [forwardRef(() => AuthModule), PrismaModule],
  controllers: [WalletController],
  providers: [WalletService, WalletRepository],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
