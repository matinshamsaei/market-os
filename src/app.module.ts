import { Module } from '@nestjs/common';

import { UsersModule } from './modules/users/users.module';

import { PrismaModule } from './prisma/prisma.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [UsersModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
