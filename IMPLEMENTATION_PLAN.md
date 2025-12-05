# PVS Implementation Plan

**Status:** Baseline completed; feature & deployment work in progress.

---

## Phase 1: CI & Deployment Foundation (High Priority) — Weeks 1–2

### 1.1 Stabilize CI Pipeline
- **Task:** Update GitHub Actions workflows to validate against the updated `package-lock.json`.
  - Ensure `npm ci` succeeds (or use `npm ci --legacy-peer-deps` temporarily).
  - Run backend Jest + Supertest tests.
  - Build frontend with Vite.
  - Run Cypress E2E tests (optional: persist artifacts).
- **Status:** Workflows exist (GitHub Actions skeletons); need to finalize test & build steps.
- **Effort:** 1–2 days.
- **Acceptance:** All CI jobs pass green on `main` branch after push.

### 1.2 Docker Image Build & Registry Push
- **Task:** Ensure backend and frontend Docker images build successfully and push to a registry (Docker Hub, GitHub Container Registry, or local).
  - Test multi-stage Dockerfile for backend (currently uses `npm install`; verify compatibility).
  - Build frontend image serving static Vite build with nginx.
  - Tag images with version/commit SHA.
  - Push to registry (CI step or manual push for now).
- **Status:** Dockerfiles exist; images build locally but haven't been pushed to registry.
- **Effort:** 1–2 days.
- **Acceptance:** Images tagged and pushed; pull and run locally to verify.

### 1.3 Local Dev Environment Stability
- **Task:** Test and document `docker-compose.dev.yml` workflow end-to-end.
  - Start MySQL, backend, frontend, and Adminer.
  - Verify migrations run and DB is seeded.
  - Confirm backend health check and `/health` endpoint respond.
  - Document troubleshooting steps for Windows/WSL2.
- **Status:** Compose file exists with healthchecks and `wait-for-db.js`.
- **Effort:** 1 day.
- **Acceptance:** Running `docker-compose -f docker-compose.dev.yml up` starts the full stack without errors; UI loads at `http://localhost:5173`.

---

## Phase 2: Core Feature & API Completeness (High Priority) — Weeks 2–3

### 2.1 Payment Verification Workflow
- **Task:** Implement full CRUD endpoints and business logic for payment verification.
  - `POST /api/verifications/` — Create verification request (e.g., from importer).
  - `GET /api/verifications/:id` — Retrieve verification details.
  - `PATCH /api/verifications/:id` — Update verification status (e.g., `PENDING` → `APPROVED` / `REJECTED`).
  - `GET /api/verifications/` — List verifications (admin/operator view; role-based filtering).
  - Implement state machine: `PENDING` → `IN_REVIEW` → `APPROVED` / `REJECTED` → `COMPLETED`.
  - Add audit log entry for each state transition.
- **Status:** Models & routes exist; endpoints need full implementation & validation.
- **Effort:** 2–3 days.
- **Acceptance:** E2E test covering full verification flow passes; audit logs recorded.

### 2.2 Importer Management
- **Task:** Complete importer CRUD and import file handling.
  - `POST /api/importers/` — Register new importer (admin only).
  - `GET /api/importers/:id` — Retrieve importer profile.
  - `PATCH /api/importers/:id` — Update importer details (admin or self).
  - `GET /api/importers/` — List all importers (admin only, with pagination).
  - `POST /api/importers/:id/upload` — File upload endpoint (CSV/Excel import).
  - Parse uploaded file, validate schema, create batch records.
  - Return upload summary (# records parsed, errors if any).
- **Status:** Routes defined; file parsing & validation logic partially complete.
- **Effort:** 2–3 days.
- **Acceptance:** Upload CSV, parse records, and retrieve via API.

### 2.3 Booking Management
- **Task:** Implement booking lifecycle endpoints.
  - `POST /api/bookings/` — Create booking (importer requests shipment verification).
  - `GET /api/bookings/:id` — Retrieve booking & associated verifications.
  - `PATCH /api/bookings/:id/status` — Update status (e.g., `SCHEDULED` → `COMPLETED`).
  - `GET /api/bookings/` — List bookings (with filters: status, importer, date range).
  - Trigger notification workflow when booking moves to `COMPLETED`.
- **Status:** Models exist; endpoints need implementation & state validation.
- **Effort:** 2 days.
- **Acceptance:** Create booking, verify status transitions, check notifications (mock or stub).

### 2.4 Frontend Role-Based Views
- **Task:** Build out role-specific UI pages (React + MUI).
  - **Admin Dashboard:** Overview of all verifications, importers, bookings; quick stats.
  - **Admin Settings:** User management, system config, audit log viewer.
  - **Operator Dashboard:** Active verifications assigned to operator; status updates.
  - **Importer Portal:** Upload files, view booking status, verify requests.
  - **Login & Auth UI:** Improve styling; add password reset flow (optional).
  - Implement role guards (redirect non-admin users away from admin pages).
- **Status:** Basic pages and API integration present; UI polish & full feature coverage needed.
- **Effort:** 3–4 days.
- **Acceptance:** All pages render without errors; role-based access enforced (e.g., operator cannot access admin settings).

---

## Phase 3: Observability & Monitoring (Medium Priority) — Week 3

### 3.1 Logging & Tracing
- **Task:** Enable and configure OpenTelemetry traces and logs in production mode.
  - Ensure OTEL SDK exports traces to a collector (if `OTEL_EXPORTER_OTLP_ENDPOINT` is set).
  - Verify prom-client metrics are exposed on `/metrics` endpoint.
  - Document how to set up local Jaeger or Grafana Tempo for trace visualization.
  - Add correlation IDs to requests for better log tracing.
- **Status:** Telemetry helper is robust; exporter & prom-client are pinned. Metrics endpoint `/metrics` not yet exposed.
- **Effort:** 1–2 days.
- **Acceptance:** Backend exports traces and metrics; Jaeger/Tempo visualization works (optional local collector).

### 3.2 Database & API Performance Monitoring
- **Task:** Add slow-query logging and API response time metrics.
  - Log queries that exceed 500ms.
  - Expose latency metrics (p50, p95, p99) for API endpoints via Prometheus.
  - Set up basic alerting thresholds (optional: integrate with PagerDuty or Slack).
- **Status:** pino logging in place; Prometheus integration ready.
- **Effort:** 1 day.
- **Acceptance:** Slow queries logged; Prometheus scrape endpoint returns latency metrics.

### 3.3 Health & Readiness Checks
- **Task:** Finalize health check endpoints for Kubernetes liveness/readiness probes.
  - `GET /health` — Simple OK response.
  - `GET /ready` — Check DB connectivity, cache (if added), dependencies.
  - Return 503 if any critical dependency is unavailable.
- **Status:** Basic `/health` endpoint exists; `/ready` not implemented.
- **Effort:** 1 day.
- **Acceptance:** Probes respond correctly; K8s pod restarts on health failure (test via docker-compose or helm).

---

## Phase 4: Kubernetes & Helm Deployment (Medium Priority) — Week 4

### 4.1 Helm Chart Templating
- **Task:** Complete Helm chart templates and values.
  - Finalize `backend/Chart.yaml`, `backend/templates/` (deployment, service, ingress, configmap, secret).
  - Finalize `frontend/Chart.yaml`, `frontend/templates/`.
  - Replace hardcoded image tags, hostnames, and secrets with template variables.
  - Document required values for `values.yaml` (image repo, tag, DB host/password, JWT_SECRET, etc.).
- **Status:** Skeleton charts exist; need templating & values refinement.
- **Effort:** 2 days.
- **Acceptance:** `helm install pvs-backend -f values.yaml` deploys pod, service, and ingress successfully.

### 4.2 Secrets & ConfigMap Management
- **Task:** Set up Kubernetes Secrets and ConfigMap for app config.
  - Store DB password, JWT_SECRET, API keys in Secrets.
  - Store non-secret config (PORT, DATABASE_NAME, OTEL endpoints) in ConfigMap.
  - Reference Secrets & ConfigMap in Deployment pod spec.
  - Document how to create Secrets via kubectl or integrate with HashiCorp Vault (optional).
- **Status:** Helm templates reference env vars; Secrets/ConfigMap not yet wired.
- **Effort:** 1 day.
- **Acceptance:** Pod starts with correct env vars from Secrets/ConfigMap; no hardcoded secrets in images.

### 4.3 Ingress & TLS Setup
- **Task:** Configure Kubernetes Ingress and TLS certificates.
  - Create Ingress resource pointing to backend service (port 4000) and frontend service (port 80).
  - Set up TLS certificate (self-signed for dev, Let's Encrypt for prod).
  - Configure DNS (e.g., `pvs.example.com` → Ingress IP).
- **Status:** Ingress template exists; TLS not configured.
- **Effort:** 1–2 days.
- **Acceptance:** `https://pvs.example.com/api/health` responds; UI accessible at root path.

### 4.4 Test Helm Deployment
- **Task:** Deploy PVS to a local K8s cluster and verify end-to-end.
  - Use Kind, Minikube, or Docker Desktop Kubernetes.
  - Run `helm install pvs .` and wait for pods to be Ready.
  - Port-forward to test endpoints (or use Ingress).
  - Run a subset of E2E tests against the deployed app.
- **Status:** Helm charts not yet tested against a cluster.
- **Effort:** 1–2 days.
- **Acceptance:** App runs on K8s; login and verify payment workflow works.

---

## Phase 5: Security & Hardening (Medium Priority) — Week 5

### 5.1 Authentication & Authorization
- **Task:** Finalize JWT & RBAC implementation.
  - Ensure all admin endpoints reject non-admin users (403).
  - Test operator-only endpoints; verify operators cannot access admin/settings.
  - Implement password reset flow (send reset token via email, optional).
  - Add rate-limiting to `/api/auth/login` (e.g., 5 attempts/min per IP).
- **Status:** JWT auth in place; RBAC middleware exists; rate-limiting not yet implemented.
- **Effort:** 1–2 days.
- **Acceptance:** Non-authorized users get 403 errors; rate limit enforced (HTTP 429).

### 5.2 Input Validation & Sanitization
- **Task:** Audit all API endpoints for input validation.
  - Use `express-validator` to validate request bodies, query params, path params.
  - Sanitize file uploads (check MIME type, file size limits, scan for malware if applicable).
  - Prevent SQL injection via Sequelize (already protected); double-check raw queries if any.
- **Status:** express-validator is installed; validation partially implemented on auth routes.
- **Effort:** 2 days.
- **Acceptance:** Invalid inputs return 400 with clear error messages; files larger than 10MB rejected.

### 5.3 CORS & HTTPS Enforcement
- **Task:** Lock down CORS and enforce HTTPS in production.
  - Limit CORS origins to frontend domain(s) only (not `*`).
  - Redirect HTTP to HTTPS in production.
  - Add security headers (Helmet.js): CSP, X-Frame-Options, X-Content-Type-Options, etc.
- **Status:** CORS configured; Helmet not yet added.
- **Effort:** 1 day.
- **Acceptance:** CORS errors for requests from untrusted origins; security headers present in responses.

### 5.4 Audit Logging & Compliance
- **Task:** Ensure all sensitive operations are logged (for compliance/debugging).
  - Log user login/logout, admin actions (user creation, deletion), verification state changes.
  - Store audit logs in DB with timestamp, actor, action, resource ID, and result.
  - Provide admin API to query audit logs with date range & actor filters.
- **Status:** Audit table exists in schema; logging only on state changes; needs full implementation.
- **Effort:** 2 days.
- **Acceptance:** Admin can view audit log for last 90 days; entries include user, action, timestamp, resource ID.

---

## Phase 6: Testing & QA (High Priority — Ongoing) — Weeks 3–5

### 6.1 Unit Test Coverage
- **Task:** Increase unit test coverage for models and utils.
  - Write tests for User, Payment, Booking, Verification models (validation, state transitions).
  - Test utility functions (JWT signing/verification, password hashing).
  - Target >80% coverage for backend core logic.
- **Status:** Basic tests exist; coverage ~40%.
- **Effort:** 2–3 days.
- **Acceptance:** `npm run test:coverage` reports >80% coverage; all tests pass.

### 6.2 Integration Tests
- **Task:** Write integration tests for API workflows.
  - Auth flow: register, login, obtain JWT, use JWT to access protected endpoint.
  - Verification flow: create verification → update status → check audit log.
  - Importer flow: upload file → parse records → create bookings.
  - Test error cases (invalid input, unauthorized access, conflicts).
- **Status:** Some integration tests exist; need expansion.
- **Effort:** 2–3 days.
- **Acceptance:** Run `npm run test` and all integration tests pass; CI runs these tests.

### 6.3 End-to-End (Cypress) Tests
- **Task:** Expand Cypress test coverage.
  - Login flow (correct & incorrect credentials).
  - Admin dashboard: view verifications, create user.
  - Importer portal: upload file, view booking status.
  - Operator dashboard: view assigned verifications, update status.
  - Test across browsers (Chrome, Firefox, Edge).
- **Status:** Basic E2E tests pass locally; need expansion to cover all workflows.
- **Effort:** 2–3 days.
- **Acceptance:** `npm run cy:run` passes all specs; CI runs Cypress and archives videos/artifacts.

### 6.4 Performance & Load Testing
- **Task:** Benchmark API response times and throughput.
  - Identify slow endpoints (target: p95 latency <500ms for read, <1s for write).
  - Run load test with ~100 concurrent users (use k6, Artillery, or JMeter).
  - Identify and fix bottlenecks (e.g., missing DB indexes, N+1 queries).
- **Status:** No load tests written; performance not yet measured.
- **Effort:** 2 days.
- **Acceptance:** Load test results show acceptable latencies; no database timeouts under load.

---

## Phase 7: Documentation & Release (Medium Priority) — Week 5–6

### 7.1 API Documentation (OpenAPI/Swagger)
- **Task:** Generate OpenAPI spec and host Swagger UI.
  - Document all REST endpoints: path, method, request body, response, error codes.
  - Use `swagger-jsdoc` or similar to auto-generate from code comments.
  - Host Swagger UI at `/api/docs`.
- **Status:** No OpenAPI spec yet.
- **Effort:** 1–2 days.
- **Acceptance:** API docs accessible at `/api/docs`; all endpoints documented with examples.

### 7.2 Deployment & Operations Guide
- **Task:** Write runbooks for common tasks.
  - Local development setup (docker-compose, npm scripts).
  - Kubernetes deployment (helm install, secrets setup, ingress config).
  - Common troubleshooting (DB connectivity, failed pod, logs).
  - Backup & restore procedures for MySQL data.
- **Status:** DOCKER_DEV.md exists; need comprehensive ops guide.
- **Effort:** 1–2 days.
- **Acceptance:** README.md and ops guide cover setup, deployment, and troubleshooting.

### 7.3 Release Notes & Version Tagging
- **Task:** Tag releases and document changes.
  - Create git tags (e.g., `v0.1.0`, `v0.2.0`).
  - Write release notes: features added, bugs fixed, breaking changes.
  - Build and publish Docker images with version tags.
- **Status:** No tags or release notes yet.
- **Effort:** 1 day.
- **Acceptance:** `git tag v0.1.0` created; Docker images tagged `pvs-backend:v0.1.0`.

---

## Quick-Start Priority Checklist

**Start here (Week 1–2):**
- [ ] Phase 1.1: Stabilize CI
- [ ] Phase 1.2: Docker image builds
- [ ] Phase 2.1: Payment verification workflow
- [ ] Phase 2.4: Frontend role-based views

**Then (Week 2–3):**
- [ ] Phase 1.3: Local dev environment
- [ ] Phase 2.2: Importer management
- [ ] Phase 2.3: Booking management
- [ ] Phase 6.1–6.3: Testing (ongoing)

**Then (Week 3–4):**
- [ ] Phase 3: Observability
- [ ] Phase 4: Helm & K8s deployment

**Polish (Week 5+):**
- [ ] Phase 5: Security & hardening
- [ ] Phase 6.4: Load testing
- [ ] Phase 7: Documentation & release

---

## Known Issues & Blockers

1. **Telemetry Dependencies:** ✅ Resolved. Pinned `@opentelemetry/exporter-trace-otlp-http@0.43.0` and `prom-client@14.2.0`; backend starts cleanly.
2. **Docker Compose & WSL:** ✅ Resolved. Compose file updated for legacy format and wait-for-db integration.
3. **CI/CD:** ⚠️ Pending. GitHub Actions workflows need finalization; test on `chore/enable-telemetry` and `main` branches.
4. **Helm Charts:** ⚠️ Pending. Templates exist but need variable substitution and values finalization.
5. **Frontend Build:** ✅ Resolved. Vite build passes; Cypress E2E tests pass locally.

---

## Branch & PR Strategy

- **`chore/enable-telemetry`** (in progress): Pin telemetry deps, robust init, verify locally.
  - PR body: "Enable OpenTelemetry tracing and Prometheus metrics by pinning exporter & prom-client versions; improve error handling for missing packages."
  - Merge after CI passes.

- **`feat/payment-verification`** (next): Implement full verification workflow (Phase 2.1).
  - Endpoints, state machine, audit logging, tests.

- **`feat/importer-management`** (next): Upload & parse import files (Phase 2.2).

- **`feat/frontend-roles`** (parallel): Build admin, operator, importer role-based views (Phase 2.4).

- **`ops/helm-deployment`** (after Phase 2): Complete Helm chart templates and test on K8s cluster (Phase 4).

- **`chore/ci-stabilization`** (after Phase 1.1): Finalize GitHub Actions workflows, add image build & push steps.

---

## Success Metrics

- ✅ All CI tests pass on `main` branch.
- ✅ Backend & frontend Docker images build and push to registry.
- ✅ `docker-compose.dev.yml up` starts full stack without errors.
- ✅ All core API endpoints implemented and E2E tested.
- ✅ Helm deployment to K8s works; app responsive under 100 concurrent users.
- ✅ API documentation (Swagger) auto-generated and accessible.
- ✅ Audit logs recorded for all sensitive operations.
- ✅ Security review passed (CORS, auth, input validation, HTTPS).

---

## Next Steps

1. Commit & push `chore/enable-telemetry` branch (git available?).
2. Open PR for telemetry; request review & merge.
3. Start Phase 1.1: Finalize CI workflows; test on `main`.
4. In parallel: Start Phase 2.1 (payment verification workflow).

Questions? Ready to begin Phase 1?

