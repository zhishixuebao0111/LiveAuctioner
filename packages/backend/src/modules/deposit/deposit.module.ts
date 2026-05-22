import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';
import { DepositController } from './deposit.controller';
import { DepositService } from './deposit.service';

@Module({
  imports: [PrismaModule, CreditModule],
  controllers: [DepositController],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositModule {}
