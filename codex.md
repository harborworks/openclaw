# Codex: Development Guidelines

This document outlines the conventions and workflows for working on the Sparrow Tags monorepo.

## Table of Contents

- [Codex: Development Guidelines](#codex-development-guidelines)
  - [Table of Contents](#table-of-contents)
  - [Monorepo Dependency Management](#monorepo-dependency-management)
  - [Infrastructure](#infrastructure)
  - [Backend](#backend)
  - [Frontend](#frontend)
    - [Available shadcn/ui Components](#available-shadcnui-components)

## Monorepo Dependency Management

> We use Yarn workspaces to manage our packages.

To add a dependency to a specific workspace:

```bash
yarn workspace @sparrow-tags/<package-name> add <dependency>
```

For example:

```bash
yarn workspace @sparrow-tags/frontend add react-router-dom
```

To add a development-only dependency, append `-D`:

```bash
yarn workspace @sparrow-tags/backend add -D typescript
```

## Infrastructure

> Our infrastructure is defined using SST (https://sst.dev/) on top of Pulumi.

The SST configuration lives in `sst.config.ts` and the corresponding stacks under the `.sst/` directory.

Common commands:

- `npx sst dev` — Start the local development environment.
- `npx sst deploy` — Deploy stacks to the cloud.
- `npx sst remove` — Remove deployed stacks.

## Backend

> The backend service is built with TypeScript and Express.

Location: `packages/backend`  
Database schema and migrations are managed with [drizzle-kit](https://github.com/drizzle-team/drizzle-kit) in `packages/schema`.

Recommended workflows:

- `yarn workspace @sparrow-tags/backend dev` — Run the development server.
- `yarn workspace @sparrow-tags/schema migrate:dev` — Apply local migrations.
- `yarn workspace @sparrow-tags/schema migrate:push` — Apply migrations to a remote database.

## Frontend

> The frontend is a React app located in `packages/frontend`.  
> We leverage the [shadcn/ui][] component library to ensure design consistency.

All reusable UI components live in:

> `packages/frontend/src/components/ui`

Before adding new UI dependencies or creating custom components, check if an existing shadcn/ui component meets your needs.

### Available shadcn/ui Components

<!-- Automatically keep this list in sync with `packages/frontend/src/components/ui` -->

- accordion
- alert-dialog
- alert
- aspect-ratio
- avatar
- badge
- breadcrumb
- button
- calendar
- card
- carousel
- chart
- checkbox
- collapsible
- command
- context-menu
- dialog
- drawer
- dropdown-menu
- form
- hover-card
- input-otp
- input
- label
- menubar
- navigation-menu
- pagination
- popover
- progress
- radio-group
- resizable
- scroll-area
- select
- separator
- sheet
- sidebar
- skeleton
- slider
- sonner
- switch
- table
- tabs
- textarea
- toggle-group
- toggle
- tooltip

> **Important:** For toast notifications, always use the `sonner` component — do not implement custom toast logic.

[shadcn/ui]: https://ui.shadcn.com/
