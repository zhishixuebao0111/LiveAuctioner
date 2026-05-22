import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: '昵称', example: '买家小王', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50, { message: '昵称最多 50 个字符' })
  nickname?: string;

  @ApiProperty({ description: '头像URL', example: 'https://example.com/avatar.jpg', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;
}
