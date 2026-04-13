#!/usr/bin/env sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed or not in PATH; cannot start the server."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed or not in PATH; cannot start the server."
  exit 1
fi

start_in_current_shell() {
  cd "$SCRIPT_DIR"
  exec npm start
}

case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*)
    if command -v cygpath >/dev/null 2>&1; then
      WINDOWS_DIR=$(cygpath -aw "$SCRIPT_DIR")
      cmd.exe /c start "mctools-server" cmd /k "cd /d \"$WINDOWS_DIR\" && npm start"
      exit 0
    fi
    start_in_current_shell
    ;;
  Darwin)
    if command -v osascript >/dev/null 2>&1; then
      osascript <<EOF
tell application "Terminal"
  activate
  do script "cd $(printf '%s' "$SCRIPT_DIR" | sed 's/[\\"]/\\\\&/g') && npm start"
end tell
EOF
      exit 0
    fi
    start_in_current_shell
    ;;
  *)
    if command -v x-terminal-emulator >/dev/null 2>&1; then
      x-terminal-emulator -e sh -lc "cd '$SCRIPT_DIR' && npm start; exec sh"
      exit 0
    fi

    if command -v gnome-terminal >/dev/null 2>&1; then
      gnome-terminal -- sh -lc "cd '$SCRIPT_DIR' && npm start; exec sh"
      exit 0
    fi

    if command -v konsole >/dev/null 2>&1; then
      konsole -e sh -lc "cd '$SCRIPT_DIR' && npm start; exec sh"
      exit 0
    fi

    if command -v xfce4-terminal >/dev/null 2>&1; then
      xfce4-terminal --command="sh -lc 'cd '\''$SCRIPT_DIR'\'' && npm start; exec sh'"
      exit 0
    fi

    if command -v xterm >/dev/null 2>&1; then
      xterm -e sh -lc "cd '$SCRIPT_DIR' && npm start; exec sh" &
      exit 0
    fi

    start_in_current_shell
    ;;
esac