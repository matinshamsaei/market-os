import { Module } from '@nestjs/common';

import { PrismaModule } from '@/database/prisma/prisma.module';

import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';

import { PaymentsController } from './payments.controller';
import {
  FakeProvider,
  PaymentProviderFactory,
  StripeProvider,
  ZarinpalProvider,
} from './providers';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule, OrdersModule, PrismaModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    PaymentProviderFactory,
    FakeProvider,
    StripeProvider,
    ZarinpalProvider,
  ],
  exports: [PaymentsService, PaymentsRepository, PaymentProviderFactory],
})
export class PaymentsModule {}
