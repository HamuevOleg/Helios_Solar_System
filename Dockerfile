# HELIOS v2.4 — single-image demo container.
# Stage 1: build the frontend with Bun + Vite → dist/
# Stage 2: runtime with Bun, runs backend bridge + fake firmware simulator.

# ============ build stage ============
FROM oven/bun:1.3-alpine AS build

WORKDIR /build

# Frontend deps + build
COPY frontend/package.json frontend/bun.lock ./frontend/
RUN cd frontend && bun install --frozen-lockfile

COPY frontend ./frontend
RUN cd frontend && bun run build

# Backend deps (no build step needed — Bun runs TS directly)
COPY backend/package.json backend/bun.lock ./backend/
RUN cd backend && bun install --frozen-lockfile

COPY backend ./backend

# Tools (fake firmware) deps. Use npm since tools is plain Node + mjs.
COPY tools/package.json ./tools/
RUN apk add --no-cache nodejs npm \
 && cd tools && npm install --omit=dev --no-audit --no-fund

COPY tools ./tools

# ============ runtime stage ============
FROM oven/bun:1.3-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
ENV STATIC_DIR=/app/frontend/dist
ENV MQTT_HOST=broker.hivemq.com
ENV MQTT_PORT=1883
ENV DEVICE_ID=helios-001

# Install Node so we can run the fake-firmware .mjs alongside Bun backend.
RUN apk add --no-cache nodejs

COPY --from=build /build/backend/node_modules ./backend/node_modules
COPY --from=build /build/backend/package.json ./backend/package.json
COPY --from=build /build/backend/tsconfig.json ./backend/tsconfig.json
COPY --from=build /build/backend/src ./backend/src

COPY --from=build /build/frontend/dist ./frontend/dist

COPY --from=build /build/tools/node_modules ./tools/node_modules
COPY --from=build /build/tools/package.json ./tools/package.json
COPY --from=build /build/tools/fake-helios.mjs ./tools/fake-helios.mjs

COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 8787
CMD ["./start.sh"]
