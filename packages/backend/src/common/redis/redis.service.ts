import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: RedisClientType;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    this.client.on('error', (error) => {
      this.logger.error(`Redis error: ${error.message}`);
    });
  }

  async onModuleInit() {
    if (!this.client.isOpen) {
      await this.client.connect();
      this.logger.log('Redis connected');
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  getClient() {
    return this.client;
  }
}
