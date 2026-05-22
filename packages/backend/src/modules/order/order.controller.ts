import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderStatus, Role } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OrderActionDto } from './dto/order-action.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { OrderService } from './order.service';

@ApiTags('订单')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: '我的买家订单列表' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  async getBuyerOrders(@GetUser() user: any, @Query() query: QueryOrdersDto) {
    return this.orderService.getBuyerOrders(user.id, query);
  }

  @Get('seller')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: '卖家订单列表' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  async getSellerOrders(@GetUser() user: any, @Query() query: QueryOrdersDto) {
    return this.orderService.getSellerOrders(user.id, user.role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  async getOrderById(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.getOrderById(user.id, user.role, id);
  }

  @Post(':id/pay')
  @ApiOperation({ summary: '支付订单（模拟余额支付）' })
  async payOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.payOrder(user.id, id);
  }

  @Post(':id/ship')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: '卖家发货' })
  async shipOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.shipOrder(user.id, user.role, id);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: '买家确认收货' })
  async confirmOrder(@GetUser() user: any, @Param('id') id: string) {
    return this.orderService.confirmOrder(user.id, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: '取消待支付订单' })
  async cancelOrder(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.orderService.cancelOrder(user.id, user.role, id, dto);
  }

  @Post(':id/refund')
  @ApiOperation({ summary: '申请退款' })
  async requestRefund(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.orderService.requestRefund(user.id, id, dto);
  }

  @Post(':id/refund/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: '卖家同意退款' })
  async sellerApproveRefund(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.orderService.sellerApproveRefund(user.id, user.role, id, dto);
  }

  @Post(':id/refund/reject')
  @UseGuards(RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: '卖家拒绝退款并进入仲裁' })
  async sellerRejectRefund(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.orderService.sellerRejectRefund(user.id, user.role, id, dto);
  }

  @Post(':id/dispute')
  @ApiOperation({ summary: '发起订单争议' })
  async disputeOrder(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: OrderActionDto,
  ) {
    return this.orderService.disputeOrder(user.id, user.role, id, dto);
  }
}

@ApiTags('管理后台-订单')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: '管理员订单列表' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  async getAdminOrders(@Query() query: QueryOrdersDto) {
    return this.orderService.getAdminOrders(query);
  }

  @Post(':id/refund/approve')
  @ApiOperation({ summary: '管理员同意退款' })
  async approveRefund(@Param('id') id: string, @Body() dto: OrderActionDto) {
    return this.orderService.approveRefund(id, dto);
  }

  @Post(':id/refund/reject')
  @ApiOperation({ summary: '管理员驳回退款' })
  async rejectRefund(@Param('id') id: string, @Body() dto: OrderActionDto) {
    return this.orderService.rejectRefund(id, dto);
  }
}
