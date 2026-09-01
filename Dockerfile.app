# Lightweight image that serves the cypress-example-kitchensink application.
# Used by docker-compose for the app service when the combined Dockerfile
# is not required.
FROM node:20-slim

RUN apt-get update && apt-get install -y git wget --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --depth 1 https://github.com/cypress-io/cypress-example-kitchensink /app

WORKDIR /app
# --ignore-scripts avoids the husky post-install hook in the kitchensink repo
RUN npm install --ignore-scripts --omit=dev

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=5s --retries=12 --start-period=15s \
    CMD wget -qO- http://localhost:8080/todo || exit 1

CMD ["npm", "start"]
