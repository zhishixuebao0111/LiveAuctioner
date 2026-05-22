import { Module } from '@nestjs/common';
import { CreditService } from './credit.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CreditService],
  exports: [CreditService],
})
export class CreditModule {}
