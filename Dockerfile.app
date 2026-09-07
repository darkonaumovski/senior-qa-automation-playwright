# Lightweight image that serves the cypress-example-kitchensink application.
# Used by docker-compose for the app service when the combined Dockerfile
# is not required.
FROM node:22-slim

# ca-certificates is required: node:*-slim ships without a CA bundle, so an
# https clone fails with "server certificate verification failed".
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pinned for the same reason as in Dockerfile: an unpinned application under
# test makes build-to-build results incomparable. Resolved from .app-commit,
# which is the only place the SHA is written down.
COPY .app-commit /tmp/.app-commit
ARG APP_COMMIT=""
# See the note in Dockerfile on why this is `pin` rather than APP_COMMIT.
RUN pin="${APP_COMMIT:-$(tr -d '[:space:]' < /tmp/.app-commit)}" \
    && echo "Building against application commit ${pin}" \
    && git init /app \
    && cd /app \
    && git remote add origin https://github.com/cypress-io/cypress-example-kitchensink \
    && if git fetch --depth 1 origin "${pin}"; then \
         git checkout FETCH_HEAD; \
       else \
         git fetch origin && git checkout "${pin}"; \
       fi \
    && echo "Checked out $(git rev-parse HEAD)"

WORKDIR /app
# --ignore-scripts avoids the husky post-install hook in the kitchensink repo
RUN npm install --ignore-scripts --omit=dev

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=5s --retries=12 --start-period=15s \
    CMD wget -qO- http://localhost:8080/todo || exit 1

CMD ["npm", "start"]
