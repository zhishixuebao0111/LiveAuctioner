import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateAuctionDto {
  @ApiProperty({ description: '商品 ID', example: 'product-uuid' })
  @IsString()
  @IsNotEmpty({ message: '商品 ID 不能为空' })
  productId: string;

  @ApiProperty({ description: '起拍价', example: 1000 })
  @Type(() => Number)
  @IsNumber({}, { message: '起拍价必须是数字' })
  @Min(0.01, { message: '起拍价必须大于 0' })
  startPrice: number;

  @ApiProperty({ description: '保留价', example: 1500, required: false })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({}, { message: '保留价必须是数字' })
  @Min(0.01, { message: '保留价必须大于 0' })
  reservePrice?: number;

  @ApiProperty({ description: '最小加价幅度', example: 100 })
  @Type(() => Number)
  @IsNumber({}, { message: '最小加价幅度必须是数字' })
  @Min(0.01, { message: '最小加价幅度必须大于 0' })
  minIncrement: number;

  @ApiProperty({
    description: '预计开始时间',
    example: '2026-05-21T20:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: '开始时间格式不正确' })
  startTime?: string;

  @ApiProperty({
    description: '预计结束时间',
    example: '2026-05-21T21:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间格式不正确' })
  endTime?: string;
}
