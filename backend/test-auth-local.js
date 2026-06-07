/* eslint-disable */
/**
 * Local end-to-end auth smoke test against the PRODUCTION serverless entry
 * (dist/vercel-entry.js → createNestServer). This is the exact code path that
 * runs on Vercel, so passing here means the prod auth wiring is correct.
 *
 * Run: node test-auth-local.js
 */
const http = require('http');

async function main() {
  const { createNestServer } = require('./dist/vercel-entry');
  const app = await createNestServer();

  const server = http.createServer(app);
  await new Promise((res) => server.listen(0, res));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  console.log(`\n[test] Server listening on ${base}\n`);

  const ORIGIN = 'https://kampstock-avmu.vercel.app';
  let cookies = {};

  function jarHeader() {
    return Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }
  function storeSetCookies(res) {
    const sc = res.headers['set-cookie'] || [];
    for (const line of sc) {
      const [pair] = line.split(';');
      const idx = pair.indexOf('=');
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      cookies[name] = value;
    }
  }

  function request(method, path, { body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const req = http.request(
        base + path,
        {
          method,
          headers: {
            Origin: ORIGIN,
            'Content-Type': 'application/json',
            Cookie: jarHeader(),
            ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
            ...headers,
          },
        },
        (res) => {
          let buf = '';
          res.on('data', (c) => (buf += c));
          res.on('end', () => {
            storeSetCookies(res);
            let json;
            try {
              json = buf ? JSON.parse(buf) : null;
            } catch {
              json = buf;
            }
            resolve({ status: res.statusCode, headers: res.headers, body: json });
          });
        },
      );
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  const results = [];
  function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail });
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
  }

  // 1. OPTIONS preflight on /api/auth/login from the real frontend origin
  const pre = await request('OPTIONS', '/api/auth/login', {
    headers: {
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-csrf-token',
    },
  });
  check('OPTIONS /api/auth/login preflight is 2xx', pre.status === 204 || pre.status === 200, `status ${pre.status}`);
  check('Preflight allows the frontend origin', pre.headers['access-control-allow-origin'] === ORIGIN, pre.headers['access-control-allow-origin'] || '(none)');
  check('Preflight allows credentials', pre.headers['access-control-allow-credentials'] === 'true', pre.headers['access-control-allow-credentials'] || '(none)');

  // 2. GET /api/auth/csrf → should be 200/304 and return a token + set cookie
  const csrf = await request('GET', '/api/auth/csrf');
  check('GET /api/auth/csrf is 2xx', csrf.status >= 200 && csrf.status < 400, `status ${csrf.status}`);
  const csrfToken = csrf.body && csrf.body.csrfToken;
  check('csrf endpoint returns a token', !!csrfToken, csrfToken ? `${String(csrfToken).slice(0, 8)}…` : '(null)');

  // 3. POST /api/auth/login with CORRECT credentials
  const goodLogin = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'K@mpSt0ck#Admin!2026' },
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  });
  check('POST /api/auth/login (valid creds) is 200', goodLogin.status === 200, `status ${goodLogin.status} body=${JSON.stringify(goodLogin.body)}`);
  check('login returns the user object', goodLogin.body && goodLogin.body.user && goodLogin.body.user.username === 'admin', JSON.stringify(goodLogin.body && goodLogin.body.user));
  check('login sets access_token cookie', !!cookies['access_token'], cookies['access_token'] ? 'set' : 'MISSING');
  check('login sets refresh_token cookie', !!cookies['refresh_token'], cookies['refresh_token'] ? 'set' : 'MISSING');

  // 4. Authenticated request using the access_token cookie (authorization works)
  const me = await request('GET', '/api/users');
  check('GET /api/users with auth cookie is NOT 401', me.status !== 401, `status ${me.status}`);

  // 5. POST /api/auth/login with WRONG password → must be 401 (not 400/500)
  const badLogin = await request('POST', '/api/auth/login', {
    body: { username: 'admin', password: 'definitely-wrong-password' },
    headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
  });
  check('POST /api/auth/login (wrong pw) is 401', badLogin.status === 401, `status ${badLogin.status} body=${JSON.stringify(badLogin.body)}`);

  // 6. Missing body → 400 (validation), proves body parser is wired
  const emptyLogin = await request('POST', '/api/auth/login', { body: {}, headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {} });
  check('POST /api/auth/login (empty body) is 400 validation', emptyLogin.status === 400, `status ${emptyLogin.status}`);

  // 7. Refresh flow using refresh_token cookie
  const refresh = await request('POST', '/api/auth/refresh');
  check('POST /api/auth/refresh is 200', refresh.status === 200, `status ${refresh.status}`);

  server.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n[test] ${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('[test] FAILURES:', failed.map((f) => f.name).join(' | '));
    process.exit(1);
  }
  console.log('[test] ALL AUTH CHECKS PASSED\n');
  process.exit(0);
}

main().catch((e) => {
  console.error('[test] Harness crashed:', e);
  process.exit(2);
});
