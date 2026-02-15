##
## Stage 1: Build openclaw from source (v2026.2.13 + cron sandbox fix)
##
FROM node:22-bookworm AS builder

# Install Bun (required for openclaw build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /build

# Copy openclaw source (submodule pinned to v2026.2.13 + fix)
COPY openclaw/package.json openclaw/pnpm-lock.yaml openclaw/pnpm-workspace.yaml openclaw/.npmrc ./
COPY openclaw/ui/package.json ./ui/package.json
COPY openclaw/patches ./patches
COPY openclaw/scripts ./scripts

RUN pnpm install --frozen-lockfile

COPY openclaw/ .
RUN pnpm build
ENV OPENCLAW_PREFER_PNPM=1
RUN pnpm ui:build

##
## Stage 2: Runtime gateway image
##
FROM node:22-bookworm-slim

WORKDIR /app

# git + docker-cli
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

# Copy built openclaw from builder and install globally
COPY --from=builder /build /app/openclaw
RUN cd /app/openclaw && npm install -g .

# Copy entrypoint
COPY gateway/scripts/gateway-entrypoint.sh /app/gateway-entrypoint.sh
RUN chmod +x /app/gateway-entrypoint.sh

ENV NODE_ENV=production
USER node

ENTRYPOINT ["/app/gateway-entrypoint.sh"]
CMD ["--bind", "lan", "--port", "18789"]
