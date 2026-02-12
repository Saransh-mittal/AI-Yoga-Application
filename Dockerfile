# Next.js Frontend Dockerfile (multi-stage, optimized for Railway)
# Uses standalone output for minimal image size

# ============================================================================
# Stage 1: Install dependencies
# ============================================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json* ./
RUN npm install

# ============================================================================
# Stage 2: Build the application
# ============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

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
