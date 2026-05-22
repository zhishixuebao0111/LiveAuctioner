import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DefaultAdminService implements OnModuleInit {
  private readonly logger = new Logger(DefaultAdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
    const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';

    const existing = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, role: true },
    });

    if (existing) {
      if (existing.role !== Role.ADMIN) {
        this.logger.warn(`Default admin username "${username}" already exists but is not ADMIN`);
      }
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    this.logger.log(`Default admin account created: ${username}`);
  }
}
