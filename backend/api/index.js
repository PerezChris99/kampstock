/**
 * Vercel serverless function handler.
 *
 * This file is intentionally plain CommonJS — it loads the pre-compiled
 * NestJS app from dist/ (built by `npm run vercel-build`) and dispatches
 * every incoming request through it, keeping the NestJS instance warm
 * across invocations within the same Lambda container.
 */

let serverPromise;

module.exports = async function handler(req, res) {
  try {
    if (!serverPromise) {
      // Loaded from compiled output: dist/vercel-entry.js
      const { createNestServer } = require('../dist/vercel-entry');
      serverPromise = createNestServer();
    }
    const server = await serverPromise;
    return server(req, res);
  } catch (err) {
    // CRITICAL: if bootstrap rejected, do NOT keep the rejected promise cached —
    // otherwise this lambda instance would serve 500 for every subsequent
    // request until it is recycled. Reset so the next request retries a clean
    // bootstrap, and return a retryable 503 instead of an opaque crash.
    serverPromise = undefined;
    // eslint-disable-next-line no-console
    console.error('[handler] Bootstrap/dispatch failed:', err && err.stack ? err.stack : err);
    if (!res.headersSent) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          statusCode: 503,
          message: 'Service temporarily unavailable. Please retry.',
        }),
      );
    }
  }
};
