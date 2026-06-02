# Load Tests

k6 load tests for KampStock backend.

## Prerequisites

Install [k6](https://k6.io/docs/getting-started/installation/):

```bash
# Windows (Chocolatey)
choco install k6

# macOS
brew install k6

# Docker
docker run --rm -i grafana/k6 run - <load-tests/sales.js
```

## Running

```bash
# Default (against local backend)
k6 run load-tests/sales.js

# Against a different host / with custom credentials
k6 run load-tests/sales.js \
  -e BASE_URL=https://api.kampstock.example.com \
  -e EMAIL=admin@demo.com \
  -e PASSWORD=Admin1234!
```

## Thresholds

| Metric | Threshold |
|--------|-----------|
| `http_req_duration` p(95) | < 500 ms |
| Error rate | < 1% |

## Scenario

- Ramp to 50 virtual users over 30 s
- Sustain 50 VUs for 2 minutes
- Ramp down over 15 s
