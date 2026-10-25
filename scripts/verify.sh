#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

npm run lint
npm run format:check
npm run typecheck
npm run test
npm run build
