# Stage 1: Dependencies
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl ca-certificates && \
    corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Skip postinstall (prisma generate) - prisma schema not copied yet; we run it in builder
# No --frozen-lockfile: lockfile may be out of sync (e.g. new deps); install still reproducible via lockfile when present
RUN pnpm install --prod=false --ignore-scripts

# Stage 2: Build
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl ca-certificates && \
    corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json pnpm-lock.yaml tsconfig*.json nest-cli.json prisma.config.ts ./

COPY prisma ./prisma

COPY src ./src

# Set a dummy DATABASE_URL for prisma generate (it doesn't need a real connection)
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm prisma generate

RUN pnpm build

# Verify build output exists
RUN ls -la dist/ || (echo "Build failed - dist directory not found" && exit 1)
RUN test -f dist/main.js || test -f dist/src/main.js || (echo "Build failed - main.js not found" && ls -la dist/ && exit 1)

# Bundle @prisma/client-runtime-utils (dereferenced) for runner - Prisma client in dist/ needs it at runtime
RUN mkdir -p /tmp/prisma-runtime && (cd node_modules/@prisma && tar chf - client-runtime-utils) | (cd /tmp/prisma-runtime && tar xf -)

# Stage 3: Production
FROM node:20-alpine AS runner

RUN apk add --no-cache openssl ca-certificates && \
    corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Skip postinstall (prisma generate) - we run it explicitly after copying prisma
RUN pnpm install --prod --ignore-scripts

RUN pnpm add prisma@latest

COPY prisma.config.ts ./
COPY prisma ./prisma

# Set a dummy DATABASE_URL for prisma generate (it doesn't need a real connection)
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy?schema=public
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm prisma generate

COPY --from=builder /app/dist ./dist

# Verify dist was copied correctly
RUN ls -la dist/ || (echo "dist directory not found after copy" && exit 1)

# Prisma generated client in dist/ requires @prisma/client-runtime-utils; place it next to the client so require() resolves.
RUN mkdir -p dist/prisma/generated/prisma/node_modules/@prisma
COPY --from=builder /tmp/prisma-runtime/client-runtime-utils dist/prisma/generated/prisma/node_modules/@prisma/

ENV NODE_ENV=production

EXPOSE 8000

# Try dist/main.js first, fallback to dist/src/main.js if needed
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; elif [ -f dist/src/main.js ]; then node dist/src/main.js; else echo 'Error: main.js not found in dist/' && ls -la dist/ && exit 1; fi"]
