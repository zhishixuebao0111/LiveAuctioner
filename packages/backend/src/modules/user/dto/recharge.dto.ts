import { IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RechargeDto {
  @ApiProperty({ description: '充值金额', example: 100 })
  @IsNumber({}, { message: '金额必须是数字' })
  @IsPositive({ message: '金额必须大于 0' })
  amount: number;
}
