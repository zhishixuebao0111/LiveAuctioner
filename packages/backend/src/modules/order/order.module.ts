import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';
import { DepositModule } from '../deposit/deposit.module';
import { AdminOrderController, OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [PrismaModule, CreditModule, DepositModule],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
