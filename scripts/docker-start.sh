#!/bin/sh
set -e

API_PORT="${API_INTERNAL_PORT:-1337}"
WEB_DIR="${WEB_DIR:-/app/web}"
SERVER_DIR="${SERVER_DIR:-/app/server}"

(
  cd "$SERVER_DIR"
  PORT="$API_PORT" node index.js
) &
API_PID=$!

cleanup() {
  kill "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

ready=0
for _ in $(seq 1 90); do
  if node -e "fetch('http://127.0.0.1:${API_PORT}/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    ready=1
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "API process exited before becoming healthy"
    exit 1
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "API health check timed out"
  exit 1
fi

cd "$WEB_DIR"
exec node server.js
