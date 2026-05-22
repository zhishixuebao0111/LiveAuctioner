import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CreditService {
  constructor(private prisma: PrismaService) {}

  async addCredit(userId: string, change: number, reason: string, relatedOrderId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { creditScore: { increment: change } },
      }),
      this.prisma.creditLog.create({
        data: {
          userId,
          change,
          reason,
          relatedOrderId,
        },
      }),
    ]);

    return { creditScore: user.creditScore + change };
  }

  async addCreditInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    change: number,
    reason: string,
    relatedOrderId?: string,
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    await tx.user.update({
      where: { id: userId },
      data: { creditScore: { increment: change } },
    });

    await tx.creditLog.create({
      data: {
        userId,
        change,
        reason,
        relatedOrderId,
      },
    });

    return { creditScore: user.creditScore + change };
  }

  async deductCredit(userId: string, change: number, reason: string, relatedOrderId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const newScore = Math.max(0, user.creditScore - change);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { creditScore: newScore },
      }),
      this.prisma.creditLog.create({
        data: {
          userId,
          change: -change,
          reason,
          relatedOrderId,
        },
      }),
    ]);

    return { creditScore: newScore };
  }

  async deductCreditInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    change: number,
    reason: string,
    relatedOrderId?: string,
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const newScore = Math.max(0, user.creditScore - change);

    await tx.user.update({
      where: { id: userId },
      data: {
        creditScore: newScore,
        violationCount: { increment: 1 },
      },
    });

    await tx.creditLog.create({
      data: {
        userId,
        change: -change,
        reason,
        relatedOrderId,
      },
    });

    return { creditScore: newScore };
  }

  async getCreditLogs(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      this.prisma.creditLog.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.creditLog.count({ where: { userId } }),
    ]);

    return {
      logs,
      pagination: { page, limit, total },
    };
  }

  async checkAndRewardConsecutiveTrades(tx: Prisma.TransactionClient, userId: string) {
    const recentCompletedOrders = await tx.order.count({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: {
          in: ['CONFIRMED', 'AUTO_CONFIRMED'],
        },
      },
    });

    if (recentCompletedOrders > 0 && recentCompletedOrders % 10 === 0) {
      const existingReward = await tx.creditLog.findFirst({
        where: {
          userId,
          reason: { contains: '连续交易奖励' },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!existingReward || new Date().getTime() - existingReward.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        await tx.user.update({
          where: { id: userId },
          data: { creditScore: { increment: 10 } },
        });

        await tx.creditLog.create({
          data: {
            userId,
            change: 10,
            reason: `连续完成 ${recentCompletedOrders} 笔交易，信用分奖励`,
          },
        });
      }
    }
  }

  async checkCreditLevel(userId: string) {
    return this.checkCreditLevelInTransaction(this.prisma, userId);
  }

  async checkCreditLevelInTransaction(
    tx: Prisma.TransactionClient | PrismaService,
    userId: string,
  ) {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const creditScore = user.creditScore;

    // 信用分等级判断（按设计文档5级规则）
    // 80-100: 无限制, 10%保证金
    // 60-79: 警告, 20%保证金
    // 40-59: 限制, 每周最多3场, 30%保证金
    // 20-39: 严重限制, 只能看不能拍
    // 0-19: 封禁
    let depositRate = 0.1;
    let isRestricted = false;
    let isBanned = false;
    let isSeverelyRestricted = false;

    if (creditScore < 20) {
      isBanned = true;
    } else if (creditScore < 40) {
      isSeverelyRestricted = true;
      depositRate = 0.3;
    } else if (creditScore < 60) {
      isRestricted = true;
      depositRate = 0.3;
    } else if (creditScore < 80) {
      depositRate = 0.2;
    }

    return {
      creditScore,
      depositRate,
      isRestricted,
      isSeverelyRestricted,
      isBanned,
    };
  }
}
