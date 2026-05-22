import { IsString, IsNotEmpty, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ description: '用户名', example: 'buyer1' })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(3, { message: '用户名至少 3 个字符' })
  @MaxLength(20, { message: '用户名最多 20 个字符' })
  username: string;

  @ApiProperty({ description: '密码', example: '123456' })
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码至少 6 个字符' })
  password: string;

  @ApiProperty({ description: '角色', enum: Role, example: Role.BUYER })
  @IsEnum(Role, { message: '角色只能是 BUYER、SELLER 或 ADMIN' })
  role: Role = Role.BUYER;
}
