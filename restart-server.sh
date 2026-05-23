#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

"$SCRIPT_DIR/stop-server.sh" "$@"
"$SCRIPT_DIR/start-server.sh" "$@"