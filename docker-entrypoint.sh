#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/kitchensink"
APP_URL="http://localhost:8080/todo"
MAX_WAIT=60

echo "==> Starting ToDo application from ${APP_DIR} ..."
cd "${APP_DIR}"
npm start &
APP_PID=$!

# Reap the application on every exit path, including the `set -e` bail-outs
# below and any signal the container receives.
trap 'kill "${APP_PID}" 2>/dev/null || true' EXIT INT TERM

echo "==> Waiting for application to be ready at ${APP_URL} ..."
waited=0
until curl -sf "${APP_URL}" -o /dev/null; do
  if [ ${waited} -ge ${MAX_WAIT} ]; then
    echo "ERROR: Application did not become ready within ${MAX_WAIT}s" >&2
    exit 1
  fi
  sleep 1
  waited=$((waited + 1))
done
echo "==> Application is ready (waited ${waited}s)."

export TODO_BASE_URL="http://localhost:8080"

cd /workspace
# `set -e` would abort here on a non-zero exit, so capture the code explicitly
# instead of reading $? on the following line.
#
# Extra args (the image's CMD) are forwarded to `playwright test` rather than
# always running the full `npm test`. This is what lets CI run a scoped
# subset here to prove the image and this script actually work end to end,
# without paying for the full cross-browser suite a second time on top of the
# native run — the image itself still defaults to the full suite when run
# with no args, matching the documented `docker run --rm todo-playwright`.
if [ "$#" -gt 0 ]; then
  echo "==> Running Playwright tests (scoped: $*) ..."
  if npx playwright test "$@"; then
    TEST_RC=0
  else
    TEST_RC=$?
  fi
else
  echo "==> Running Playwright tests ..."
  if npm test; then
    TEST_RC=0
  else
    TEST_RC=$?
  fi
fi

echo "==> Tests finished with exit code ${TEST_RC}."
exit ${TEST_RC}
