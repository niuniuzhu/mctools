#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ "$#" -eq 0 ]; then
	"$SCRIPT_DIR/stop-server.sh" 3000
	"$SCRIPT_DIR/stop-server.sh" 3001
	"$SCRIPT_DIR/stop-server.sh" 3002
	"$SCRIPT_DIR/stop-server.sh" 3003
	"$SCRIPT_DIR/stop-server.sh" 3004
	"$SCRIPT_DIR/start-server.sh" 3000
	"$SCRIPT_DIR/start-server.sh" 3001
	"$SCRIPT_DIR/start-server.sh" 3002
	"$SCRIPT_DIR/start-server.sh" 3003
	"$SCRIPT_DIR/start-server.sh" 3004
else
	"$SCRIPT_DIR/stop-server.sh" "$@"
	"$SCRIPT_DIR/start-server.sh" "$@"
fi