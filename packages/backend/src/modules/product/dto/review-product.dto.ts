import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewProductDto {
  @ApiProperty({
    description: '审核结果',
    enum: [ProductStatus.APPROVED, ProductStatus.REJECTED],
    example: ProductStatus.APPROVED,
  })
  @IsEnum([ProductStatus.APPROVED, ProductStatus.REJECTED], {
    message: '审核状态只能是 APPROVED 或 REJECTED',
  })
  status: ProductStatus;

  @ApiProperty({
    description: '审核备注',
    example: '图片清晰，商品信息完整，审核通过',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '审核备注最多 500 个字符' })
  reviewNote?: string;
}
