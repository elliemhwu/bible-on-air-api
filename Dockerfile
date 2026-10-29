# ── build ────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# ── production dependencies ──────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean

# ── runtime ──────────────────────────────────────────────────────────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    UPLOAD_DIR=/app/uploads
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3001
VOLUME ["/app/uploads"]
# The seed runs pending migrations, then creates base data (idempotent)
CMD ["sh", "-c", "node dist/database/seeds/seed.js && exec node dist/main.js"]
