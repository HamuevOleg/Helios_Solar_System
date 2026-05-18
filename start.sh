#!/bin/sh
# Launch backend (Bun) + fake-helios firmware simulator together.
# Backend is pid1's wait target — if it dies, container exits.

set -e

cleanup() {
  echo "[start] SIGTERM, stopping children..."
  kill -TERM "$FAKE_PID" 2>/dev/null || true
  kill -TERM "$BRIDGE_PID" 2>/dev/null || true
  wait
}
trap cleanup TERM INT

echo "[start] launching HELIOS backend on :$PORT"
cd /app/backend
bun run src/index.ts &
BRIDGE_PID=$!

# Wait for backend to come up before launching the fake firmware.
i=0
while [ $i -lt 30 ]; do
  if wget -q -O- "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    break
  fi
  i=$((i+1))
  sleep 0.5
done

echo "[start] launching fake-helios firmware simulator"
cd /app/tools
node fake-helios.mjs &
FAKE_PID=$!

wait $BRIDGE_PID
