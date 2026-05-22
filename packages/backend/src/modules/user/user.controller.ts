import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreditService } from '../credit/credit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RechargeDto } from './dto/recharge.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Role } from '@prisma/client';

@ApiTags('用户')
@Controller()
export class UserController {
  constructor(
    private userService: UserService,
    private creditService: CreditService,
  ) {}

  // ========== 当前用户相关接口 ==========
  @Get('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@GetUser() user: any) {
    return this.userService.getProfile(user.id);
  }

  @Patch('users/me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改个人信息' })
  async updateProfile(@GetUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.id, dto);
  }

  @Patch('users/me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@GetUser() user: any, @Body() dto: ChangePasswordDto) {
    await this.userService.changePassword(user.id, dto);
  }

  @Get('users/me/balance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询余额' })
  async getBalance(@GetUser() user: any) {
    return this.userService.getBalance(user.id);
  }

  @Post('users/me/recharge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '充值（模拟）' })
  async recharge(@GetUser() user: any, @Body() dto: RechargeDto) {
    return this.userService.recharge(user.id, dto);
  }

  // ========== 地址管理 ==========
  @Get('users/me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取地址列表' })
  async getAddresses(@GetUser() user: any) {
    return this.userService.getAddresses(user.id);
  }

  @Post('users/me/addresses')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增地址' })
  async createAddress(@GetUser() user: any, @Body() dto: CreateAddressDto) {
    return this.userService.createAddress(user.id, dto);
  }

  @Patch('users/me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改地址' })
  async updateAddress(
    @GetUser() user: any,
    @Param('id') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.userService.updateAddress(user.id, addressId, dto);
  }

  @Delete('users/me/addresses/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除地址' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(@GetUser() user: any, @Param('id') addressId: string) {
    await this.userService.deleteAddress(user.id, addressId);
  }

  // ========== 收藏管理 ==========
  @Get('users/me/favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '我的收藏列表' })
  async getFavorites(@GetUser() user: any) {
    return this.userService.getFavorites(user.id);
  }

  @Post('users/me/favorites/auctions/:auctionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '收藏拍卖' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async addFavorite(@GetUser() user: any, @Param('auctionId') auctionId: string) {
    await this.userService.addFavorite(user.id, auctionId);
  }

  @Delete('users/me/favorites/auctions/:auctionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消收藏' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFavorite(@GetUser() user: any, @Param('auctionId') auctionId: string) {
    await this.userService.removeFavorite(user.id, auctionId);
  }

  // ========== 信用分 ==========
  @Get('users/me/credit-logs')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取信用分变动记录' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getCreditLogs(
    @GetUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.creditService.getCreditLogs(user.id, parseInt(page || '1'), parseInt(limit || '20'));
  }

  @Get('users/me/credit-level')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取信用等级信息' })
  async getCreditLevel(@GetUser() user: any) {
    return this.creditService.checkCreditLevel(user.id);
  }

  // ========== 管理员接口 ==========
  @Get('admin/users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户列表（管理员）' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'BANNED', 'SUSPENDED'] })
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: Role,
    @Query('status') status?: 'ACTIVE' | 'BANNED' | 'SUSPENDED',
  ) {
    return this.userService.getUsers(
      parseInt(page || '1'),
      parseInt(limit || '10'),
      role,
      status,
    );
  }

  @Get('admin/users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户详情（管理员）' })
  async getUserById(@Param('id') userId: string) {
    return this.userService.getUserById(userId);
  }

  @Patch('admin/users/:id/ban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '封禁用户' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async banUser(
    @GetUser() operator: any,
    @Param('id') userId: string,
    @Body('reason') reason?: string,
  ) {
    await this.userService.banUser(userId, operator.id, reason);
  }

  @Patch('admin/users/:id/unban')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: '解封用户' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async unbanUser(@Param('id') userId: string) {
    await this.userService.unbanUser(userId);
  }
}
