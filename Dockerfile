# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 – App: clone and install the cypress-example-kitchensink application
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS app-builder

# ca-certificates is required: node:*-slim ships without a CA bundle, so an
# https clone fails with "server certificate verification failed".
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pinned so the image is reproducible. An unpinned clone means the application
# under test can change between builds, which makes a failure impossible to
# attribute to either the tests or the app. Keep in step with APP_COMMIT in
# .github/workflows/playwright.yml.
ARG APP_COMMIT=a89cccc91045a0a36ce559cd716aebc31fa302a8
# Shallow fetch of the exact commit where the server allows it, falling back to
# a full fetch. The fallback checks out APP_COMMIT explicitly rather than
# FETCH_HEAD, so a fallback can never quietly pin a different revision.
RUN git init /opt/kitchensink \
    && cd /opt/kitchensink \
    && git remote add origin https://github.com/cypress-io/cypress-example-kitchensink \
    && if git fetch --depth 1 origin "${APP_COMMIT}"; then \
         git checkout FETCH_HEAD; \
       else \
         git fetch origin && git checkout "${APP_COMMIT}"; \
       fi

WORKDIR /opt/kitchensink
# --ignore-scripts avoids the husky post-install hook in the kitchensink repo
RUN npm install --ignore-scripts --omit=dev

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 – Test runner: Playwright + Allure, includes the app from stage 1
# ──────────────────────────────────────────────────────────────────────────────
# Must match the @playwright/test version in package-lock.json: the image ships
# the matching browser builds, and a mismatch means either a redundant download
# or a launch failure.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

# Java runtime required by allure-commandline
RUN apt-get update && apt-get install -y \
    default-jre-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built kitchensink app
COPY --from=app-builder /opt/kitchensink /opt/kitchensink
# Node is already available from the Playwright base image; symlink if needed
RUN node --version && npm --version

# Install test suite dependencies
WORKDIR /workspace
COPY package*.json ./
RUN npm ci --ignore-scripts
# No `playwright install` step: the pinned base image already ships the browser
# builds for this exact Playwright version.

# Copy test source
COPY . .

# Expose the app port (informational only; actual binding is done at runtime)
EXPOSE 8080

RUN chmod +x /workspace/docker-entrypoint.sh

ENTRYPOINT ["/workspace/docker-entrypoint.sh"]
