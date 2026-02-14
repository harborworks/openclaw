FROM node:22-bookworm-slim

ARG OPENCLAW_VERSION=2026.2.13

WORKDIR /app

# git is needed for some npm dependencies
# docker-cli is needed for agent sandboxing (talks to mounted docker.sock)
RUN apt-get update && apt-get install -y git docker.io && rm -rf /var/lib/apt/lists/*

# Install openclaw globally
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Copy entrypoint with env watcher
COPY scripts/gateway-entrypoint.sh /app/gateway-entrypoint.sh
RUN chmod +x /app/gateway-entrypoint.sh

ENV NODE_ENV=production
USER node

ENTRYPOINT ["/app/gateway-entrypoint.sh"]
CMD ["--bind", "lan", "--port", "18789"]
