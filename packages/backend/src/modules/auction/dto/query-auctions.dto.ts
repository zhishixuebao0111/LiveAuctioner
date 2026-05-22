import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuctionStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAuctionsDto {
  @ApiPropertyOptional({ description: '页码', example: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10 })
  @Type(() => Number)
  @IsOptional()
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为 1' })
  @Max(100, { message: '每页数量最大为 100' })
  limit?: number = 10;

  @ApiPropertyOptional({ description: '拍卖状态', enum: AuctionStatus })
  @IsOptional()
  @IsEnum(AuctionStatus, { message: '拍卖状态不合法' })
  status?: AuctionStatus;

  @ApiPropertyOptional({ description: '商品分类', example: '珠宝' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '关键词，按商品名称搜索', example: '翡翠' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
