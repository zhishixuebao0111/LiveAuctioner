import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class PlaceBidDto {
  @ApiProperty({ description: '拍卖 ID', example: 'auction-uuid' })
  @IsString()
  @IsNotEmpty({ message: '拍卖 ID 不能为空' })
  auctionId: string;

  @ApiProperty({ description: '出价金额', example: 2300 })
  @Type(() => Number)
  @IsNumber({}, { message: '出价金额必须是数字' })
  @Min(0.01, { message: '出价金额必须大于 0' })
  price: number;
}
