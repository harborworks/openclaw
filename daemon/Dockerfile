FROM node:22-bookworm-slim AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx tsup src/index.ts --format esm --target node22 --clean

# Production stage
FROM node:22-bookworm-slim
WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY scripts ./scripts

ENV NODE_ENV=production
USER node

CMD ["node", "dist/index.js"]
