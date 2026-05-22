import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuctionModule } from './modules/auction/auction.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { DefaultAdminService } from './common/bootstrap/default-admin.service';
import { OrderModule } from './modules/order/order.module';
import { DepositModule } from './modules/deposit/deposit.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ProductModule,
    AuctionModule,
    OrderModule,
    DepositModule,
  ],
  controllers: [],
  providers: [DefaultAdminService],
})
export class AppModule {}
