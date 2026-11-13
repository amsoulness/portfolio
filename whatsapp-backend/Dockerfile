# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends chromium ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium HOST=0.0.0.0 PORT=3001 \
    ASLNS_CHROME_NO_SANDBOX=true
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm ci --omit=dev && chown node:node /app
COPY --chown=node:node server.js sessions.js image.js transport.js ./
USER node
EXPOSE 3001
CMD ["node", "server.js"]
