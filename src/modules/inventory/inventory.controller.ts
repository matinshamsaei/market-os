import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';

import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';

import { InventoryService } from './inventory.service';
import { UpdateInventoryDto } from './dto';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products/:productId/inventory')
  getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Patch('products/:productId/inventory')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  updateProductInventory(
    @Param('productId') productId: string,
    @Body() body: UpdateInventoryDto,
    @CurrentUser() user: TokenPayload,
  ) {
    return this.inventoryService.updateProductInventory(productId, body, user);
  }
}
