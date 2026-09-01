# ──────────────────────────────────────────────────────────────────────────────
# Stage 1 – App: clone and install the cypress-example-kitchensink application
# ──────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS app-builder

RUN apt-get update && apt-get install -y git --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/cypress-io/cypress-example-kitchensink /opt/kitchensink

WORKDIR /opt/kitchensink
# --ignore-scripts avoids the husky post-install hook in the kitchensink repo
RUN npm install --ignore-scripts --omit=dev

# ──────────────────────────────────────────────────────────────────────────────
# Stage 2 – Test runner: Playwright + Allure, includes the app from stage 1
# ──────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/playwright:v1.47.0-jammy

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
RUN npx playwright install chromium firefox

# Copy test source
COPY . .

# Expose the app port (informational only; actual binding is done at runtime)
EXPOSE 8080

RUN chmod +x /workspace/docker-entrypoint.sh

ENTRYPOINT ["/workspace/docker-entrypoint.sh"]
