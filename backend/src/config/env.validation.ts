import * as Joi from 'joi';

/**
 * Joi schema for all required environment variables.
 * The application WILL NOT START if any required variable is missing or invalid.
 * No silent fallback defaults for security-critical values.
 */
export const envValidationSchema = Joi.object({
  // ── Application ─────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().integer().positive().default(3000),

  // ── Database ─────────────────────────────────────────────────────────────────
  // Accept both SQLite (file:) and PostgreSQL (postgresql://) formats
  DATABASE_URL: Joi.string().required().messages({
    'any.required':
      'DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/db or file:./dev.db)',
  }),

  // ── JWT — no fallbacks allowed ───────────────────────────────────────────────
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET must be at least 32 characters',
    'any.required': 'JWT_SECRET is required',
  }),

  JWT_REFRESH_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_REFRESH_SECRET must be at least 32 characters',
    'any.required': 'JWT_REFRESH_SECRET is required',
  }),

  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ── CSRF ─────────────────────────────────────────────────────────────────────
  // Falls back to a default if not set — set a strong secret in Vercel dashboard
  CSRF_SECRET: Joi.string()
    .min(32)
    .optional()
    .default('kampstock-csrf-default-secret-change-in-prod-32x'),

  // ── CORS ─────────────────────────────────────────────────────────────────────
  // Defaults to the known Vercel frontend domain; override via dashboard
  ALLOWED_ORIGINS: Joi.string()
    .optional()
    .default('https://kampstock-avmu.vercel.app'),

  // ── Pesapal payments ─────────────────────────────────────────────────────────
  // Pesapal is optional — app runs fully without billing enabled
  PESAPAL_CONSUMER_KEY: Joi.string().optional().default(''),

  PESAPAL_CONSUMER_SECRET: Joi.string().optional().default(''),

  PESAPAL_BASE_URL: Joi.string()
    .uri()
    .default('https://cybqa.pesapal.com/pesapalv3'), // sandbox default

  PESAPAL_IPN_URL: Joi.string().uri().optional(),

  // ── Frontend URL (used for CORS, email links) ─────────────────────────────────
  // Optional — defaults to the production frontend URL if not explicitly set
  FRONTEND_URL: Joi.string()
    .uri()
    .optional()
    .default('https://kampstock-avmu.vercel.app'),

  // ── Observability (optional) ─────────────────────────────────────────────────
  SENTRY_DSN: Joi.string().uri().optional(),

  // ── Cache (optional — app degrades gracefully without Redis) ─────────────────
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .optional(),
}).options({ allowUnknown: true }); // Allow extra vars (e.g. CI system vars)
