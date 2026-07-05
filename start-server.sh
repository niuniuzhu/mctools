#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
MCTOOLS_PORT="${1:-${MCTOOLS_PORT:-3001}}"
PID_FILE="$SCRIPT_DIR/.mctools-server-$MCTOOLS_PORT.pid"
LOG_FILE="$SCRIPT_DIR/mctools-server-$MCTOOLS_PORT.log"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not in PATH."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed or not in PATH."
  exit 1
fi

start_single_port() {
  port="$1"
  pid_file="$SCRIPT_DIR/.mctools-server-$port.pid"
  log_file="$SCRIPT_DIR/mctools-server-$port.log"

  if [ -f "$pid_file" ]; then
    existing_pid=$(cat "$pid_file")
    if [ -n "$existing_pid" ] && kill -0 "$existing_pid" >/dev/null 2>&1; then
      echo "mctools is already running in the background. PID: $existing_pid"
      echo "Log file: $log_file"
      return 0
    fi
    rm -f "$pid_file"
  fi

  cd "$SCRIPT_DIR"
  PORT="$port" nohup node server.js >"$log_file" 2>&1 < /dev/null &
  server_pid=$!
  echo "$server_pid" > "$pid_file"

  echo "mctools started in the background. PID: $server_pid"
  echo "Log file: $log_file"
  echo "URL: http://127.0.0.1:$port"
}

if [ "$#" -eq 0 ]; then
  start_single_port 3000
  start_single_port 3001
  start_single_port 3002
  start_single_port 3003
  start_single_port 3004
  exit 0
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
PORT="$MCTOOLS_PORT" nohup node server.js >"$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!
echo "$SERVER_PID" > "$PID_FILE"

echo "mctools started in the background. PID: $SERVER_PID"
echo "Log file: $LOG_FILE"
echo "URL: http://127.0.0.1:$MCTOOLS_PORT"
