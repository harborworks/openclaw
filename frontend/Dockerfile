FROM node:22-bookworm-slim

WORKDIR /app

# Install root deps (convex package needed by generated files)
COPY package.json package-lock.json ./
RUN npm ci

# Install frontend deps
COPY frontend/package.json frontend/package-lock.json ./frontend/
RUN cd frontend && npm ci

# Copy convex generated files (needed for @convex alias)
COPY convex/_generated ./convex/_generated

# Copy frontend source
COPY frontend ./frontend

WORKDIR /app/frontend

EXPOSE 5173

CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
