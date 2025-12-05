# Git Commit & Push Script
# Run this in PowerShell (where git is available and the repo .git exists)

cd C:\Users\mbayoh\Documents\pvs

# Create and switch to feature branch
git checkout -b chore/ci-stabilization-telemetry

# Stage the changed files
git add node-backend/src/ node-backend/package.json node-backend/Dockerfile `
        frontend/Dockerfile .github/ README.md IMPLEMENTATION_PLAN.md CHANGES_SUMMARY.md

# Commit changes
git commit -m "chore: stabilize CI, enable telemetry, fix Dockerfiles and add implementation plan"

# Push to origin
git push -u origin chore/ci-stabilization-telemetry

Write-Host "Branch pushed successfully!" -ForegroundColor Green
