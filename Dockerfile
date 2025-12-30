FROM node:lts-alpine AS base

FROM base AS builder
RUN apk add --no-cache gcompat
WORKDIR /app
COPY package.json tsconfig.json yarn.lock ./
COPY packages/backend ./packages/backend
COPY packages/schema ./packages/schema
COPY drizzle ./drizzle

RUN yarn
RUN yarn workspace @sparrow-tags/schema build
RUN yarn workspace @sparrow-tags/backend build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy package files first
COPY --from=builder --chown=nodejs:nodejs /app/package.json /app/yarn.lock ./
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/package.json ./packages/backend/
COPY --from=builder --chown=nodejs:nodejs /app/packages/schema/package.json ./packages/schema/

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Install drizzle-kit for migrations
RUN yarn add -W drizzle-kit

# Copy built files
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/schema/dist ./packages/schema/dist

# Copy migration files and config
COPY --from=builder --chown=nodejs:nodejs /app/drizzle ./drizzle
COPY --chown=nodejs:nodejs drizzle.config.ts ./

USER nodejs
EXPOSE 3000
CMD sh -c "yarn db:migrate && node /app/packages/backend/dist/server.js"