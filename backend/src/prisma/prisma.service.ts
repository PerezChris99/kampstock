import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../generated/client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

type PC = InstanceType<typeof PrismaClient>;

function buildAdapter(url: string) {
  if (url.startsWith('postgresql') || url.startsWith('postgres')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaPg } = require('@prisma/adapter-pg');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Pool } = require('pg');
    return new PrismaPg(new Pool({ connectionString: url }));
  }
  return new PrismaBetterSqlite3({ url });
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly _db: PC;

  constructor() {
    const url = process.env.DATABASE_URL || 'file:./prisma/dev.db';
    this._db = new PrismaClient({ adapter: buildAdapter(url) });
  }

  async onModuleInit() {
    // Resilient connect: on serverless (Neon pooler) a cold-start connection
    // can transiently fail or time out. Do NOT let that reject app bootstrap —
    // if it did, the whole lambda instance would serve 500 for every request
    // (including endpoints that never touch the DB). Prisma connects lazily on
    // the first query anyway, so a failed eager connect is fully recoverable.
    try {
      await this._db.$connect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(
        '[prisma] Eager $connect failed — will connect lazily on first query:',
        (err as Error)?.message ?? err,
      );
    }
  }
  async onModuleDestroy() {
    await this._db.$disconnect();
  }

  get $transaction(): PC['$transaction'] {
    return this._db.$transaction.bind(this._db);
  }
  get $queryRaw(): PC['$queryRaw'] {
    return this._db.$queryRaw.bind(this._db);
  }

  // Models
  get user(): PC['user'] {
    return this._db.user;
  }
  get role(): PC['role'] {
    return this._db.role;
  }
  get category(): PC['category'] {
    return this._db.category;
  }
  get product(): PC['product'] {
    return this._db.product;
  }
  get productUnit(): PC['productUnit'] {
    return this._db.productUnit;
  }
  get priceHistory(): PC['priceHistory'] {
    return this._db.priceHistory;
  }
  get stockLocation(): PC['stockLocation'] {
    return this._db.stockLocation;
  }
  get stockItem(): PC['stockItem'] {
    return this._db.stockItem;
  }
  get stockMovement(): PC['stockMovement'] {
    return this._db.stockMovement;
  }
  get supplier(): PC['supplier'] {
    return this._db.supplier;
  }
  get supplierInvoice(): PC['supplierInvoice'] {
    return this._db.supplierInvoice;
  }
  get purchaseOrder(): PC['purchaseOrder'] {
    return this._db.purchaseOrder;
  }
  get purchaseOrderLine(): PC['purchaseOrderLine'] {
    return this._db.purchaseOrderLine;
  }
  get goodsReceipt(): PC['goodsReceipt'] {
    return this._db.goodsReceipt;
  }
  get goodsReceiptLine(): PC['goodsReceiptLine'] {
    return this._db.goodsReceiptLine;
  }
  get customer(): PC['customer'] {
    return this._db.customer;
  }
  get sale(): PC['sale'] {
    return this._db.sale;
  }
  get saleLine(): PC['saleLine'] {
    return this._db.saleLine;
  }
  get payment(): PC['payment'] {
    return this._db.payment;
  }
  get expense(): PC['expense'] {
    return this._db.expense;
  }
  get invoiceFiscal(): PC['invoiceFiscal'] {
    return this._db.invoiceFiscal;
  }
  get auditLog(): PC['auditLog'] {
    return this._db.auditLog;
  }
  get tenant(): PC['tenant'] {
    return this._db.tenant;
  }
  get subscription(): PC['subscription'] {
    return this._db.subscription;
  }
  get notification(): PC['notification'] {
    return this._db.notification;
  }
  get announcement(): PC['announcement'] {
    return this._db.announcement;
  }
  get accountLock(): PC['accountLock'] {
    return this._db.accountLock;
  }
}
