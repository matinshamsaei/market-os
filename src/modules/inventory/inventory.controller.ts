import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

import { InventoryService } from './inventory.service';
import { InventoryResponseDto, UpdateInventoryDto } from './dto';

@ApiTags('inventory')
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('products/:productId/inventory')
  @ApiOperation({ summary: 'Get inventory for a product' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiOkResponse({ type: InventoryResponseDto })
  getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Patch('products/:productId/inventory')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.VENDOR)
  @ApiOperation({ summary: 'Update inventory quantity for a product' })
  @ApiParam({ name: 'productId', description: 'Product id' })
  @ApiOkResponse({ type: InventoryResponseDto })
  updateProductInventory(
    @Param('productId') productId: string,
    @Body() body: UpdateInventoryDto,
    @CurrentUser() user: TokenPayload,
  ) {
    return this.inventoryService.updateProductInventory(productId, body, user);
  }
}
