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
  if (!serverPromise) {
    // Loaded from compiled output: dist/vercel-entry.js
    const { createNestServer } = require('../dist/vercel-entry');
    serverPromise = createNestServer();
  }
  const server = await serverPromise;
  return server(req, res);
};
