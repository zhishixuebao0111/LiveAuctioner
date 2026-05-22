import { ApiProperty } from '@nestjs/swagger';

export class CreditLogDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 5 })
  change: number;

  @ApiProperty({ example: '成功交易加分' })
  reason: string;

  @ApiProperty({ example: 'uuid', required: false })
  relatedOrderId?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;
}

export class CreditCheckDto {
  @ApiProperty({ example: 100 })
  creditScore: number;

  @ApiProperty({ example: 0.1 })
  depositRate: number;

  @ApiProperty({ example: false })
  isRestricted: boolean;

  @ApiProperty({ example: false })
  isSeverelyRestricted: boolean;

  @ApiProperty({ example: false })
  isBanned: boolean;
}
