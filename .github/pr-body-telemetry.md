# Enable OpenTelemetry Tracing & Prometheus Metrics

## Summary
This PR enables OpenTelemetry tracing and Prometheus metrics by pinning compatible versions and improving error handling in the telemetry initialization code.

## What Changed
- **Pinned telemetry dependencies:**
  - `@opentelemetry/exporter-trace-otlp-http@0.43.0` (matches SDK version 0.43.0)
  - `prom-client@14.2.0` (re-enables metrics collection)
- **Enhanced `node-backend/src/telemetry.js`:**
  - Robust error handling if telemetry packages fail to load
  - Informative console logs for OTEL SDK startup and metrics
  - Safe no-op fallback if `OTEL_EXPORTER_OTLP_ENDPOINT` is not set
- **Fixed `node-backend/src/config.js`:**
  - Explicitly loads `.env` file from project root (fixes env var loading in dev mode)
- **Updated CI workflow (`ci.yml`):**
  - Changed from `npm ci` to `npm install` for peer-dependency tolerance (temporary)
  - Added artifact retention for coverage reports and Cypress videos
  - Fixed MySQL credentials in test services (root user with correct password)
- **New Docker image build workflow (`build-images.yml`):**
  - Validates backend and frontend image builds on every push/PR
  - Tests `docker-compose.dev.yml` stack end-to-end

## Why
OpenTelemetry tracing and Prometheus metrics are essential for production observability. Pinning compatible versions ensures:
- Deterministic builds (reproducible lockfile)
- Trace export to Jaeger, Grafana Tempo, or other OTEL-compatible backends
- Metrics collection and exposure via Prometheus

## Verification
✅ Local testing completed:
- `npm install` succeeds with the pinned versions
- Backend starts in test mode without telemetry errors
- Demo users seeded; backend listens on port 4000
- `.env` file correctly loaded by config.js
- Telemetry initializes safely (logs show "OpenTelemetry SDK started" when OTEL env vars are set)

## How to Test
1. **Backend startup:**
   ```bash
   cd node-backend
   NODE_ENV=test npm run dev
   # Expect logs: "OpenTelemetry SDK started" (if OTEL_EXPORTER_OTLP_ENDPOINT is set)
   # or "OpenTelemetry init failed: OTEL_EXPORTER_OTLP_ENDPOINT not set" (no-op if not set)
   ```

2. **With OTEL export (optional):**
   ```bash
   cd node-backend
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 NODE_ENV=test npm run dev
   # (assumes Jaeger or Tempo collector running on localhost:4317)
   ```

3. **Metrics endpoint:**
   ```bash
   curl http://localhost:4000/metrics
   # Returns Prometheus-formatted metrics
   ```

## Notes for Reviewers
- **No database required** for this PR; telemetry initialization happens before DB connection.
- **CI uses `npm install`** temporarily; once peer-dependencies are fully aligned, we can restore `npm ci`.
- **CI now builds images** and tests the compose stack; watch the `build-images.yml` workflow for any image build failures.
- **Breaking changes:** None. Telemetry is opt-in via environment variable.

## Related
- Fixes telemetry initialization errors during startup
- Enables trace export for Jaeger/Grafana Tempo integration
- Prerequisite for production observability (Phase 3 of implementation plan)

