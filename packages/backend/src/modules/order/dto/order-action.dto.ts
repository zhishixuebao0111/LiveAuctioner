import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class OrderActionDto {
  @ApiPropertyOptional({ description: '操作原因或备注', example: '买家主动取消' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '备注最多 500 个字符' })
  reason?: string;
}
