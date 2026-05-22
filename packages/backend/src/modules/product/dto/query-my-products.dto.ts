import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { QueryProductsDto } from './query-products.dto';

export class QueryMyProductsDto extends QueryProductsDto {
  @ApiPropertyOptional({ description: '商品状态', enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus, { message: '商品状态不合法' })
  status?: ProductStatus;
}
