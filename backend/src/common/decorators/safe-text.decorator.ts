import { Transform } from 'class-transformer';

/**
 * Strips HTML tags, script injections, and javascript: URIs from a string value.
 * Used as a @Transform decorator on freetext DTO fields to prevent stored XSS.
 *
 * Only strips tags — does NOT modify plain text, numbers, or safe characters.
 * Does NOT use external dependencies (regex-based, zero overhead).
 */
function stripHtml(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return (
    value
      // Remove <script>...</script> blocks (case-insensitive, across newlines)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove <iframe>...</iframe> blocks
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remove javascript: URIs (in href, src, on* attributes, etc.)
      .replace(/javascript\s*:/gi, '')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      .trim()
  );
}

/**
 * Decorator: apply to any freetext string property on a DTO to strip HTML.
 *
 * Usage:
 *   @SafeText()
 *   @IsString()
 *   name: string;
 */
export function SafeText(): PropertyDecorator {
  return Transform(({ value }) => stripHtml(value));
}
