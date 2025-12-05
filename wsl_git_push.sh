#!/usr/bin/env bash
set -e
cd /mnt/c/Users/mbayoh/Documents/pvs
if ! command -v git >/dev/null 2>&1; then echo "git not found in WSL"; exit 2; fi

echo "git version: $(git --version)"

if [ -z "$(git config --get user.email 2>/dev/null)" ]; then
  git config user.email "mbayoh@example.com"
fi
if [ -z "$(git config --get user.name 2>/dev/null)" ]; then
  git config user.name "mbayoh"
fi

git checkout -B chore/ci-stabilization-telemetry

if git add node-backend/src/ node-backend/package.json node-backend/Dockerfile frontend/Dockerfile .github/ README.md IMPLEMENTATION_PLAN.md CHANGES_SUMMARY.md 2>/dev/null; then
  echo "staged specified files"
else
  git add -A
  echo "staged all changes"
fi

if git commit -m "chore: stabilize CI, enable telemetry, fix Dockerfiles and add implementation plan"; then
  echo "committed changes"
else
  echo "no changes to commit"
fi

git push -u origin chore/ci-stabilization-telemetry
