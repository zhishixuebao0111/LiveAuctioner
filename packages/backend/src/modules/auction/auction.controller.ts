import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuctionStatus, Role } from '@prisma/client';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { QueryAuctionsDto } from './dto/query-auctions.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';

@ApiTags('拍卖')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Get()
  @ApiOperation({ summary: '拍卖列表' })
  @ApiQuery({ name: 'status', required: false, enum: AuctionStatus })
  async getAuctions(@Query() query: QueryAuctionsDto) {
    return this.auctionService.getAuctions(query);
  }

  @Get('upcoming')
  @ApiOperation({ summary: '即将开始的拍卖' })
  async getUpcomingAuctions() {
    return this.auctionService.getUpcomingAuctions();
  }

  @Get('hot')
  @ApiOperation({ summary: '热门拍卖' })
  async getHotAuctions() {
    return this.auctionService.getHotAuctions();
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '卖家的拍卖列表' })
  @ApiQuery({ name: 'status', required: false, enum: AuctionStatus })
  async getSellerAuctions(@GetUser() user: any, @Query() query: QueryAuctionsDto) {
    return this.auctionService.getSellerAuctions(user.id, query);
  }

  @Get('my/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '卖家的拍卖详情' })
  async getSellerAuctionById(@GetUser() user: any, @Param('id') id: string) {
    return this.auctionService.getSellerAuctionById(user.id, user.role, id);
  }

  @Get('my-bids')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我参与的拍卖' })
  async getMyBidAuctions(@GetUser() user: any) {
    return this.auctionService.getMyBidAuctions(user.id);
  }

  @Get('my-wins')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我中标的拍卖' })
  async getMyWinAuctions(@GetUser() user: any) {
    return this.auctionService.getMyWinAuctions(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '拍卖详情' })
  async getAuctionById(@Param('id') id: string) {
    return this.auctionService.getAuctionById(id);
  }

  @Get(':id/bids')
  @ApiOperation({ summary: '出价历史' })
  async getAuctionBids(@Param('id') id: string) {
    return this.auctionService.getAuctionBids(id);
  }

  @Get(':id/ranking')
  @ApiOperation({ summary: '当前排名' })
  async getAuctionRanking(@Param('id') id: string) {
    return this.auctionService.getAuctionRanking(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建拍卖' })
  async createAuction(@GetUser() user: any, @Body() dto: CreateAuctionDto) {
    return this.auctionService.createAuction(user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改拍卖（PENDING 状态）' })
  async updateAuction(
    @GetUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateAuctionDto,
  ) {
    return this.auctionService.updateAuction(user.id, user.role, id, dto);
  }

  @Patch(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '开始拍卖' })
  async startAuction(@GetUser() user: any, @Param('id') id: string) {
    return this.auctionService.startAuction(user.id, user.role, id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '落锤结束' })
  async endAuction(@GetUser() user: any, @Param('id') id: string) {
    return this.auctionService.endAuction(user.id, user.role, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消拍卖（管理员）' })
  async cancelAuction(@GetUser() user: any, @Param('id') id: string) {
    return this.auctionService.cancelAuction(user.id, user.role, id);
  }
}
