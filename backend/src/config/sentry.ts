/**
 * Sentry error monitoring initialisation.
 * Call initSentry() BEFORE NestFactory.create() so Sentry instruments
 * all async contexts from the very start.
 *
 * No-ops gracefully when SENTRY_DSN is not set (dev / CI environments).
 */

import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // disabled — no DSN configured

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.npm_package_version,
    // Capture 10% of transactions as performance traces in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Never send PII — scrub request bodies / cookies
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip any cookie header that might have leaked into the event
      if (event.request?.cookies) {
        (event.request as any).cookies = '[Filtered]';
      }
      if (event.request?.headers?.cookie) {
        event.request.headers.cookie = '[Filtered]';
      }
      return event;
    },
  });
}

/** Capture an exception explicitly (e.g. from a catch block). */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
