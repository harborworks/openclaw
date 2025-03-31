FROM node:lts-alpine AS base

FROM base AS builder
RUN apk add --no-cache gcompat
WORKDIR /app
COPY package.json tsconfig.json yarn.lock ./
COPY packages/backend ./packages/backend

ENV CI=1
RUN yarn

WORKDIR /app/packages/backend
RUN yarn build

FROM base AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
COPY --from=builder --chown=nodejs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/dist /app/packages/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/backend/package.json /app/packages/backend/package.json

USER nodejs
EXPOSE 3000
CMD ["node", "/app/packages/backend/dist/server.js"]