import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CreditModule } from '../credit/credit.module';

@Module({
  imports: [PrismaModule, CreditModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
