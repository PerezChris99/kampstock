/* eslint-disable */
/**
 * Local end-to-end PURCHASE ORDER flow test against the PRODUCTION serverless
 * entry (dist/vercel-entry.js → createNestServer). Exercises the complete
 * flow a real user would follow:
 *
 *   demo login (manager) → create supplier → create product → create PO
 *   (server-computed totals) → status state machine → partial receive →
 *   full receive → stock updated → terminal-state guards → role enforcement.
 *
 * Run: node test-po-local.js
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

  const jarHeader = () =>
    Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

  function storeSetCookies(res) {
    for (const line of res.headers['set-cookie'] || []) {
      const [pair] = line.split(';');
      const idx = pair.indexOf('=');
      cookies[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
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
            resolve({ status: res.statusCode, body: json });
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
    results.push({ name, ok: !!cond });
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
  }

  async function csrf() {
    const r = await request('GET', '/api/auth/csrf');
    return r.body && r.body.csrfToken;
  }
  async function login(username, password) {
    cookies = {};
    const token = await csrf();
    const r = await request('POST', '/api/auth/login', {
      body: { username, password },
      headers: token ? { 'X-CSRF-Token': token } : {},
    });
    return r;
  }
  // All state-changing requests need the CSRF double-submit header
  async function post(path, body) {
    return request('POST', path, {
      body,
      headers: { 'X-CSRF-Token': cookies['csrf_token'] ?? (await csrf()) },
    });
  }
  async function patch(path, body) {
    return request('PATCH', path, {
      body,
      headers: { 'X-CSRF-Token': cookies['csrf_token'] ?? (await csrf()) },
    });
  }

  const uniq = Date.now().toString(36).toUpperCase();

  // ── 1. Demo credentials work (manager is advertised on the login page) ──
  const managerLogin = await login('manager', 'manager123');
  check('demo login manager/manager123 is 200', managerLogin.status === 200, `status ${managerLogin.status} body=${JSON.stringify(managerLogin.body)}`);

  const cashierProbe = await login('cashier', 'cashier123');
  check('demo login cashier/cashier123 is 200', cashierProbe.status === 200, `status ${cashierProbe.status}`);
  const storekeeperProbe = await login('storekeeper', 'store123');
  check('demo login storekeeper/store123 is 200', storekeeperProbe.status === 200, `status ${storekeeperProbe.status}`);

  // Continue the flow as manager (can manage POs)
  await login('manager', 'manager123');

  // ── 2. Create prerequisites: supplier, category, product, location ──
  const sup = await post('/api/suppliers', { name: `E2E Supplier ${uniq}` });
  check('create supplier is 2xx', sup.status === 201 || sup.status === 200, `status ${sup.status} body=${JSON.stringify(sup.body)}`);
  const supplierId = sup.body && sup.body.id;

  const cat = await post('/api/categories', { name: `E2E Cat ${uniq}` });
  check('create category is 2xx', cat.status === 201 || cat.status === 200, `status ${cat.status}`);

  const prod = await post('/api/products', {
    name: `E2E Product ${uniq}`,
    sku: `E2E-${uniq}`,
    categoryId: cat.body && cat.body.id,
    units: [
      { unitName: 'pcs', conversionFactor: 1, buyingPrice: 1000, sellingPriceRetail: 1500, sellingPriceWholesale: 1300 },
    ],
  });
  check('create product is 2xx', prod.status === 201 || prod.status === 200, `status ${prod.status} body=${JSON.stringify(prod.body).slice(0, 200)}`);
  const productId = prod.body && prod.body.id;

  const locs = await request('GET', '/api/stock/locations');
  const locationId = Array.isArray(locs.body) && locs.body[0] && locs.body[0].id;
  check('a stock location exists (bootstrap-seeded)', !!locationId, `locationId=${locationId}`);

  // ── 3. Create the PO — totals must be computed server-side ──
  const po = await post('/api/purchase-orders', {
    supplierId,
    notes: 'E2E test order',
    lines: [{ productId, quantity: 10, unitPrice: 1000, discount: 500 }],
  });
  check('create PO is 2xx', po.status === 201 || po.status === 200, `status ${po.status} body=${JSON.stringify(po.body).slice(0, 300)}`);
  const poId = po.body && po.body.id;
  check('PO starts as DRAFT', po.body && po.body.status === 'DRAFT', po.body && po.body.status);
  check('PO grandTotal computed server-side (10*1000-500=9500)', Number(po.body && po.body.grandTotal) === 9500, `grandTotal=${po.body && po.body.grandTotal}`);
  check('PO line lineTotal computed (9500)', po.body && po.body.lines && Number(po.body.lines[0].lineTotal) === 9500, `lineTotal=${po.body && po.body.lines && po.body.lines[0].lineTotal}`);

  // Over-discount must be rejected
  const badPo = await post('/api/purchase-orders', {
    supplierId,
    lines: [{ productId, quantity: 1, unitPrice: 100, discount: 500 }],
  });
  check('over-discount PO rejected with 400', badPo.status === 400, `status ${badPo.status}`);

  // ── 4. State machine ──
  const skip = await patch(`/api/purchase-orders/${poId}/status`, { status: 'RECEIVED' });
  check('DRAFT → RECEIVED rejected (400)', skip.status === 400, `status ${skip.status}`);

  const sent = await patch(`/api/purchase-orders/${poId}/status`, { status: 'SENT' });
  check('DRAFT → SENT is 200', sent.status === 200, `status ${sent.status} body=${JSON.stringify(sent.body).slice(0, 150)}`);

  const badStatus = await patch(`/api/purchase-orders/${poId}/status`, { status: 'NONSENSE' });
  check('invalid status value rejected (400)', badStatus.status === 400, `status ${badStatus.status}`);

  // ── 5. Partial receive → PO becomes PARTIAL, stock goes up ──
  const gr1 = await post('/api/goods-receipts', {
    purchaseOrderId: poId,
    locationId,
    lines: [{ productId, quantity: 4, unitCost: 1000 }],
  });
  check('partial goods receipt is 2xx', gr1.status === 201 || gr1.status === 200, `status ${gr1.status} body=${JSON.stringify(gr1.body).slice(0, 200)}`);

  let poNow = await request('GET', `/api/purchase-orders/${poId}`);
  check('PO status is PARTIAL after under-receipt', poNow.body && poNow.body.status === 'PARTIAL', poNow.body && poNow.body.status);

  // ── 6. Receive the remainder → RECEIVED ──
  const gr2 = await post('/api/goods-receipts', {
    purchaseOrderId: poId,
    locationId,
    lines: [{ productId, quantity: 6, unitCost: 1000 }],
  });
  check('final goods receipt is 2xx', gr2.status === 201 || gr2.status === 200, `status ${gr2.status}`);

  poNow = await request('GET', `/api/purchase-orders/${poId}`);
  check('PO status is RECEIVED after full receipt', poNow.body && poNow.body.status === 'RECEIVED', poNow.body && poNow.body.status);

  // Stock must reflect the received quantity (4 + 6 = 10)
  const stock = await request('GET', `/api/stock/items?productId=${productId}`);
  const stockRows = Array.isArray(stock.body) ? stock.body : (stock.body && stock.body.data) || [];
  const onHand = stockRows
    .filter((s) => s.productId === productId)
    .reduce((sum, s) => sum + Number(s.quantityOnHand), 0);
  check('stock on hand is 10 after receipts', onHand === 10, `onHand=${onHand}`);

  // ── 7. Terminal-state guards ──
  const gr3 = await post('/api/goods-receipts', {
    purchaseOrderId: poId,
    locationId,
    lines: [{ productId, quantity: 1, unitCost: 1000 }],
  });
  check('receiving on RECEIVED PO rejected (400)', gr3.status === 400, `status ${gr3.status}`);

  const reopen = await patch(`/api/purchase-orders/${poId}/status`, { status: 'SENT' });
  check('RECEIVED → SENT rejected (400)', reopen.status === 400, `status ${reopen.status}`);

  // ── 8. Role enforcement: cashier cannot create POs ──
  await login('cashier', 'cashier123');
  const forbidden = await post('/api/purchase-orders', {
    supplierId,
    lines: [{ productId, quantity: 1, unitPrice: 100 }],
  });
  check('cashier cannot create PO (403)', forbidden.status === 403, `status ${forbidden.status}`);

  // ── Summary ──
  const passed = results.filter((r) => r.ok).length;
  console.log(`\n[test] ${passed}/${results.length} checks passed`);
  if (passed !== results.length) {
    console.log('[test] FAILURES: ' + results.filter((r) => !r.ok).map((r) => r.name).join(' | '));
    process.exitCode = 1;
  } else {
    console.log('[test] ALL PURCHASE ORDER CHECKS PASSED');
  }

  server.close();
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error('[test] Fatal:', err);
  process.exit(1);
});
