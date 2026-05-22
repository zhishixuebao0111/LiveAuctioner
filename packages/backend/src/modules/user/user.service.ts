import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RechargeDto } from './dto/recharge.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Role, UserStatus } from '@prisma/client';
import { UserResponseDto } from '../auth/dto/auth-response.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const { password: _, ...userWithoutPassword } = user;
    return new UserResponseDto(userWithoutPassword);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    const { password: _, ...userWithoutPassword } = user;
    return new UserResponseDto(userWithoutPassword);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('旧密码错误');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword },
    });
  }

  async getBalance(userId: string): Promise<{ balance: number; frozenBalance: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true, frozenBalance: true },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return {
      balance: Number(user.balance),
      frozenBalance: Number(user.frozenBalance),
    };
  }

  async recharge(userId: string, dto: RechargeDto): Promise<{ balance: number }> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: dto.amount } },
    });
    return { balance: Number(user.balance) };
  }

  // 地址管理
  async getAddresses(userId: string): Promise<any[]> {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { isDefault: 'desc' },
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<any> {
    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.create({
      data: { ...dto, userId },
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto): Promise<any> {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }
    if (address.userId !== userId) {
      throw new ForbiddenException('无权修改此地址');
    }

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.address.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('地址不存在');
    }
    if (address.userId !== userId) {
      throw new ForbiddenException('无权删除此地址');
    }

    await this.prisma.address.delete({ where: { id: addressId } });
  }

  // 收藏管理
  async getFavorites(userId: string): Promise<any[]> {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        auction: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFavorite(userId: string, auctionId: string): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });
    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }

    try {
      await this.prisma.favorite.create({
        data: { userId, auctionId },
      });
    } catch (e) {
      // 唯一约束冲突，说明已经收藏了，直接返回
      return;
    }
  }

  async removeFavorite(userId: string, auctionId: string): Promise<void> {
    await this.prisma.favorite.deleteMany({
      where: { userId, auctionId },
    });
  }

  // 管理员接口
  async getUsers(
    page: number = 1,
    limit: number = 10,
    role?: Role,
    status?: UserStatus,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          role: true,
          balance: true,
          creditScore: true,
          status: true,
          banReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(u => ({
        ...u,
        balance: Number(u.balance),
      })),
      pagination: { page, limit, total },
    };
  }

  async getUserById(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        balance: true,
        frozenBalance: true,
        creditScore: true,
        violationCount: true,
        status: true,
        banReason: true,
        bannedAt: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return {
      ...user,
      balance: Number(user.balance),
      frozenBalance: Number(user.frozenBalance),
    };
  }

  async banUser(
    userId: string,
    operatorId: string,
    reason: string = '违反平台规则',
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.role === Role.ADMIN) {
      throw new ForbiddenException('不能封禁管理员');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.BANNED,
        banReason: reason,
        bannedBy: operatorId,
        bannedAt: new Date(),
      },
    });
  }

  async unbanUser(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        banReason: null,
        bannedBy: null,
        bannedAt: null,
      },
    });
  }
}
