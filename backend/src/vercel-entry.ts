/**
 * Vercel Serverless entry point for KampStock API.
 *
 * Unlike main.ts (which calls app.listen()), this module calls app.init()
 * and hands the underlying Express instance to the Vercel handler so that
 * requests are dispatched through NestJS without opening a TCP port.
 */
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import {
  ValidationPipe,
  HttpException,
  HttpStatus,
  ArgumentsHost,
  ExceptionFilter,
  Catch,
} from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';
import * as bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string' ? res : ((res as any)?.message ?? message);
    } else {
      // Non-HTTP exception → log the real error + stack so the cause is
      // visible in Vercel runtime logs (previously these surfaced as an
      // opaque 500 with no diagnostic information).
      const req = ctx.getRequest();
      console.error(
        `[500] ${req?.method ?? '?'} ${req?.url ?? '?'} →`,
        exception instanceof Error
          ? `${exception.name}: ${exception.message}\n${exception.stack}`
          : exception,
      );
    }

    httpAdapter.reply(
      ctx.getResponse(),
      { statusCode: status, message },
      status,
    );
  }
}

const expressApp: Express = express();
let isBootstrapped = false;
let isDbInitialized = false;

/**
 * Runs once per cold start (at runtime, where DATABASE_URL is available).
 * Creates the default tenant + admin user if the DB has no admin yet.
 *
 * NOTE: The Prisma schema must already exist in Neon. It is provisioned by
 * running `npx prisma db push --schema=prisma-pg/schema.prisma` once against
 * the production DATABASE_URL (see README). We deliberately do NOT run db push
 * here on every cold start because spawning the Prisma CLI inside a serverless
 * function is slow and unreliable and was causing intermittent 500s.
 */
async function initializeDatabase(prisma: PrismaService): Promise<void> {
  if (isDbInitialized) return;
  isDbInitialized = true;

  try {
    const existing = await prisma.user.findFirst({
      where: { username: 'admin' },
    });
    if (existing) {
      console.log('[bootstrap] Already seeded — skipping');
      return;
    }

    await prisma.tenant.upsert({
      where: { subdomain: 'kampstock' },
      update: {},
      create: {
        name: 'KampStock',
        subdomain: 'kampstock',
        plan: 'enterprise',
        isActive: true,
        businessType: 'retail',
        description: 'Default KampStock tenant',
      },
    });

    const adminRole = await prisma.role.upsert({
      where: { name_tenantId: { name: 'Admin', tenantId: 1 } },
      update: {},
      create: {
        name: 'Admin',
        permissions: JSON.stringify({ all: true }),
        tenantId: 1,
      },
    });

    await prisma.user.create({
      data: {
        name: 'Nakiganda Christine',
        username: 'admin',
        passwordHash: await bcrypt.hash('K@mpSt0ck#Admin!2026', 12),
        roleId: adminRole.id,
        tenantId: 1,
      },
    });

    console.log(
      '[bootstrap] Default tenant and admin user created successfully',
    );
  } catch (err: unknown) {
    console.error('[bootstrap] Seed failed:', (err as Error).message ?? err);
  }
}

export async function createNestServer(): Promise<Express> {
  if (isBootstrapped) return expressApp;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn'] },
  );

  app.use(compression());
  // Body parsers — REQUIRED so JSON request bodies (login credentials, etc.)
  // are populated on req.body. Without these, DTO validation sees undefined
  // fields and rejects every POST with 400.
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ limit: '5mb', extended: true }));
  // Cookie parser — REQUIRED so req.cookies is populated for httpOnly JWT
  // access/refresh tokens and the CSRF double-submit cookie.
  app.use(cookieParser());
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // handled by Vercel edge headers
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  // Build allowed-origins list.
  // PRODUCTION_FRONTEND is the canonical frontend URL — always allowed so that
  // login works even if ALLOWED_ORIGINS / FRONTEND_URL env vars are not set in
  // the Vercel dashboard. ConfigService Joi defaults don't apply here because
  // vercel-entry.ts reads process.env directly before NestJS is fully wired.
  const PRODUCTION_FRONTEND = 'https://kampstock-avmu.vercel.app';

  const rawOrigins = new Set<string>();
  rawOrigins.add(PRODUCTION_FRONTEND); // unconditional fallback

  // Add any explicitly configured origins (comma-separated list)
  const envAllowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  envAllowed.forEach((o) => rawOrigins.add(o));

  // Also honour FRONTEND_URL if set (overrides / extends the default)
  const envFrontend = process.env.FRONTEND_URL;
  if (envFrontend) rawOrigins.add(envFrontend);

  const allowedOrigins = [...rawOrigins];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Deny without throwing — throwing an Error here propagates to the
      // exception filter and surfaces as a 500 on the preflight, which is
      // misleading. Returning false simply omits CORS headers so the browser
      // blocks the response cleanly.
      console.warn(`[cors] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-CSRF-Token',
      'X-Tenant-Subdomain',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  app.setGlobalPrefix('api');
  await app.init();

  // Initialize DB schema + seed at runtime (runs once per cold start).
  // MUST be awaited: if we return before the admin/tenant are seeded, the very
  // first request after a cold start races the seed and fails (e.g. login 401
  // because the admin user does not exist yet).
  const prisma = app.get(PrismaService);
  await initializeDatabase(prisma).catch((err) =>
    console.error('[bootstrap] Unexpected error:', err),
  );

  isBootstrapped = true;
  return expressApp;
}
