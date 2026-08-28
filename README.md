# Payment Verification System (PVS)


![CI](https://github.com/mbayoh/pvs/actions/workflows/ci.yml/badge.svg)
![Build Images](https://github.com/mbayoh/pvs/actions/workflows/build-images.yml/badge.svg)

Quick structure
- frontend/ — React + Vite + Material UI frontend, demo login + dashboard

 
 Project layout
 ```
 ./node-backend  # Express backend, Sequelize models, migrations, Jest tests
 ./frontend      # Vite + React frontend (MUI), Cypress E2E tests
 ./.github/workflows/ci.yml # CI workflow
 ./docker-compose.ci.yml    # docker-compose example for CI runs
 ```
 
 Quick examples
 
 - Create a verification as an importer (example using curl):
 
 ```bash
 curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"importer1","password":"password"}'
 # take the returned token and then:
 curl -X POST http://localhost:4000/api/verifications -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d '{"importer_id":1,"bank_name":"MyBank","amount":123.45,"currency_code":"USD","reference_number":"REF100"}'
 ```
 
 Contributing
 - Open a PR and include unit tests or E2E tests for new features.
 
 Security
 - Do not commit production secrets. Use environment variables for `JWT_SECRET` and DB credentials. The backend performs basic validation and fails fast if required production env vars are missing.

 Authentication and access control
 - Two-factor authentication (TOTP) is mandatory for `ADMIN`: an admin login returns an enrollment challenge until an authenticator is registered, after which a 6-digit code is required. Enrollment returns single-use recovery codes.
 - There is no self-service password reset. Administrators reset passwords via `POST /api/admin/users/:id/reset-password`, which returns a one-time temporary password, revokes existing sessions and forces a password change at next sign-in.
 - Self-registration can only create `IMPORTER` accounts; privileged accounts are created by an administrator via `POST /api/admin/users`.
 - Passwords require 12+ characters with upper case, lower case, digit and symbol, and may not contain the username.
 - Repeated failed logins lock an account temporarily (`MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES`); login and other sensitive endpoints are rate limited.
 - Roles and permissions live in `node-backend/src/rbac.js`; routes authorize on permissions rather than hard-coded role lists. Password resets and role changes bump the user's token version, which immediately invalidates previously issued JWTs.

 Additional security env vars: `JWT_ISSUER`, `JWT_AUDIENCE`, `BCRYPT_ROUNDS`, `MAX_FAILED_LOGINS`, `LOCKOUT_MINUTES`, `LOGIN_RATE_LIMIT_WINDOW_MS`, `LOGIN_RATE_LIMIT_MAX`, `SENSITIVE_RATE_LIMIT_WINDOW_MS`, `SENSITIVE_RATE_LIMIT_MAX`, `CORS_ORIGINS`, `TOTP_ISSUER`, `SEED_PASSWORD`.
 
 Changelog
 - See `CHANGELOG.md` for notable changes and release notes.

Testcontainers in CI
- There is a small Jest test that uses Testcontainers to spin up a MySQL container for stronger integration testing. The test is skipped by default. CI sets `RUN_TESTCONTAINERS=1` for the dedicated integration job so those tests will run inside CI.

Run with Docker Compose (development)

The repo includes a developer Docker Compose configuration that brings up MySQL, the Node backend (mounted) and the built frontend.

```powershell
# Build and bring up services
docker-compose -f docker-compose.dev.yml up

# This starts:
# - MySQL on port 3306
# - Node backend on port 4000
# - frontend (vite dev) on port 5173
# - Adminer (DB UI) on port 8080

# Note: If `npm install` fails in CI, the workflow uses `npm install` as a fallback
# to handle peer-dependency warnings. For local dev, you can use either:
# - npm ci (strict lockfile matching, recommended after lockfile is stable)
# - npm install (tolerates peer-dep warnings, quicker unblock)
```

Kubernetes (example)

The `k8s/` directory contains example Kubernetes manifests for a basic production deployment (namespace, secrets, mysql, backend, frontend). These are examples — you'll want to customize image names, resource limits, persistence and network rules for your cluster.

Apply to a cluster (example):

```bash
# set kubectl context to the target cluster
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/04-secrets-config.yaml
kubectl apply -f k8s/01-mysql-deployment.yaml
kubectl apply -f k8s/02-backend-deployment.yaml
kubectl apply -f k8s/03-frontend-deployment.yaml
```

Tip: Replace `your-registry/pvs-node-backend:latest` and `your-registry/pvs-frontend:latest` with images pushed to your image registry (ECR, GCR, Docker Hub, etc.).

Logging & error tracking
- The Node backend is instrumented with Pino for structured logging and optionally integrates with Sentry for error tracking. To enable Sentry set the `SENTRY_DSN` environment variable in production.

Example production env vars (must not be committed):

```bash
DATABASE_HOST=prod-db-host
DATABASE_USER=produser
DATABASE_PASSWORD=prodpass
DATABASE_NAME=verification
JWT_SECRET=replace-with-secure-secret
SENTRY_DSN=https://xxxx@sentry.example.com/123

Log aggregation (k8s)
- Example Fluent Bit configuration is included at `k8s/fluent-bit.yaml` which demonstrates collecting container logs (from /var/log/containers) and forwarding them. In production you would point the output to your log indexer (Elasticsearch / Loki / Datadog / Splunk) by changing the `OUTPUT` section in `k8s/fluent-bit.yaml`.

ECR deployment (sample)
- There's a sample GitHub Actions workflow at `.github/workflows/deploy-ecr.yml` showing how to build and push images to Amazon ECR and then run `helm upgrade --install` using `KUBE_CONFIG_DATA` for cluster access. For GCR/GitHub Container Registry you can follow a similar template and set the appropriate secrets.
```
Local development (Windows PowerShell)

1) Start backend in test-mode (uses in-memory SQLite):

```powershell
cd C:\Users\mbayoh\Documents\pvs\node-backend
npm install
npx cross-env NODE_ENV=test node src/index.js
# Server runs on http://localhost:4000 and will seed demo accounts (admin, importer1) in non-production
```

2) Start frontend:

```powershell
cd C:\Users\mbayoh\Documents\pvs\frontend
npm install
npm run dev
# Open http://localhost:5173
```

Run tests
- Backend
  ```powershell
  cd node-backend
  npm ci
  npm test
  ```

- Frontend
  ```powershell
  cd frontend
  npm ci
  npm run build

Migrations & production notes
- Run migrations for the Node backend (uses sequelize-cli). Example (local / test):

```powershell
cd node-backend
npx sequelize-cli db:migrate --env development
```

- When running in production make sure to set these env vars: DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME, JWT_SECRET. The server validates these values and will fail fast if they are missing.

End-to-end tests (Cypress)
- This repo includes Cypress E2E tests under `frontend/cypress/e2e`. To run them locally:

1) Start the backend in test-mode (this uses an in-memory SQLite DB and will seed demo accounts):

```powershell
cd node-backend
npx cross-env NODE_ENV=test node src/index.js
```

2) Build and preview the frontend:

```powershell
cd frontend
npm ci
npm run build
npx vite preview --port 5173
```

3) Run Cypress E2E:

```powershell
cd frontend
npm run cy:run
```
  ```

CI
- This repo includes a GitHub Actions workflow at `.github/workflows/ci.yml` to run the backend tests and frontend build. There is also a Docker Compose example for CI under `docker-compose.ci.yml`.

Next steps implemented in this branch
- Add README, GH Actions CI workflow, and a Docker CI helper so CI builds and backend tests run consistently.

If you'd like, I can now:
- Expand the frontend flows (registration, importer dashboard, verification creation, booking flows)
- Harden the backend (migration tooling and environment validation)
- Add automated E2E tests (Cypress) and wire them into CI

Which one should I prioritize next? (I can continue all of them step-by-step.)
