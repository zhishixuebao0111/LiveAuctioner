import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ description: '收货人姓名', example: '张三', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: '省', example: '广东省', required: false })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiProperty({ description: '市', example: '深圳市', required: false })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: '区', example: '南山区', required: false })
  @IsString()
  @IsOptional()
  district?: string;

  @ApiProperty({ description: '详细地址', example: '科技园路 123 号', required: false })
  @IsString()
  @IsOptional()
  detail?: string;

  @ApiProperty({ description: '是否设为默认地址', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
