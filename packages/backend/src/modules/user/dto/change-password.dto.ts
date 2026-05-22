import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '旧密码', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '旧密码不能为空' })
  oldPassword: string;

  @ApiProperty({ description: '新密码', example: '654321' })
  @IsString()
  @IsNotEmpty({ message: '新密码不能为空' })
  @MinLength(6, { message: '密码至少 6 个字符' })
  newPassword: string;
}
