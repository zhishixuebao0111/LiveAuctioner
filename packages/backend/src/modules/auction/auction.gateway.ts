import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { jwtConfig } from '../../config/jwt.config';
import { AuctionService } from './auction.service';
import { PlaceBidDto } from './dto/place-bid.dto';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  },
})
export class AuctionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private unsubscribeHandlers: Array<() => void> = [];

  constructor(
    private readonly auctionService: AuctionService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit() {
    this.unsubscribeHandlers = [
      this.auctionService.onAuctionUpdate(({ auctionId, auction }) => {
        this.server.to(`auction:${auctionId}`).emit('auction_update', auction);
      }),
      this.auctionService.onBidPlaced(({ auctionId, bid, ranking }) => {
        this.server.to(`auction:${auctionId}`).emit('bid_placed', bid);
        this.server.to(`auction:${auctionId}`).emit('ranking_update', ranking);
      }),
      this.auctionService.onAuctionEnded(({ auctionId, auction, order }) => {
        this.server.to(`auction:${auctionId}`).emit('auction_ended', { auction, order });
      }),
    ];
  }

  onModuleDestroy() {
    this.unsubscribeHandlers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeHandlers = [];
  }

  handleConnection(client: Socket) {
    const authToken = client.handshake.auth?.token;
    const headerToken = client.handshake.headers.authorization?.replace('Bearer ', '');
    const token = authToken || headerToken;

    if (!token) {
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtConfig.secret,
      }) as { userId: string; role: string };
      client.data.userId = payload.userId;
      client.data.role = payload.role;
    } catch {
      client.data.userId = null;
    }
  }

  handleDisconnect(client: Socket) {
    const auctionRooms = (client.data.auctionRooms || []) as string[];
    auctionRooms.forEach((auctionId) => {
      setTimeout(() => this.emitOnlineCount(auctionId), 0);
    });
    client.removeAllListeners();
  }

  private emitOnlineCount(auctionId: string) {
    const room = `auction:${auctionId}`;
    const count = this.server.sockets.adapter.rooms.get(room)?.size || 0;
    this.server.to(room).emit('online_count', { auctionId, count });
    return count;
  }

  @SubscribeMessage('join_auction')
  async handleJoinAuction(
    @MessageBody() auctionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(`auction:${auctionId}`);
    const auctionRooms = new Set<string>(client.data.auctionRooms || []);
    auctionRooms.add(auctionId);
    client.data.auctionRooms = Array.from(auctionRooms);
    const onlineCount = this.emitOnlineCount(auctionId);
    return { joined: auctionId, onlineCount };
  }

  @SubscribeMessage('leave_auction')
  async handleLeaveAuction(
    @MessageBody() auctionId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(`auction:${auctionId}`);
    const auctionRooms = new Set<string>(client.data.auctionRooms || []);
    auctionRooms.delete(auctionId);
    client.data.auctionRooms = Array.from(auctionRooms);
    const onlineCount = this.emitOnlineCount(auctionId);
    return { left: auctionId, onlineCount };
  }

  @SubscribeMessage('place_bid')
  async handlePlaceBid(
    @MessageBody() payload: PlaceBidDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      if (!client.data.userId) {
        client.emit('error', '请先登录后再出价');
        return;
      }

      const result = await this.auctionService.placeBid(
        payload.auctionId,
        client.data.userId,
        payload.price,
      );

      return result;
    } catch (error: any) {
      client.emit('error', error?.message || '出价失败');
      return null;
    }
  }
}
