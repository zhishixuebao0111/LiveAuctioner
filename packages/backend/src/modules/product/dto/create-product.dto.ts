import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: '商品名称', example: '天然翡翠手镯' })
  @IsString()
  @IsNotEmpty({ message: '商品名称不能为空' })
  @MaxLength(100, { message: '商品名称最多 100 个字符' })
  name: string;

  @ApiProperty({
    description: '商品描述',
    example: '冰种翡翠，带证书，适合直播竞拍',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: '商品描述最多 2000 个字符' })
  description?: string;

  @ApiProperty({
    description: '商品图片路径列表',
    example: ['/uploads/product-images/product-1.jpg'],
  })
  @IsArray({ message: '商品图片必须是数组' })
  @IsString({ each: true, message: '商品图片必须是字符串路径' })
  images: string[];

  @ApiProperty({ description: '商品分类', example: '珠宝' })
  @IsString()
  @IsNotEmpty({ message: '商品分类不能为空' })
  @MaxLength(50, { message: '商品分类最多 50 个字符' })
  category: string;
}
