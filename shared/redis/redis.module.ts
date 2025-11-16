/**
 * Redis Module
 * Provides Redis client for NestJS services
 */

import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { redisConfig } from './redis.config';

@Global()
@Module({
  imports: [
    NestRedisModule.forRoot({
      type: 'single',
      options: redisConfig,
    }),
  ],
  exports: [NestRedisModule],
})
export class RedisModule {}
