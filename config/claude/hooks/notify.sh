#!/usr/bin/env bash
# notify.sh — Claude Code Notification 훅
# 알림 클릭 시 해당 tmux 세션으로 이동 (Windows/WSL, Mac, Linux 호환)

set -euo pipefail

INPUT=$(cat)
MESSAGE=$(echo "$INPUT" | grep -o '"message"\s*:\s*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/' | head -1 || true)
[ -z "$MESSAGE" ] && MESSAGE="Claude Code 작업 완료"

TITLE="Claude Code"
SESSION_NAME=""
WINDOW_NAME=""
TMUX_CONTEXT=""

# --- tmux 컨텍스트 ---
if command -v tmux &>/dev/null && [ -n "${TMUX:-}" ]; then
  SESSION_NAME=$(tmux display-message -p '#S' 2>/dev/null || true)
  WINDOW_NAME=$(tmux display-message -p '#W' 2>/dev/null || true)
  TMUX_CONTEXT="[$SESSION_NAME:$WINDOW_NAME]"
  tmux display-message -d 5000 "$TMUX_CONTEXT $TITLE: $MESSAGE" 2>/dev/null || true
fi

# --- OS 감지 ---
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

# --- tmux 세션 전환 명령 생성 ---
build_tmux_switch_cmd() {
  local cmd=""
  if [ -n "$SESSION_NAME" ] && [ -n "$WINDOW_NAME" ]; then
    cmd="tmux switch-client -t '${SESSION_NAME}:${WINDOW_NAME}' 2>/dev/null || tmux select-window -t '${SESSION_NAME}:${WINDOW_NAME}' 2>/dev/null"
  elif [ -n "$SESSION_NAME" ]; then
    cmd="tmux switch-client -t '${SESSION_NAME}' 2>/dev/null"
  fi
  echo "$cmd"
}

TMUX_SWITCH_CMD=$(build_tmux_switch_cmd)

# --- OS별 알림 ---
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
    # terminal-notifier 지원 시 클릭으로 tmux 세션 전환
    if command -v terminal-notifier &>/dev/null; then
      if [ -n "$TMUX_SWITCH_CMD" ]; then
        terminal-notifier \
          -title "$TITLE ${TMUX_CONTEXT}" \
          -message "$MESSAGE" \
          -execute "bash -c '$TMUX_SWITCH_CMD'" \
          -sound default \
          -group "claude-code" 2>/dev/null || true
      else
        terminal-notifier \
          -title "$TITLE" \
          -message "$MESSAGE" \
          -sound default \
          -group "claude-code" 2>/dev/null || true
      fi
    else
      osascript -e "display notification \"$MESSAGE\" with title \"$TITLE ${TMUX_CONTEXT}\"" 2>/dev/null || true
    fi
    ;;
  linux)
    # gdbus 기반 알림 (클릭 액션 지원)
    if [ -n "$TMUX_SWITCH_CMD" ] && command -v gdbus &>/dev/null; then
      # gdbus 로 알림 + 액션 등록, 백그라운드에서 클릭 대기
      (
        NOTIFY_ID=$(gdbus call --session \
          --dest org.freedesktop.Notifications \
          --object-path /org/freedesktop/Notifications \
          --method org.freedesktop.Notifications.Notify \
          "Claude Code" 0 "" "$TITLE ${TMUX_CONTEXT}" "$MESSAGE" \
          '["open", "세션 이동"]' '{}' 10000 2>/dev/null \
          | grep -o '[0-9]*' | head -1)

        if [ -n "$NOTIFY_ID" ]; then
          # 10초간 액션 클릭 대기
          timeout 10 gdbus monitor --session \
            --dest org.freedesktop.Notifications \
            --object-path /org/freedesktop/Notifications 2>/dev/null \
          | while read -r line; do
              if echo "$line" | grep -q "ActionInvoked.*$NOTIFY_ID.*open"; then
                bash -c "$TMUX_SWITCH_CMD" 2>/dev/null || true
                break
              fi
            done
        fi
      ) &
      disown
    else
      notify-send "$TITLE ${TMUX_CONTEXT}" "$MESSAGE" 2>/dev/null || true
    fi
    ;;
esac
