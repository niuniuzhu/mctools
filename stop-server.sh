#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MCTOOLS_PORT="${1:-${MCTOOLS_PORT:-3001}}"
PID_FILE="$SCRIPT_DIR/.mctools-server-$MCTOOLS_PORT.pid"
STOP_TIMEOUT_SECONDS=5

if [ ! -f "$PID_FILE" ]; then
  echo "mctools is not running."
  exit 0
fi

SERVER_PID=$(cat "$PID_FILE")

if [ -z "$SERVER_PID" ]; then
  rm -f "$PID_FILE"
  echo "Removed empty PID file."
  exit 0
fi

if ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  rm -f "$PID_FILE"
  echo "Removed stale PID file for process $SERVER_PID."
  exit 0
fi

kill "$SERVER_PID"

WAITED=0
while kill -0 "$SERVER_PID" >/dev/null 2>&1 && [ "$WAITED" -lt "$STOP_TIMEOUT_SECONDS" ]; do
  sleep 1
  WAITED=$((WAITED + 1))
done

if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  kill -KILL "$SERVER_PID" >/dev/null 2>&1 || true
  sleep 1
fi

if kill -0 "$SERVER_PID" >/dev/null 2>&1; then
  echo "Failed to stop mctools. PID: $SERVER_PID"
  exit 1
fi

rm -f "$PID_FILE"
echo "mctools stopped. PID: $SERVER_PID (port $MCTOOLS_PORT)"