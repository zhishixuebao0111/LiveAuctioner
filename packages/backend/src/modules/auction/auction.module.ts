import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { jwtConfig } from '../../config/jwt.config';
import { CreditModule } from '../credit/credit.module';
import { DepositModule } from '../deposit/deposit.module';
import { AuctionController } from './auction.controller';
import { AuctionGateway } from './auction.gateway';
import { AuctionService } from './auction.service';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    CreditModule,
    DepositModule,
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: { expiresIn: jwtConfig.expiresIn },
    }),
  ],
  controllers: [AuctionController],
  providers: [AuctionService, AuctionGateway],
  exports: [AuctionService],
})
export class AuctionModule {}
