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
    'any.required': 'DATABASE_URL is required (e.g. postgresql://user:pass@host:5432/db or file:./dev.db)',
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
  CSRF_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required().messages({
      'string.min': 'CSRF_SECRET must be at least 32 characters in production',
      'any.required': 'CSRF_SECRET is required in production',
    }),
    otherwise: Joi.optional(),
  }),

  // ── CORS ─────────────────────────────────────────────────────────────────────
  ALLOWED_ORIGINS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required().messages({
      'any.required': 'ALLOWED_ORIGINS is required in production (comma-separated list)',
    }),
    otherwise: Joi.optional().default(''),
  }),

  // ── Pesapal payments ─────────────────────────────────────────────────────────
  PESAPAL_CONSUMER_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }),

  PESAPAL_CONSUMER_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default(''),
  }),

  PESAPAL_BASE_URL: Joi.string()
    .uri()
    .default('https://cybqa.pesapal.com/pesapalv3'), // sandbox default

  PESAPAL_IPN_URL: Joi.string().uri().optional(),

  // ── Frontend URL (used for CORS, email links) ─────────────────────────────────
  FRONTEND_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('http://localhost:5173'),
  }),
}).options({ allowUnknown: true }); // Allow extra vars (e.g. CI system vars)
