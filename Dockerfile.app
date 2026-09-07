# Lightweight image that serves the cypress-example-kitchensink application.
# Used by docker-compose for the app service when the combined Dockerfile
# is not required.
FROM node:20-slim

RUN apt-get update && apt-get install -y git wget --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Pinned for the same reason as in Dockerfile: an unpinned application under
# test makes build-to-build results incomparable. Keep the three pins (here,
# Dockerfile, and the workflow) in step.
ARG APP_COMMIT=a89cccc91045a0a36ce559cd716aebc31fa302a8
RUN git init /app \
    && cd /app \
    && git remote add origin https://github.com/cypress-io/cypress-example-kitchensink \
    && git fetch --depth 1 origin "${APP_COMMIT}" \
    && git checkout FETCH_HEAD

WORKDIR /app
# --ignore-scripts avoids the husky post-install hook in the kitchensink repo
RUN npm install --ignore-scripts --omit=dev

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=5s --retries=12 --start-period=15s \
    CMD wget -qO- http://localhost:8080/todo || exit 1

CMD ["npm", "start"]
