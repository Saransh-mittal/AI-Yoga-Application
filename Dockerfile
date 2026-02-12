# Next.js Frontend Dockerfile (multi-stage, optimized for Railway)
# Uses standalone output for minimal image size

# ============================================================================
# Stage 1: Install dependencies (Debian-slim for native binary compatibility)
# ============================================================================
FROM node:20-slim AS deps
WORKDIR /app

# Copy package.json only (NOT lockfile — lockfile from macOS won't include
# Linux platform binaries for lightningcss/tailwindcss native deps)
COPY package.json ./
RUN npm install

# ============================================================================
# Stage 2: Build the application
# ============================================================================
FROM node:20-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove any macOS lockfile that got copied, not needed for build
RUN rm -f package-lock.json

# Build Next.js (output: 'standalone' is set in next.config.ts)
RUN npm run build

# ============================================================================
# Stage 3: Production runner (minimal image)
# ============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Railway sets PORT dynamically
EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.js"]
