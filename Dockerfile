# Playwright's own image ships Chromium + every system library it needs
# (nss, atk, cups, etc.) already installed — avoids hand-assembling that
# apt dependency list on a generic Node base image, and the version here
# is pinned to match the installed npm package exactly.
FROM mcr.microsoft.com/playwright:v1.64.1-jammy

WORKDIR /app

# Install dependencies first (better layer caching on rebuilds).
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Render only forwards a service's env vars into the Docker build as
# build args for ARGs explicitly declared here — needed because Next.js
# inlines NEXT_PUBLIC_* vars into the client bundle at build time, not
# read at container runtime like every other env var in this app.
ARG NEXT_PUBLIC_MAPTILER_KEY
ENV NEXT_PUBLIC_MAPTILER_KEY=$NEXT_PUBLIC_MAPTILER_KEY

COPY . .

# storage/ is gitignored (dev-local file store) and dockerignored, so the
# free-tier container — which has no persistent disk — would otherwise
# start with no photos at all. Bake the real seed photos in at build time
# instead of relying on a runtime copy step.
RUN mkdir -p storage/photos && cp seed-assets/bangkok-photos/*.jpg storage/photos/

# Cache Components stays off (see next.config.ts) — this app gates
# content by purchase entitlement and must render per-request.
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Render sets $PORT; Next.js reads it automatically via `next start`.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
