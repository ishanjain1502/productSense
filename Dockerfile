# syntax=docker/dockerfile:1
# Single container: Next.js on $PORT (public) + Express on 127.0.0.1:1337 (internal).

FROM node:20-bookworm-slim AS client-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
ENV NEXT_TELEMETRY_DISABLED=1
# Same-origin API (Next rewrites to internal Express).
ENV NEXT_PUBLIC_API_URL=
RUN npm run build

FROM node:20-bookworm-slim AS server-deps
WORKDIR /app/server
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev \
  && npm rebuild sqlite3 --build-from-source

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV API_INTERNAL_PORT=1337
ENV WEB_DIR=/app/web
ENV SERVER_DIR=/app/server
ENV DATABASE_PATH=./data/app.db
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=client-builder /app/client/.next/standalone ./web
COPY --from=client-builder /app/client/.next/static ./web/.next/static
COPY --from=client-builder /app/client/public ./web/public
COPY scripts/docker-start.sh ./docker-start.sh

RUN chmod +x /app/docker-start.sh \
  && mkdir -p /app/server/data \
  && chown -R node:node /app

USER node
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=10s --start-period=120s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/app/docker-start.sh"]
