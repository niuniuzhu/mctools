#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PID_FILE="$SCRIPT_DIR/.mctools-server.pid"
LOG_FILE="$SCRIPT_DIR/mctools-server.log"
MCTOOLS_PORT="${MCTOOLS_PORT:-3001}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed or not in PATH."
  exit 1
fi

if [ -f "$PID_FILE" ]; then
  EXISTING_PID=$(cat "$PID_FILE")
  if [ -n "$EXISTING_PID" ] && kill -0 "$EXISTING_PID" >/dev/null 2>&1; then
    echo "mctools is already running in the background. PID: $EXISTING_PID"
    echo "Log file: $LOG_FILE"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR"
PORT="$MCTOOLS_PORT" nohup npm start >"$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

echo "mctools started in the background. PID: $SERVER_PID"
echo "Log file: $LOG_FILE"
echo "URL: http://127.0.0.1:$MCTOOLS_PORT"