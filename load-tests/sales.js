/**
 * k6 load test — POST /api/sales (Kampstock backend)
 *
 * Usage:
 *   k6 run load-tests/sales.js
 *
 * Environment variables (override via -e flag):
 *   BASE_URL   — backend base URL  (default: http://localhost:3000)
 *   USERNAME   — login username     (default: admin)
 *   PASSWORD   — login password     (default: Admin1234!)
 *
 * Scenario: ramp to 50 VUs over 30 s → sustain for 2 min → ramp down.
 * Pass thresholds: p(95) < 500 ms, error rate < 1 %.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const saleLatency = new Trend('sale_latency', true);

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // ramp up
    { duration: '2m', target: 50 }, // sustain
    { duration: '15s', target: 0 }, // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95th percentile under 500 ms
    errors: ['rate<0.01'], // < 1 % errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.USERNAME || 'admin';
const PASSWORD = __ENV.PASSWORD || 'Admin1234!';

// ---------------------------------------------------------------------------
// setup(): runs once before any VU — log in and return the auth cookie.
// ---------------------------------------------------------------------------
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  check(res, { 'login succeeded': (r) => r.status === 200 || r.status === 201 });

  // Extract httpOnly cookie value from Set-Cookie header for subsequent requests
  const setCookie = res.headers['Set-Cookie'] || '';
  const match = setCookie.match(/access_token=([^;]+)/);
  return { token: match ? match[1] : '' };
}

// ---------------------------------------------------------------------------
// Default function: each VU runs this in a loop.
// ---------------------------------------------------------------------------
export default function ({ token }) {
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `access_token=${token}`,
  };

  const payload = JSON.stringify({
    customerId: null,
    notes: 'k6 load test',
    lines: [{ productId: 1, quantity: 1, unitPrice: 5000, costPrice: 3000 }],
    payments: [{ paymentMethod: 'CASH', amount: 5000 }],
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/sales`, payload, { headers });
  saleLatency.add(Date.now() - start);

  const ok = check(res, {
    'sale created (2xx)': (r) => r.status >= 200 && r.status < 300,
  });
  errorRate.add(!ok);

  sleep(1);
}
