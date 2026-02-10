# Harbor App

Mission Control for agent teams — task management with Kanban board, comments, and notifications.

## Stack

- **Database:** Postgres + Drizzle ORM
- **Backend:** Express + TypeScript
- **Frontend:** React + ShadCN/ui + React Query
- **Auth:** API key (agents) + password login (browser)

## Local Development

```bash
# Install
yarn

# Start Postgres
docker-compose up -d

# Create .env.local
cat > .env.local <<EOF
DATABASE_HOST=localhost
DATABASE_PORT=54321
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=postgres
API_KEY=dev-api-key
SESSION_SECRET=dev-session-secret
ADMIN_PASSWORD=admin
PORT=3001
EOF

# Build schema + migrate
yarn workspace @harbor-app/schema build
yarn db:migrate

# Run backend
cd packages/backend && env $(cat ../../.env.local | xargs) bun run src/server.ts

# Run frontend (separate terminal)
cd packages/frontend && VITE_API_URL=http://localhost:3001 yarn dev
```

## Production

```bash
# Create .env.prod from example
cp .env.prod.example .env.prod
# Edit with real values

# Deploy
set -a && source .env.prod && set +a
docker-compose -f docker-compose.prod.yml up -d
```

## Deploy Flow

1. Work on a feature branch
2. Open PR when ready
3. Merge to `main`
4. GitHub Action auto-deploys to devbox via self-hosted runner

## API Auth

- **Browser:** POST `/api/auth/login` with `{ password }`, uses session cookie
- **Agents:** Pass `X-API-Key` header on all requests
