import { Module } from '@nestjs/common';

import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';

import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule, InventoryModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class CatalogModule {}
