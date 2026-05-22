import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter } from 'events';
import {
  AuctionResult,
  AuctionStatus,
  Prisma,
  ProductStatus,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { DepositService } from '../deposit/deposit.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { QueryAuctionsDto } from './dto/query-auctions.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

type TxClient = Prisma.TransactionClient;

export interface AuctionRealtimeUpdateEvent {
  auctionId: string;
  auction: any;
}

export interface AuctionRealtimeBidEvent extends AuctionRealtimeUpdateEvent {
  bid: any;
  ranking: any[];
}

export interface AuctionRealtimeEndedEvent extends AuctionRealtimeUpdateEvent {
  order: any | null;
}

@Injectable()
export class AuctionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AuctionService.name);
  private readonly events = new EventEmitter();
  private lifecycleTimer?: NodeJS.Timeout;

  private readonly placeBidScript = `
local key = KEYS[1]
local bidderId = ARGV[1]
local price = tonumber(ARGV[2])
local nowMs = tonumber(ARGV[3])

if redis.call('EXISTS', key) == 0 then
  return {'MISSING'}
end

local status = redis.call('HGET', key, 'status')
if status ~= 'ONGOING' then
  return {'NOT_ONGOING'}
end

local sellerId = redis.call('HGET', key, 'sellerId')
if sellerId == bidderId then
  return {'SELLER_BID'}
end

local endTime = redis.call('HGET', key, 'endTime')
if endTime and endTime ~= '' and nowMs > tonumber(endTime) then
  redis.call('HSET', key, 'status', 'ENDED')
  return {'EXPIRED'}
end

local currentPrice = tonumber(redis.call('HGET', key, 'currentPrice') or '0')
local minIncrement = tonumber(redis.call('HGET', key, 'minIncrement') or '0')
local minimumBid = currentPrice + minIncrement
if price < minimumBid then
  return {'LOW_BID', tostring(minimumBid)}
end

local bidCount = redis.call('HINCRBY', key, 'bidCount', 1)
redis.call(
  'HSET',
  key,
  'currentPrice',
  tostring(price),
  'currentBidderId',
  bidderId,
  'updatedAt',
  tostring(nowMs)
)

return {'OK', tostring(bidCount), tostring(price), bidderId}
`;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private depositService: DepositService,
  ) {}

  async onModuleInit() {
    this.lifecycleTimer = setInterval(() => {
      void this.processExpiredAuctions();
    }, 5000);
  }

  async onModuleDestroy() {
    if (this.lifecycleTimer) {
      clearInterval(this.lifecycleTimer);
    }
  }

  onAuctionUpdate(listener: (event: AuctionRealtimeUpdateEvent) => void) {
    this.events.on('auction_update', listener);
    return () => this.events.off('auction_update', listener);
  }

  onBidPlaced(listener: (event: AuctionRealtimeBidEvent) => void) {
    this.events.on('bid_placed', listener);
    return () => this.events.off('bid_placed', listener);
  }

  onAuctionEnded(listener: (event: AuctionRealtimeEndedEvent) => void) {
    this.events.on('auction_ended', listener);
    return () => this.events.off('auction_ended', listener);
  }

  private emitAuctionUpdate(event: AuctionRealtimeUpdateEvent) {
    this.events.emit('auction_update', event);
  }

  private emitBidPlaced(event: AuctionRealtimeBidEvent) {
    this.events.emit('bid_placed', event);
  }

  private emitAuctionEnded(event: AuctionRealtimeEndedEvent) {
    this.events.emit('auction_ended', event);
  }

  private toNumber(value: Prisma.Decimal | null | undefined) {
    return value === null || value === undefined ? null : Number(value);
  }

  private normalizeBid(bid: any) {
    return {
      ...bid,
      price: Number(bid.price),
    };
  }

  private normalizeAuction(auction: any) {
    return {
      ...auction,
      startPrice: Number(auction.startPrice),
      reservePrice: this.toNumber(auction.reservePrice),
      minIncrement: Number(auction.minIncrement),
      currentPrice: Number(auction.currentPrice),
    };
  }

  private normalizeAuctionWithRelations(auction: any) {
    return {
      ...this.normalizeAuction(auction),
      bids: auction.bids?.map((bid: any) => this.normalizeBid(bid)),
    };
  }

  private async assertAuctionPermission(
    tx: TxClient,
    userId: string,
    role: Role,
    auctionId: string,
  ) {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: true,
      },
    });

    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }
    if (role !== Role.ADMIN && auction.sellerId !== userId) {
      throw new ForbiddenException('无权操作此拍卖');
    }

    return auction;
  }

  private auctionStateKey(auctionId: string) {
    return `auction:${auctionId}:state`;
  }

  private async syncAuctionStateToRedis(auction: any) {
    const key = this.auctionStateKey(auction.id);
    const client = this.redis.getClient();
    const endTimeMs = auction.endTime ? new Date(auction.endTime).getTime() : '';

    await client.hSet(key, {
      id: auction.id,
      status: auction.status,
      sellerId: auction.sellerId,
      startPrice: String(Number(auction.startPrice)),
      reservePrice:
        auction.reservePrice === null || auction.reservePrice === undefined
          ? ''
          : String(Number(auction.reservePrice)),
      minIncrement: String(Number(auction.minIncrement)),
      currentPrice: String(Number(auction.currentPrice)),
      currentBidderId: auction.currentBidderId || '',
      bidCount: String(auction.bidCount ?? 0),
      endTime: String(endTimeMs),
      updatedAt: String(Date.now()),
    });

    if (auction.endTime) {
      const ttlSeconds = Math.max(
        60,
        Math.ceil((new Date(auction.endTime).getTime() - Date.now()) / 1000) + 86400,
      );
      await client.expire(key, ttlSeconds);
    }
  }

  private async hydrateAuctionState(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }

    await this.syncAuctionStateToRedis(auction);
    return auction;
  }

  private async clearAuctionState(auctionId: string) {
    await this.redis.getClient().del(this.auctionStateKey(auctionId));
  }

  async getAuctions(query: QueryAuctionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AuctionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      product: {
        status: ProductStatus.APPROVED,
        ...(query.category ? { category: query.category } : {}),
        ...(query.keyword
          ? {
              name: {
                contains: query.keyword,
                mode: 'insensitive',
              },
            }
          : {}),
      },
    };

    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          seller: {
            select: {
              id: true,
              username: true,
            },
          },
          _count: {
            select: {
              bids: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { startTime: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      auctions: auctions.map((auction) => this.normalizeAuction(auction)),
      pagination: { page, limit, total },
    };
  }

  async getUpcomingAuctions() {
    const now = new Date();
    const auctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.PENDING,
        OR: [{ startTime: null }, { startTime: { gte: now } }],
        product: {
          status: ProductStatus.APPROVED,
        },
      },
      include: {
        product: true,
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
      take: 12,
    });

    return auctions.map((auction) => this.normalizeAuction(auction));
  }

  async getHotAuctions() {
    const auctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.ONGOING,
        product: {
          status: ProductStatus.APPROVED,
        },
      },
      include: {
        product: true,
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ bidCount: 'desc' }, { currentPrice: 'desc' }],
      take: 12,
    });

    return auctions.map((auction) => this.normalizeAuction(auction));
  }

  async getAuctionById(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: true,
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
        currentBidder: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }

    return this.normalizeAuction(auction);
  }

  async getSellerAuctions(userId: string, query: QueryAuctionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AuctionWhereInput = {
      sellerId: userId,
      ...(query.status ? { status: query.status } : {}),
      product: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.keyword
          ? {
              name: {
                contains: query.keyword,
                mode: 'insensitive',
              },
            }
          : {}),
      },
    };

    const [auctions, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        skip,
        take: limit,
        include: {
          product: true,
          _count: {
            select: {
              bids: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      auctions: auctions.map((auction) => this.normalizeAuction(auction)),
      pagination: { page, limit, total },
    };
  }

  async getSellerAuctionById(userId: string, role: Role, auctionId: string) {
    const auction = await this.assertAuctionPermission(this.prisma as unknown as TxClient, userId, role, auctionId);
    return this.normalizeAuction(auction);
  }

  async createAuction(userId: string, dto: CreateAuctionDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('商品不存在');
    }
    if (product.sellerId !== userId) {
      throw new ForbiddenException('无权为该商品创建拍卖');
    }
    if (product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException('只有审核通过的商品允许创建拍卖');
    }
    if (dto.reservePrice !== undefined && dto.reservePrice < dto.startPrice) {
      throw new BadRequestException('保留价不能低于起拍价');
    }

    const startTime = dto.startTime ? new Date(dto.startTime) : null;
    const endTime = dto.endTime ? new Date(dto.endTime) : null;

    if (startTime && endTime && endTime <= startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const activeAuction = await this.prisma.auction.findFirst({
      where: {
        productId: dto.productId,
        status: { in: [AuctionStatus.PENDING, AuctionStatus.ONGOING] },
      },
    });

    if (activeAuction) {
      throw new BadRequestException('该商品已有进行中或待开始的拍卖');
    }

    const auction = await this.prisma.auction.create({
      data: {
        productId: dto.productId,
        sellerId: userId,
        startPrice: new Prisma.Decimal(dto.startPrice),
        reservePrice:
          dto.reservePrice !== undefined ? new Prisma.Decimal(dto.reservePrice) : null,
        minIncrement: new Prisma.Decimal(dto.minIncrement),
        startTime,
        endTime,
      },
      include: {
        product: true,
      },
    });

    return this.normalizeAuction(auction);
  }

  async updateAuction(userId: string, role: Role, auctionId: string, dto: UpdateAuctionDto) {
    const auction = await this.assertAuctionPermission(this.prisma as unknown as TxClient, userId, role, auctionId);

    if (auction.status !== AuctionStatus.PENDING) {
      throw new BadRequestException('只有待开始状态的拍卖允许修改');
    }
    if (auction.bidCount > 0) {
      throw new BadRequestException('已有出价记录的拍卖不允许修改');
    }

    const nextStartPrice = dto.startPrice ?? Number(auction.startPrice);
    const nextReservePrice =
      dto.reservePrice !== undefined ? dto.reservePrice : this.toNumber(auction.reservePrice);
    const startTime = dto.startTime ? new Date(dto.startTime) : auction.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : auction.endTime;

    if (nextReservePrice !== null && nextReservePrice !== undefined && nextReservePrice < nextStartPrice) {
      throw new BadRequestException('保留价不能低于起拍价');
    }
    if (startTime && endTime && endTime <= startTime) {
      throw new BadRequestException('结束时间必须晚于开始时间');
    }

    const updated = await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        productId: dto.productId ?? auction.productId,
        startPrice:
          dto.startPrice !== undefined ? new Prisma.Decimal(dto.startPrice) : undefined,
        reservePrice:
          dto.reservePrice !== undefined
            ? new Prisma.Decimal(dto.reservePrice)
            : undefined,
        minIncrement:
          dto.minIncrement !== undefined ? new Prisma.Decimal(dto.minIncrement) : undefined,
        startTime: dto.startTime !== undefined ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime !== undefined ? new Date(dto.endTime) : undefined,
      },
      include: {
        product: true,
      },
    });

    return this.normalizeAuction(updated);
  }

  async startAuction(userId: string, role: Role, auctionId: string) {
    const auction = await this.assertAuctionPermission(this.prisma as unknown as TxClient, userId, role, auctionId);

    if (auction.status !== AuctionStatus.PENDING) {
      throw new BadRequestException('当前拍卖状态不允许开始');
    }

    const updated = await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: AuctionStatus.ONGOING,
        startTime: new Date(),
        currentPrice: auction.startPrice,
      },
      include: {
        product: true,
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    await this.syncAuctionStateToRedis(updated);
    const normalized = this.normalizeAuction(updated);
    this.emitAuctionUpdate({ auctionId, auction: normalized });
    return normalized;
  }

  async endAuction(userId: string, role: Role, auctionId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const auction = await this.assertAuctionPermission(tx, userId, role, auctionId);
      return this.endAuctionInTransaction(tx, auction);
    });

    await this.clearAuctionState(auctionId);
    this.emitAuctionUpdate({ auctionId, auction: result.auction });
    this.emitAuctionEnded({ auctionId, auction: result.auction, order: result.order });
    return result;
  }

  private async endAuctionInTransaction(tx: TxClient, auction: any) {
    if (auction.status !== AuctionStatus.ONGOING) {
      throw new BadRequestException('只有进行中的拍卖允许结束');
    }

    const sold =
      auction.currentBidderId &&
      auction.bidCount > 0 &&
      (!auction.reservePrice || auction.currentPrice.gte(auction.reservePrice));

    const updated = await tx.auction.update({
      where: { id: auction.id },
      data: {
        status: AuctionStatus.ENDED,
        endTime: new Date(),
        result: sold ? AuctionResult.SOLD : AuctionResult.UNSOLD,
      },
    });

    let order = null;
    if (sold && auction.currentBidderId) {
      order =
        (await tx.order.findFirst({
          where: { auctionId: auction.id },
        })) ??
        (await tx.order.create({
          data: {
            auctionId: auction.id,
            buyerId: auction.currentBidderId,
            sellerId: auction.sellerId,
            finalPrice: auction.currentPrice,
          },
        }));

      await this.depositService.refundAuctionDeposits(tx, auction.id, {
        excludeUserId: auction.currentBidderId,
      });
    } else {
      await this.depositService.refundAuctionDeposits(tx, auction.id);
    }

    return {
      auction: this.normalizeAuction(updated),
      order:
        order && {
          ...order,
          finalPrice: Number(order.finalPrice),
        },
    };
  }

  async cancelAuction(userId: string, role: Role, auctionId: string) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const auction = await this.assertAuctionPermission(tx, userId, role, auctionId);

      if (auction.status === AuctionStatus.ENDED || auction.status === AuctionStatus.CANCELLED) {
        throw new BadRequestException('当前拍卖状态不允许取消');
      }

      await this.depositService.refundAuctionDeposits(tx, auctionId);

      return tx.auction.update({
        where: { id: auctionId },
        data: {
          status: AuctionStatus.CANCELLED,
          result: AuctionResult.CANCELLED,
        },
        include: {
          product: true,
        },
      });
    });

    await this.clearAuctionState(auctionId);
    const normalized = this.normalizeAuction(updated);
    this.emitAuctionUpdate({ auctionId, auction: normalized });
    this.emitAuctionEnded({ auctionId, auction: normalized, order: null });
    return normalized;
  }

  async getAuctionBids(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true },
    });

    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }

    const bids = await this.prisma.bid.findMany({
      where: {
        auctionId,
        isValid: true,
      },
      include: {
        bidder: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ bidTime: 'desc' }, { price: 'desc' }],
    });

    return bids.map((bid) => this.normalizeBid(bid));
  }

  async getAuctionRanking(auctionId: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { id: true },
    });

    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }

    const bids = await this.prisma.bid.findMany({
      where: {
        auctionId,
        isValid: true,
      },
      include: {
        bidder: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [{ price: 'desc' }, { bidTime: 'asc' }],
      take: 5,
    });

    return bids.map((bid, index) => ({
      rank: index + 1,
      ...this.normalizeBid(bid),
    }));
  }

  async getMyBidAuctions(userId: string) {
    const bids = await this.prisma.bid.findMany({
      where: {
        bidderId: userId,
        isValid: true,
      },
      distinct: ['auctionId'],
      orderBy: { bidTime: 'desc' },
      include: {
        auction: {
          include: {
            product: true,
          },
        },
      },
    });

    return bids.map((bid) => ({
      ...this.normalizeBid(bid),
      auction: this.normalizeAuction(bid.auction),
    }));
  }

  async getMyWinAuctions(userId: string) {
    const auctions = await this.prisma.auction.findMany({
      where: {
        currentBidderId: userId,
        status: AuctionStatus.ENDED,
        result: AuctionResult.SOLD,
      },
      include: {
        product: true,
      },
      orderBy: { endTime: 'desc' },
    });

    return auctions.map((auction) => this.normalizeAuction(auction));
  }

  private async processExpiredAuctions() {
    const expiredAuctions = await this.prisma.auction.findMany({
      where: {
        status: AuctionStatus.ONGOING,
        endTime: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
      },
      take: 20,
    });

    for (const auction of expiredAuctions) {
      try {
        await this.endExpiredAuction(auction.id);
      } catch (error: any) {
        this.logger.error(
          `Failed to auto-end auction ${auction.id}: ${error?.message || error}`,
        );
      }
    }
  }

  private async endExpiredAuction(auctionId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: auctionId },
      });

      if (!auction || auction.status !== AuctionStatus.ONGOING) {
        return null;
      }

      return this.endAuctionInTransaction(tx, auction);
    });

    if (!result) {
      return null;
    }

    await this.clearAuctionState(auctionId);
    this.emitAuctionUpdate({ auctionId, auction: result.auction });
    this.emitAuctionEnded({ auctionId, auction: result.auction, order: result.order });
    return result;
  }

  async placeBid(auctionId: string, bidderId: string, price: number) {
    const bidder = await this.prisma.user.findUnique({
      where: { id: bidderId },
    });

    if (!bidder) {
      throw new NotFoundException('用户不存在');
    }
    if (bidder.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('当前账号状态不允许参与竞价');
    }

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        product: true,
        seller: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException('拍卖不存在');
    }
    if (auction.status !== AuctionStatus.ONGOING) {
      throw new BadRequestException('拍卖未开始或已结束');
    }
    if (auction.sellerId === bidderId) {
      throw new BadRequestException('卖家不能参与自己商品的竞价');
    }

    const key = this.auctionStateKey(auctionId);
    if (!(await this.redis.getClient().exists(key))) {
      await this.hydrateAuctionState(auctionId);
    }

    const scriptResult = (await this.redis.getClient().eval(this.placeBidScript, {
      keys: [key],
      arguments: [bidderId, String(price), String(Date.now())],
    })) as string[];

    const resultCode = scriptResult[0];
    if (resultCode === 'MISSING') {
      await this.hydrateAuctionState(auctionId);
      throw new BadRequestException('拍卖状态正在初始化，请重试');
    }
    if (resultCode === 'NOT_ONGOING') {
      throw new BadRequestException('拍卖未开始或已结束');
    }
    if (resultCode === 'SELLER_BID') {
      throw new BadRequestException('卖家不能参与自己商品的竞价');
    }
    if (resultCode === 'EXPIRED') {
      await this.endExpiredAuction(auctionId);
      throw new BadRequestException('拍卖已结束');
    }
    if (resultCode === 'LOW_BID') {
      throw new BadRequestException(`出价金额过低，当前最少应为 ${scriptResult[1]}`);
    }
    if (resultCode !== 'OK') {
      throw new BadRequestException('出价失败，请稍后重试');
    }

    const redisBidCount = Number(scriptResult[1]);
    const redisPrice = Number(scriptResult[2]);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await this.depositService.ensureAuctionDepositFrozen(
          tx,
          bidderId,
          auction,
          new Prisma.Decimal(redisPrice),
        );

        const bid = await tx.bid.create({
          data: {
            auctionId,
            bidderId,
            price: new Prisma.Decimal(redisPrice),
          },
          include: {
            bidder: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        });

        await tx.auction.updateMany({
          where: {
            id: auctionId,
            status: AuctionStatus.ONGOING,
            currentPrice: { lt: new Prisma.Decimal(redisPrice) },
          },
          data: {
            currentPrice: new Prisma.Decimal(redisPrice),
            currentBidderId: bidderId,
            bidCount: redisBidCount,
          },
        });

        const latestAuction = await tx.auction.findUnique({
          where: { id: auctionId },
          include: {
            product: true,
            seller: {
              select: {
                id: true,
                username: true,
              },
            },
            currentBidder: {
              select: {
                id: true,
                username: true,
              },
            },
            _count: {
              select: {
                bids: true,
              },
            },
          },
        });

        const ranking = await tx.bid.findMany({
          where: {
            auctionId,
            isValid: true,
          },
          include: {
            bidder: {
              select: {
                id: true,
                username: true,
              },
            },
          },
          orderBy: [{ price: 'desc' }, { bidTime: 'asc' }],
          take: 5,
        });

        return {
          bid: this.normalizeBid(bid),
          auction: latestAuction ? this.normalizeAuction(latestAuction) : null,
          ranking: ranking.map((item, index) => ({
            rank: index + 1,
            ...this.normalizeBid(item),
          })),
        };
      });

      if (result.auction) {
        this.emitAuctionUpdate({ auctionId, auction: result.auction });
        this.emitBidPlaced({
          auctionId,
          auction: result.auction,
          bid: result.bid,
          ranking: result.ranking,
        });
      }

      return result;
    } catch (error) {
      await this.clearAuctionState(auctionId);
      throw error;
    }
  }
}
