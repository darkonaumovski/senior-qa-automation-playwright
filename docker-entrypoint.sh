#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/kitchensink"
APP_URL="http://localhost:8080/todo"
MAX_WAIT=60

echo "==> Starting ToDo application from ${APP_DIR} ..."
cd "${APP_DIR}"
npm start &
APP_PID=$!

echo "==> Waiting for application to be ready at ${APP_URL} ..."
waited=0
until curl -sf "${APP_URL}" -o /dev/null; do
  if [ ${waited} -ge ${MAX_WAIT} ]; then
    echo "ERROR: Application did not become ready within ${MAX_WAIT}s" >&2
    kill "${APP_PID}" 2>/dev/null || true
    exit 1
  fi
  sleep 1
  waited=$((waited + 1))
done
echo "==> Application is ready (waited ${waited}s)."

export TODO_BASE_URL="http://localhost:8080"

echo "==> Running Playwright tests ..."
cd /workspace
npm test
TEST_RC=$?

echo "==> Tests finished with exit code ${TEST_RC}."
kill "${APP_PID}" 2>/dev/null || true
exit ${TEST_RC}
