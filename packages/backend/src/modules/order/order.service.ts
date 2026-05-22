import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreditService } from '../credit/credit.service';
import { DepositService } from '../deposit/deposit.service';
import { OrderActionDto } from './dto/order-action.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';

@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderService.name);
  private lifecycleTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly depositService: DepositService,
    private readonly creditService: CreditService,
  ) {}

  onModuleInit() {
    this.lifecycleTimer = setInterval(() => {
      void this.processOrderLifecycle();
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.lifecycleTimer) {
      clearInterval(this.lifecycleTimer);
    }
  }

  private readonly includeOrderRelations = {
    auction: {
      include: {
        product: true,
      },
    },
    buyer: {
      select: {
        id: true,
        username: true,
      },
    },
    seller: {
      select: {
        id: true,
        username: true,
      },
    },
  };

  private normalizeOrder(order: any) {
    return {
      ...order,
      finalPrice: Number(order.finalPrice),
      auction: order.auction
        ? {
            ...order.auction,
            startPrice: Number(order.auction.startPrice),
            reservePrice:
              order.auction.reservePrice === null ? null : Number(order.auction.reservePrice),
            minIncrement: Number(order.auction.minIncrement),
            currentPrice: Number(order.auction.currentPrice),
          }
        : order.auction,
    };
  }

  private async completeRefund(tx: Prisma.TransactionClient, order: any, reason: string) {
    const seller = await tx.user.findUnique({
      where: { id: order.sellerId },
      select: { balance: true },
    });

    if (!seller || seller.balance.lt(order.finalPrice)) {
      throw new BadRequestException('卖家余额不足，无法完成退款');
    }

    await tx.user.update({
      where: { id: order.sellerId },
      data: {
        balance: {
          decrement: order.finalPrice,
        },
      },
    });

    await tx.user.update({
      where: { id: order.buyerId },
      data: {
        balance: {
          increment: order.finalPrice,
        },
      },
    });

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.REFUNDED,
        disputeReason: reason,
      },
      include: this.includeOrderRelations,
    });
  }

  private async applyPaymentDefaultPenalty(
    tx: Prisma.TransactionClient,
    order: { id: string; auctionId: string; buyerId: string },
    reason: string,
  ) {
    await this.depositService.deductAuctionDepositForUser(tx, order.auctionId, order.buyerId);
    await this.creditService.deductCreditInTransaction(
      tx,
      order.buyerId,
      10,
      reason,
      order.id,
    );
  }

  private async rewardCompletedOrder(
    tx: Prisma.TransactionClient,
    order: { id: string; buyerId: string; sellerId: string },
    reason: string,
  ) {
    await this.creditService.addCreditInTransaction(tx, order.buyerId, 2, reason, order.id);
    await this.creditService.addCreditInTransaction(tx, order.sellerId, 2, reason, order.id);

    await this.creditService.checkAndRewardConsecutiveTrades(tx, order.buyerId);
    await this.creditService.checkAndRewardConsecutiveTrades(tx, order.sellerId);
  }

  private buildWhere(query: QueryOrdersDto): Prisma.OrderWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            auction: {
              product: {
                name: {
                  contains: query.keyword,
                  mode: 'insensitive',
                },
              },
            },
          }
        : {}),
    };
  }

  async getBuyerOrders(userId: string, query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      buyerId: userId,
      ...this.buildWhere(query),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: this.includeOrderRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) => this.normalizeOrder(order)),
      pagination: { page, limit, total },
    };
  }

  async getSellerOrders(userId: string, role: Role, query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      ...(role === Role.ADMIN ? {} : { sellerId: userId }),
      ...this.buildWhere(query),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: this.includeOrderRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) => this.normalizeOrder(order)),
      pagination: { page, limit, total },
    };
  }

  async getAdminOrders(query: QueryOrdersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildWhere(query);

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: this.includeOrderRelations,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) => this.normalizeOrder(order)),
      pagination: { page, limit, total },
    };
  }

  async getOrderById(userId: string, role: Role, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.includeOrderRelations,
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (role !== Role.ADMIN && order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('无权查看此订单');
    }

    return this.normalizeOrder(order);
  }

  async payOrder(userId: string, orderId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: this.includeOrderRelations,
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }
      if (order.buyerId !== userId) {
        throw new ForbiddenException('只能支付自己的订单');
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('当前订单状态不允许支付');
      }

      const buyer = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });

      if (!buyer || buyer.balance.lt(order.finalPrice)) {
        throw new BadRequestException('余额不足，请先充值');
      }

      await tx.user.update({
        where: { id: order.buyerId },
        data: {
          balance: {
            decrement: order.finalPrice,
          },
        },
      });

      await tx.user.update({
        where: { id: order.sellerId },
        data: {
          balance: {
            increment: order.finalPrice,
          },
        },
      });

      await this.depositService.refundAuctionDepositForUser(tx, order.auctionId, order.buyerId);

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentTime: new Date(),
        },
        include: this.includeOrderRelations,
      });
    });

    return this.normalizeOrder(result);
  }

  async shipOrder(userId: string, role: Role, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (role !== Role.ADMIN && order.sellerId !== userId) {
      throw new ForbiddenException('只能处理自己的卖家订单');
    }
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('只有已支付订单可以发货');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.SHIPPED,
        shippedAt: new Date(),
        autoConfirmAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: this.includeOrderRelations,
    });

    return this.normalizeOrder(updated);
  }

  async confirmOrder(userId: string, orderId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }
      if (order.buyerId !== userId) {
        throw new ForbiddenException('只能确认自己的订单');
      }
      if (order.status !== OrderStatus.SHIPPED) {
        throw new BadRequestException('只有已发货订单可以确认收货');
      }

      const confirmed = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CONFIRMED,
          autoConfirmAt: null,
        },
        include: this.includeOrderRelations,
      });

      await this.rewardCompletedOrder(tx, order, '订单完成，信用分奖励');
      return confirmed;
    });

    return this.normalizeOrder(updated);
  }

  async cancelOrder(userId: string, role: Role, orderId: string, dto: OrderActionDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }
      if (role !== Role.ADMIN && order.buyerId !== userId) {
        throw new ForbiddenException('只能取消自己的订单');
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('只有待支付订单可以取消');
      }

      const reason = dto.reason?.trim() || '买家取消待支付订单';
      if (role === Role.ADMIN) {
        await this.depositService.refundAuctionDepositForUser(tx, order.auctionId, order.buyerId);
      } else {
        await this.applyPaymentDefaultPenalty(tx, order, '中标后取消待支付订单，扣除信用分');
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          disputeReason: reason,
        },
        include: this.includeOrderRelations,
      });
    });

    return this.normalizeOrder(updated);
  }

  async requestRefund(userId: string, orderId: string, dto: OrderActionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.buyerId !== userId) {
      throw new ForbiddenException('只能为自己的订单申请退款');
    }
    const alreadyRefundHandledStatuses: OrderStatus[] = [
      OrderStatus.REFUND_PENDING,
      OrderStatus.DISPUTED,
      OrderStatus.REFUNDED,
    ];
    if (
      order.refundReason ||
      alreadyRefundHandledStatuses.includes(order.status)
    ) {
      throw new BadRequestException('每笔订单仅允许申请一次退款');
    }
    const refundableStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.SHIPPED,
      OrderStatus.CONFIRMED,
    ];
    if (!refundableStatuses.includes(order.status)) {
      throw new BadRequestException('当前订单状态不允许申请退款');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.REFUND_PENDING,
        refundReason: dto.reason?.trim() || '买家申请退款',
      },
      include: this.includeOrderRelations,
    });

    return this.normalizeOrder(updated);
  }

  async disputeOrder(userId: string, role: Role, orderId: string, dto: OrderActionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (role !== Role.ADMIN && order.buyerId !== userId && order.sellerId !== userId) {
      throw new ForbiddenException('无权发起此订单争议');
    }
    const disputableStatuses: OrderStatus[] = [
      OrderStatus.REFUND_PENDING,
      OrderStatus.SHIPPED,
      OrderStatus.CONFIRMED,
    ];
    if (!disputableStatuses.includes(order.status)) {
      throw new BadRequestException('当前订单状态不允许发起争议');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DISPUTED,
        disputeReason: dto.reason || '订单争议',
      },
      include: this.includeOrderRelations,
    });

    return this.normalizeOrder(updated);
  }

  async approveRefund(orderId: string, dto: OrderActionDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: this.includeOrderRelations,
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }
      const arbitrableStatuses: OrderStatus[] = [
        OrderStatus.REFUND_PENDING,
        OrderStatus.DISPUTED,
      ];
      if (!arbitrableStatuses.includes(order.status)) {
        throw new BadRequestException('只有退款中或争议中的订单可以执行退款');
      }

      return this.completeRefund(tx, order, dto.reason?.trim() || '管理员同意退款');
    });

    return this.normalizeOrder(result);
  }

  async sellerApproveRefund(userId: string, role: Role, orderId: string, dto: OrderActionDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: this.includeOrderRelations,
      });

      if (!order) {
        throw new NotFoundException('订单不存在');
      }
      if (role !== Role.ADMIN && order.sellerId !== userId) {
        throw new ForbiddenException('只能处理自己的卖家订单');
      }
      if (order.status !== OrderStatus.REFUND_PENDING) {
        throw new BadRequestException('只有退款中的订单可以由卖家同意退款');
      }

      return this.completeRefund(tx, order, dto.reason?.trim() || '卖家同意退款');
    });

    return this.normalizeOrder(result);
  }

  async sellerRejectRefund(userId: string, role: Role, orderId: string, dto: OrderActionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (role !== Role.ADMIN && order.sellerId !== userId) {
      throw new ForbiddenException('只能处理自己的卖家订单');
    }
    if (order.status !== OrderStatus.REFUND_PENDING) {
      throw new BadRequestException('只有退款中的订单可以由卖家拒绝退款');
    }

    const note = dto.reason?.trim();
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DISPUTED,
        disputeReason: note ? `卖家拒绝退款：${note}` : '卖家拒绝退款，等待平台仲裁',
      },
      include: this.includeOrderRelations,
    });

    return this.normalizeOrder(updated);
  }

  async rejectRefund(orderId: string, dto: OrderActionDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    const arbitrableStatuses: OrderStatus[] = [
      OrderStatus.REFUND_PENDING,
      OrderStatus.DISPUTED,
    ];
    if (!arbitrableStatuses.includes(order.status)) {
      throw new BadRequestException('只有退款中或争议中的订单可以驳回退款');
    }

    const fallbackStatus = order.shippedAt
      ? order.autoConfirmAt === null
        ? OrderStatus.CONFIRMED
        : OrderStatus.SHIPPED
      : OrderStatus.PAID;
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: fallbackStatus,
        disputeReason: dto.reason || '管理员驳回退款',
      },
      include: this.includeOrderRelations,
    });

    return this.normalizeOrder(updated);
  }

  private async processOrderLifecycle() {
    try {
      await Promise.all([
        this.cancelOverduePaymentOrders(),
        this.autoConfirmShippedOrders(),
      ]);
    } catch (error: any) {
      this.logger.error(`Failed to process order lifecycle: ${error?.message || error}`);
    }
  }

  private async cancelOverduePaymentOrders() {
    const timeoutMinutes = Number(process.env.ORDER_PAYMENT_TIMEOUT_MINUTES || 30);
    const deadline = new Date(Date.now() - timeoutMinutes * 60_000);

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING_PAYMENT,
        createdAt: {
          lte: deadline,
        },
      },
      take: 50,
    });

    for (const order of orders) {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
        });

        if (!current || current.status !== OrderStatus.PENDING_PAYMENT) {
          return;
        }

        await this.applyPaymentDefaultPenalty(
          tx,
          current,
          '中标后超时未支付，扣除信用分',
        );

        await tx.order.update({
          where: { id: current.id },
          data: {
            status: OrderStatus.CANCELLED,
            disputeReason: `超过 ${timeoutMinutes} 分钟未支付，系统自动取消`,
          },
        });
      });
    }

    if (orders.length > 0) {
      this.logger.log(`Auto-cancelled overdue payment orders: ${orders.length}`);
    }
  }

  private async autoConfirmShippedOrders() {
    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.SHIPPED,
        autoConfirmAt: {
          lte: new Date(),
        },
      },
      take: 50,
    });

    for (const order of orders) {
      await this.prisma.$transaction(async (tx) => {
        const current = await tx.order.findUnique({
          where: { id: order.id },
        });

        if (!current || current.status !== OrderStatus.SHIPPED) {
          return;
        }

        await tx.order.update({
          where: { id: current.id },
          data: {
            status: OrderStatus.AUTO_CONFIRMED,
          },
        });

        await this.rewardCompletedOrder(tx, current, '订单自动确认完成，信用分奖励');
      });
    }

    if (orders.length > 0) {
      this.logger.log(`Auto-confirmed shipped orders: ${orders.length}`);
    }
  }
}
