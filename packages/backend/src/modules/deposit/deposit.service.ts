import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuctionStatus, DepositStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreditService } from '../credit/credit.service';

@Injectable()
export class DepositService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly creditService: CreditService,
  ) {}

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return value === null || value === undefined ? null : Number(value);
  }

  private normalizeDeposit(deposit: any) {
    return {
      ...deposit,
      amount: Number(deposit.amount),
      auction: deposit.auction
        ? {
            ...deposit.auction,
            startPrice: Number(deposit.auction.startPrice),
            reservePrice: this.toNumber(deposit.auction.reservePrice),
            minIncrement: Number(deposit.auction.minIncrement),
            currentPrice: Number(deposit.auction.currentPrice),
          }
        : deposit.auction,
    };
  }

  private calculateRequiredAmount(price: Prisma.Decimal | number, depositRate: number) {
    const amount = Number(price) * depositRate;
    return new Prisma.Decimal(Math.ceil(amount * 100) / 100);
  }

  async getMyDeposits(userId: string) {
    const deposits = await this.prisma.deposit.findMany({
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

    return deposits.map((deposit) => this.normalizeDeposit(deposit));
  }

  async ensureAuctionDepositFrozen(
    tx: Prisma.TransactionClient,
    userId: string,
    auction: {
      id: string;
      status: AuctionStatus;
      sellerId: string;
      startPrice: Prisma.Decimal;
      currentPrice: Prisma.Decimal;
    },
    bidPrice: Prisma.Decimal | number,
  ) {
    if (auction.status !== AuctionStatus.ONGOING) {
      throw new BadRequestException('拍卖未开始或已结束');
    }
    if (auction.sellerId === userId) {
      throw new BadRequestException('卖家不能参与自己商品的竞价');
    }

    const creditLevel = await this.creditService.checkCreditLevelInTransaction(tx, userId);
    if (creditLevel.isBanned) {
      throw new ForbiddenException('信用分过低，已被封禁，无法参与竞拍');
    }

    if (creditLevel.isSeverelyRestricted) {
      throw new ForbiddenException('信用分过低，当前只能浏览不能参与竞拍，请先提升信用分');
    }

    if (creditLevel.isRestricted) {
      const activeDepositCount = await tx.deposit.count({
        where: {
          userId,
          status: DepositStatus.FROZEN,
          auction: {
            status: AuctionStatus.ONGOING,
          },
        },
      });
      const alreadyJoined = await tx.deposit.findFirst({
        where: {
          userId,
          auctionId: auction.id,
          status: DepositStatus.FROZEN,
        },
      });

      if (!alreadyJoined && activeDepositCount >= 3) {
        throw new ForbiddenException('当前信用等级最多同时参与 3 场进行中的拍卖');
      }
    }

    const requiredAmount = this.calculateRequiredAmount(bidPrice, creditLevel.depositRate);
    const existing = await tx.deposit.findFirst({
      where: {
        userId,
        auctionId: auction.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing?.status === DepositStatus.DEDUCTED) {
      throw new ForbiddenException('该拍卖保证金已扣除，不能继续参与');
    }

    const existingAmount =
      existing && existing.status === DepositStatus.FROZEN
        ? existing.amount
        : new Prisma.Decimal(0);
    const additionalAmount = requiredAmount.sub(existingAmount);

    if (additionalAmount.lte(0) && existing?.status === DepositStatus.FROZEN) {
      return existing;
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.balance.lt(additionalAmount)) {
      throw new BadRequestException(`余额不足，参与本次竞拍需冻结保证金 ${requiredAmount.toFixed(2)}`);
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        balance: { decrement: additionalAmount },
        frozenBalance: { increment: additionalAmount },
      },
    });

    if (existing) {
      return tx.deposit.update({
        where: { id: existing.id },
        data: {
          amount: requiredAmount,
          status: DepositStatus.FROZEN,
        },
      });
    }

    return tx.deposit.create({
      data: {
        userId,
        auctionId: auction.id,
        amount: requiredAmount,
        status: DepositStatus.FROZEN,
      },
    });
  }

  async refundAuctionDeposits(
    tx: Prisma.TransactionClient,
    auctionId: string,
    options: { excludeUserId?: string } = {},
  ) {
    const deposits = await tx.deposit.findMany({
      where: {
        auctionId,
        status: DepositStatus.FROZEN,
        ...(options.excludeUserId ? { userId: { not: options.excludeUserId } } : {}),
      },
    });

    for (const deposit of deposits) {
      await this.refundDeposit(tx, deposit.id);
    }

    return deposits.length;
  }

  async refundDeposit(tx: Prisma.TransactionClient, depositId: string) {
    const deposit = await tx.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit || deposit.status !== DepositStatus.FROZEN) {
      return null;
    }

    await tx.user.update({
      where: { id: deposit.userId },
      data: {
        balance: { increment: deposit.amount },
        frozenBalance: { decrement: deposit.amount },
      },
    });

    return tx.deposit.update({
      where: { id: depositId },
      data: { status: DepositStatus.REFUNDED },
    });
  }

  async refundAuctionDepositForUser(
    tx: Prisma.TransactionClient,
    auctionId: string,
    userId: string,
  ) {
    const deposit = await tx.deposit.findFirst({
      where: {
        auctionId,
        userId,
        status: DepositStatus.FROZEN,
      },
    });

    if (!deposit) {
      return null;
    }

    return this.refundDeposit(tx, deposit.id);
  }

  async deductAuctionDepositForUser(
    tx: Prisma.TransactionClient,
    auctionId: string,
    userId: string,
  ) {
    const deposit = await tx.deposit.findFirst({
      where: {
        auctionId,
        userId,
        status: DepositStatus.FROZEN,
      },
    });

    if (!deposit) {
      return null;
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        frozenBalance: { decrement: deposit.amount },
      },
    });

    return tx.deposit.update({
      where: { id: deposit.id },
      data: { status: DepositStatus.DEDUCTED },
    });
  }
}
