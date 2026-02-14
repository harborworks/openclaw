FROM node:22-bookworm-slim

ARG OPENCLAW_VERSION=2026.2.13

WORKDIR /app

# git is needed for some npm dependencies
# docker-cli is needed for agent sandboxing (talks to mounted docker.sock)
# Install Docker CLI from official repo (debian docker.io package is too old — API v1.41)
RUN apt-get update \
    && apt-get install -y git ca-certificates curl gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian bookworm stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

# Install openclaw globally
RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Copy entrypoint with env watcher
COPY scripts/gateway-entrypoint.sh /app/gateway-entrypoint.sh
RUN chmod +x /app/gateway-entrypoint.sh

ENV NODE_ENV=production
USER node

ENTRYPOINT ["/app/gateway-entrypoint.sh"]
CMD ["--bind", "lan", "--port", "18789"]
