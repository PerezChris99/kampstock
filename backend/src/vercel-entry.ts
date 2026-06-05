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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

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

export async function createNestServer(): Promise<Express> {
  if (isBootstrapped) return expressApp;

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn'] },
  );

  app.use(compression());
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
      callback(new Error('Not allowed by CORS'));
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

  isBootstrapped = true;
  return expressApp;
}
