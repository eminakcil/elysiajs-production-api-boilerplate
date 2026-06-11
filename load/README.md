# Load testing (k6)

Smoke-profile journey for the API: each VU registers once, then loops
`/health` with sampled `/auth/me` and `/auth/refresh` traffic.

## Run

```bash
# install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/
brew install k6                       # macOS

# start the stack, then:
k6 run load/api-journey.k6.js

# knobs
BASE_URL=https://staging.example.com VUS=5 DURATION=5m k6 run load/api-journey.k6.js

# no local install — run k6 from Docker (reach the host API):
docker run --rm -i -v "$PWD/load:/load" grafana/k6 run \
  -e BASE_URL=http://host.docker.internal:3000 /load/api-journey.k6.js
```

## Thresholds (fail the run when breached)

- `http_req_failed: rate<0.01` — under 1% failed requests
- `http_req_duration: p(95)<300` — p95 latency under 300 ms
- `checks: rate>0.99` — journey assertions hold

## Rate limits — read this before scaling up

All VUs share one source IP, and the API enforces per-IP limits
(`src/plugins/rate-limit.ts`):

| Scope | Limit |
|---|---|
| `/auth/register`, `/auth/login`, `/auth/password/*` | 10/min/IP |
| the whole `/auth` module (incl. `/me`, `/refresh`) | 20/min/IP |

The default profile (5 VUs, 1m) stays under those budgets — that's why the
authed endpoints are *sampled* rather than hammered. If you crank `VUS` up
without raising the limiter maxes, you are load-testing the rate limiter
(expect 429s and a failed `http_req_failed` threshold), not the API.

For a real stress run, point `BASE_URL` at a load environment where the
limiter maxes are raised, then scale `VUS`/`DURATION` and move the heavy
loop onto the endpoints you care about.
