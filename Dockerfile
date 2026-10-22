# Playwright's own image ships Chromium + every system library it needs
# (nss, atk, cups, etc.) already installed — avoids hand-assembling that
# apt dependency list on a generic Node base image, and the version here
# is pinned to match the installed npm package exactly.
FROM mcr.microsoft.com/playwright:v1.64.1-jammy

WORKDIR /app

# Install dependencies first (better layer caching on rebuilds).
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Cache Components stays off (see next.config.ts) — this app gates
# content by purchase entitlement and must render per-request.
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Render sets $PORT; Next.js reads it automatically via `next start`.
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
