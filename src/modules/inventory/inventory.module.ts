import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { InventoryRepository } from './inventory.repository';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryRepository],
  exports: [InventoryService],
})
export class InventoryModule {}
