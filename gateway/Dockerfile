FROM node:22-bookworm-slim

ARG OPENCLAW_VERSION=latest

WORKDIR /app

# Install openclaw globally
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Copy entrypoint with env watcher
COPY scripts/gateway-entrypoint.sh /app/gateway-entrypoint.sh
RUN chmod +x /app/gateway-entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["/app/gateway-entrypoint.sh"]
CMD ["--allow-unconfigured", "--bind", "lan", "--port", "18789"]
