# clm-system backend (NestJS + Prisma/PostgreSQL)
# Build context: clm-system/ (pnpm workspace root)
# Workspace requires Node >= 22 (package.json engines + .nvmrc)
FROM node:22-alpine

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    HUSKY=0
RUN corepack enable

WORKDIR /app

# Workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/backend/package.json apps/backend/package.json

# Install backend deps including devDependencies:
# prisma CLI and ts-node are needed at runtime for migrate deploy + seed
RUN pnpm install --no-frozen-lockfile --filter ./apps/backend...

# Sources needed to build the backend (tsconfig.json extends ../../tsconfig.base.json)
COPY tsconfig.base.json ./
COPY apps/backend apps/backend

WORKDIR /app/apps/backend

# Prisma client (schema: prisma/schema.prisma) + NestJS build -> dist/
RUN pnpm exec prisma generate && pnpm run build

# Runtime env consumed by the app:
# DATABASE_URL, APP_PORT (default 3000; Dokploy sets 4020), JWT_SECRET,
# JWT_REFRESH_SECRET, NODE_ENV, SEED_DEMO_DATA
EXPOSE 4020

# migrate deploy + seed (idempotent: skips itself when NODE_ENV=production
# unless SEED_DEMO_DATA=true) + start compiled app
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:seed && node dist/main"]
