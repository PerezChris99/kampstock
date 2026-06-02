/**
 * Structured logger configuration using Winston + nest-winston.
 * - Development: colourised, human-readable console output
 * - Production: JSON lines to stdout (consumed by log aggregators)
 */

import { createLogger, format, transports } from 'winston';
import { utilities as nestWinstonUtilities } from 'nest-winston';

const isProd = process.env.NODE_ENV === 'production';

export const winstonLogger = createLogger({
  level: isProd ? 'warn' : 'debug',
  format: isProd
    ? format.combine(
        format.timestamp(),
        format.errors({ stack: false }), // never log stack traces in prod
        format.json(),
      )
    : format.combine(
        format.timestamp({ format: 'HH:mm:ss' }),
        format.errors({ stack: true }),
        nestWinstonUtilities.format.nestLike('KampStock', {
          colors: true,
          prettyPrint: true,
        }),
      ),
  transports: [
    new transports.Console({
      // Suppress all output during Jest runs to keep test output clean
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});
