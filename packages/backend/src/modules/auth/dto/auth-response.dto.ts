import { ApiProperty } from '@nestjs/swagger';
import { User } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'buyer1' })
  username: string;

  @ApiProperty({ example: 'BUYER' })
  role: string;

  @ApiProperty({ example: 0 })
  balance: number;

  @ApiProperty({ example: 0 })
  frozenBalance: number;

  @ApiProperty({ example: 100 })
  creditScore: number;

  @ApiProperty({ example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  createdAt: Date;

  constructor(user: Omit<User, 'password'>) {
    this.id = user.id;
    this.username = user.username;
    this.role = user.role;
    this.balance = Number(user.balance);
    this.frozenBalance = Number(user.frozenBalance);
    this.creditScore = user.creditScore;
    this.status = user.status;
    this.createdAt = user.createdAt;
  }
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token: string;
}
