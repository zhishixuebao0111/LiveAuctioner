import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DepositService } from './deposit.service';

@ApiTags('保证金')
@Controller('deposits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Get('my')
  @ApiOperation({ summary: '我的保证金记录' })
  async getMyDeposits(@GetUser() user: any) {
    return this.depositService.getMyDeposits(user.id);
  }
}
