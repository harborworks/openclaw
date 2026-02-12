FROM node:22-bookworm-slim

ARG OPENCLAW_VERSION=2026.2.9

WORKDIR /app

# git is needed for some npm dependencies
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install openclaw globally
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Copy entrypoint with env watcher
COPY scripts/gateway-entrypoint.sh /app/gateway-entrypoint.sh
RUN chmod +x /app/gateway-entrypoint.sh

ENV NODE_ENV=production
USER node

ENTRYPOINT ["/app/gateway-entrypoint.sh"]
CMD ["--allow-unconfigured", "--bind", "lan", "--port", "18789"]
