# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates git \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3001
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && chown node:node /app
COPY --chown=node:node server.js sessions.js image.js transport.js client.js pairing-code.js ./
USER node
EXPOSE 3001
CMD ["node", "server.js"]
