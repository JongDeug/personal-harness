#!/usr/bin/env bash
# notify.sh — Claude Code Notification 훅
# tmux 알림 + OS 네이티브 알림 (Windows/WSL, Mac, Linux 호환)

set -euo pipefail

INPUT=$(cat)
MESSAGE=$(echo "$INPUT" | grep -o '"message"\s*:\s*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/' | head -1)
[ -z "$MESSAGE" ] && MESSAGE="Claude Code 작업 완료"

TITLE="Claude Code"
TMUX_CONTEXT=""

# --- tmux 컨텍스트 ---
if command -v tmux &>/dev/null && [ -n "${TMUX:-}" ]; then
  SESSION_NAME=$(tmux display-message -p '#S' 2>/dev/null || true)
  WINDOW_NAME=$(tmux display-message -p '#W' 2>/dev/null || true)
  TMUX_CONTEXT="[$SESSION_NAME:$WINDOW_NAME]"
  tmux display-message -d 5000 "$TMUX_CONTEXT $TITLE: $MESSAGE" 2>/dev/null || true
fi

# --- OS 네이티브 알림 ---
detect_os() {
  if [[ "$(uname -r)" == *microsoft* || "$(uname -r)" == *Microsoft* ]]; then
    echo "wsl"
  elif [[ "$(uname)" == "Darwin" ]]; then
    echo "mac"
  else
    echo "linux"
  fi
}

OS=$(detect_os)

case "$OS" in
  wsl)
    TOAST_TITLE="$TITLE ${TMUX_CONTEXT}"
    powershell.exe -NoProfile -Command "
      [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
      [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
      \$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
      \$xml.LoadXml('<toast><visual><binding template=\"ToastText02\"><text id=\"1\">$TOAST_TITLE</text><text id=\"2\">$MESSAGE</text></binding></visual></toast>')
      [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Claude Code').Show([Windows.UI.Notifications.ToastNotification]::new(\$xml))
    " 2>/dev/null || true
    ;;
  mac)
    osascript -e "display notification \"$MESSAGE\" with title \"$TITLE ${TMUX_CONTEXT}\"" 2>/dev/null || true
    ;;
  linux)
    notify-send "$TITLE ${TMUX_CONTEXT}" "$MESSAGE" 2>/dev/null || true
    ;;
esac
