import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogClientService } from './catalog-client.service';
import { WarehouseClientService } from './warehouse-client.service';
import { OrderClientService } from './order-client.service';
import { LeadsClientService } from "./leads-client.service";
import { AiClientService } from './ai-client.service';
import { LoggerModule } from '../logger/logger.module';

@Global()
@Module({
  imports: [HttpModule, LoggerModule],
  providers: [CatalogClientService, WarehouseClientService, OrderClientService, LeadsClientService, AiClientService],
  exports: [CatalogClientService, WarehouseClientService, OrderClientService, LeadsClientService, AiClientService],
})
export class ClientsModule {}

