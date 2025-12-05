Summary
-------
This PR updates `node-backend/package-lock.json` after removing/adjusting a couple of telemetry-related dependencies to make image builds reproducible.

What changed
- Regenerated `node-backend/package-lock.json` after resolving problematic packages during a local `npm install` that was required to build the backend image inside Docker.

Why
- The Docker image build failed due to unavailable versions for some OpenTelemetry packages and `prom-client` pin. Regenerating the lockfile with compatible dependencies allows deterministic CI builds and reproduces the local environment that succeeded.

Verification performed locally
- Ran `npm install` inside `node-backend` and observed successful install (warnings only).
- Built the `node-backend` image locally with `npm install` in the Dockerfile.
- Ran basic audit/fix steps to reduce low-risk vulnerabilities.

Notes for reviewers / CI
- CI should use the committed `package-lock.json` so `npm ci` succeeds. If CI fails due to peer dependency issues, consider using `npm ci --legacy-peer-deps` or pinning the affected packages.
- This is a dev/lockfile maintenance change — no runtime code changes expected. Still, please review CI build logs after the PR is opened.

Commands used (local)
```
cd node-backend
npm install
git add package-lock.json
git commit -m "chore: update package-lock after dependency adjustments"
```
