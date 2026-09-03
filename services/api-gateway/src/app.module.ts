/**
 * API Gateway App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { GatewayModule } from './gateway/gateway.module';
import { HealthModule, LoggerModule, AuthModule } from '@flipflop/shared';
import { CredentialSelfReporter } from './health/credential-self-reporter';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    LoggerModule,
    AuthModule,
    HealthModule,
    GatewayModule,
  ],
  controllers: [HealthController],
  providers: [CredentialSelfReporter],
})
export class AppModule {}

