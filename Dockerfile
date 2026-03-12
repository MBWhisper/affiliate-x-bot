# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (ci = deterministic, no devDep pruning yet)
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build


# ─── Production stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Only install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy ONLY the compiled output (dist folder)
COPY --from=builder /app/dist ./dist

# Persist the failed-tweet queue across restarts
VOLUME ["/app/queue"]

# Default: run the scheduler (POST_SCHEDULE must be set in .env / compose)
CMD ["node", "dist/jobs/postDailyDeals.js"]
