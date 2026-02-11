# Harbor Works

Web dashboard for managing AI agent workforces. Built on [Convex](https://convex.dev) + React + a host daemon that bridges Convex to [OpenClaw](https://openclaw.ai).

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full system design.

## Structure

```
harbor-app/
├── frontend/          # React + Vite (deployed to app.harborworks.ai via S3 + CloudFront)
├── daemon/            # Node.js daemon (runs on each harbor host alongside OpenClaw)
├── docker-compose.host.yml   # Host stack: daemon + gateway + CLI
├── docker-compose.dev.yml    # Local dev: frontend with hot reload
└── cli.sh                    # Shortcut for OpenClaw CLI commands
```

## Development

```bash
# Start frontend with hot reload
docker compose -f docker-compose.dev.yml up -d
# → http://localhost:5173

# Run tests
cd frontend && npm test
```

## Host Setup

```bash
cp .env.host.example .env.host
# Fill in CONVEX_URL, HARBOR_API_KEY, OPENCLAW_GATEWAY_TOKEN

docker compose -f docker-compose.host.yml --env-file .env.host up -d
```

## Deployment

Frontend deploys automatically on push to `main` via GitHub Actions (S3 + CloudFront).

Required repo config:
- **Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- **Vars:** `CLOUDFRONT_DISTRIBUTION_ID`
