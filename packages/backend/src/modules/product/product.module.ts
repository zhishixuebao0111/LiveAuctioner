import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AdminProductController, ProductController, ProductSearchController } from './product.controller';
import { ProductService } from './product.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProductController, AdminProductController, ProductSearchController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
