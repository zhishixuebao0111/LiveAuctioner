import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ description: '收货人姓名', example: '张三' })
  @IsString()
  @IsNotEmpty({ message: '收货人姓名不能为空' })
  name: string;

  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;

  @ApiProperty({ description: '省', example: '广东省' })
  @IsString()
  @IsNotEmpty({ message: '省份不能为空' })
  province: string;

  @ApiProperty({ description: '市', example: '深圳市' })
  @IsString()
  @IsNotEmpty({ message: '城市不能为空' })
  city: string;

  @ApiProperty({ description: '区', example: '南山区' })
  @IsString()
  @IsNotEmpty({ message: '区不能为空' })
  district: string;

  @ApiProperty({ description: '详细地址', example: '科技园路 123 号' })
  @IsString()
  @IsNotEmpty({ message: '详细地址不能为空' })
  detail: string;

  @ApiProperty({ description: '是否设为默认地址', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
