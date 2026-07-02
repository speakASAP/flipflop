import { Module } from '@nestjs/common';
import { StockEventsSubscriber } from './stock-events.subscriber';
import { CatalogEventsSubscriber } from './catalog-events.subscriber';
import { LoggerModule } from '../logger/logger.module';
import { PrismaModule } from '../database/prisma.module';

@Module({
  imports: [LoggerModule, PrismaModule],
  providers: [StockEventsSubscriber, CatalogEventsSubscriber],
  exports: [StockEventsSubscriber, CatalogEventsSubscriber],
})
export class RabbitMQModule {}

