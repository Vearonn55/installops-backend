# InstallOps API – multi-stage build (git root = this directory)
FROM node:20-alpine AS base

WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Production image
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN mkdir -p uploads backups && chown -R nodejs:nodejs uploads backups
USER nodejs

EXPOSE 8000
CMD ["node", "src/index.js"]
