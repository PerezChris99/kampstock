import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus, ArgumentsHost, ExceptionFilter, Catch } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonLogger } from './config/logger';
import { initSentry, captureException } from './config/sentry';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

// Initialise Sentry BEFORE any NestJS code runs
initSentry();

/** Sanitize all error responses — never expose stack traces or Prisma internals */
@Catch()
class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any)?.message ?? message;
    } else {
      // Unexpected error — report to Sentry
      captureException(exception);
      if (!isProd) {
        message = (exception as any)?.message ?? message;
      }
    }

    httpAdapter.reply(ctx.getResponse(), { statusCode: status, message }, status);
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: winstonLogger }),
  });

  const isProd = process.env.NODE_ENV === 'production';

  // ── Compression ──────────────────────────────────────────────────────────────
  // Saves bandwidth — critical for Uganda 3G/4G connections
  app.use(compression());

  // ── Cookie parser (required for httpOnly JWT cookies) ─────────────────────────
  app.use(cookieParser());

  // ── Security headers via Helmet ───────────────────────────────────────────────
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    hsts: isProd ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],     // prevent clickjacking
        upgradeInsecureRequests: isProd ? [] : null,
      },
    },
    // Prevent MIME-type sniffing
    xContentTypeOptions: true,
    // Block legacy IE from executing downloads in site context
    xDownloadOptions: true,
    // Disable FLoC / interest-cohort tracking
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  }));

  // ── Global validation — whitelist & strip unknown fields ──────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  // ── Sanitized exception filter ────────────────────────────────────────────────
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  // ── CORS ──────────────────────────────────────────────────────────────────────
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // Allow server-to-server (no origin) in dev; block in prod
      if (!origin) {
        return callback(null, !isProd);
      }
      // In dev: allow any localhost port; in prod: use ALLOWED_ORIGINS list
      if (!isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Subdomain', 'X-CSRF-Token'],
  });

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`KampStock API running on http://localhost:${port}/api [${isProd ? 'production' : 'development'}]`);
}
bootstrap();

