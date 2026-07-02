import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ProductsService } from './products/products.service';
import { WarehouseService } from './products/warehouse.service';
import { ClientsModule, LoggerModule, PrismaModule } from '@flipflop/shared';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    LoggerModule,
    ClientsModule,
  ],
  providers: [
    ProductsService,
    { provide: WarehouseService, useValue: {} },
  ],
})
class OfferReconciliationCliModule {}

type CliOptions = {
  dryRun?: boolean;
  limit?: number;
  productIds?: string[];
  requestedBy?: string;
  requestId?: string;
};

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { productIds: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [key, inlineValue] = arg.split('=', 2);
    const nextValue = inlineValue ?? argv[index + 1];
    const consumeNext = inlineValue === undefined && nextValue && !nextValue.startsWith('--');

    switch (key) {
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--limit':
        options.limit = Number(nextValue);
        if (consumeNext) index += 1;
        break;
      case '--product-id':
      case '--catalog-product-id':
        if (nextValue) options.productIds?.push(nextValue);
        if (consumeNext) index += 1;
        break;
      case '--requested-by':
        options.requestedBy = nextValue;
        if (consumeNext) index += 1;
        break;
      case '--request-id':
        options.requestId = nextValue;
        if (consumeNext) index += 1;
        break;
      case '--help':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function printHelp() {
  console.log(`Usage: npm run reconcile:offers -- [options]

Options:
  --dry-run                         Report changes without updating local products
  --limit <number>                  Maximum linked local products to scan (default 500, max 1000)
  --product-id <id>                 Limit to a local product id or catalogProductId; repeatable
  --catalog-product-id <id>         Alias for --product-id
  --requested-by <actor>            Actor label for audit evidence
  --request-id <id>                 Stable idempotency key component for this run
`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const app = await NestFactory.createApplicationContext(OfferReconciliationCliModule, { logger: false });
  try {
    const service = app.get(ProductsService);
    const result = await service.reconcileCatalogLinkedOffers(options);
    console.log(JSON.stringify(result, null, 2));
    if (result.totals.failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
