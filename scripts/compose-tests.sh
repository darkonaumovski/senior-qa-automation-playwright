#!/usr/bin/env bash
set -euo pipefail
# The service publishes the checkout it actually built, including build overrides.
# Never use the test image's own app revision for this independent service.
unset APP_REVISION_FILE
if curl -fsS "${TODO_BASE_URL}/__qa_revision" -o /tmp/target-revision; then
  export APP_REVISION_FILE=/tmp/target-revision
fi
exec npx playwright test "$@"
