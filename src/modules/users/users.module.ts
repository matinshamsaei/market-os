import { forwardRef, Module } from '@nestjs/common';

import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';

import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => WalletModule)],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
