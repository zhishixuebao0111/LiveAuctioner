import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserStatus, Role } from '@prisma/client';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, password, role } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException({
        code: 'AUTH_001',
        message: '用户名已存在',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: role || Role.BUYER,
        status: UserStatus.ACTIVE,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    const token = this.jwtService.sign({
      userId: user.id,
      role: user.role,
    });

    return {
      user: new UserResponseDto(userWithoutPassword),
      token,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'AUTH_002',
        message: '用户名或密码错误',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'AUTH_002',
        message: '用户名或密码错误',
      });
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException({
        code: 'AUTH_003',
        message: `账号已被封禁${user.banReason ? `: ${user.banReason}` : ''}`,
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = this.jwtService.sign({
      userId: user.id,
      role: user.role,
    });

    return {
      user: new UserResponseDto(userWithoutPassword),
      token,
    };
  }
}
