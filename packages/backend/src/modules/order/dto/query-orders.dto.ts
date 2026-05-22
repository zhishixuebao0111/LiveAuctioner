import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, Min } from 'class-validator';

export class QueryOrdersDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { message: '页码必须大于 0' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 20 })
  @Type(() => Number)
  @IsOptional()
  @Min(1, { message: '每页数量必须大于 0' })
  limit?: number = 20;

  @ApiPropertyOptional({ description: '订单状态', enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus, { message: '订单状态不正确' })
  status?: OrderStatus;

  @ApiPropertyOptional({ description: '商品关键字', example: '翡翠' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
