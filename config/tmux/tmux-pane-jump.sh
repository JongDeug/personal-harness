#!/usr/bin/env bash
# fzf pane 점퍼 — 모든 세션의 pane 을 "실행명령 + 경로 + 벨" 로 나열해 즉시 점프.
# tmux 안에서: prefix + p  (display-popup 로 실행)
# 벨 울린(에이전트 완료/입력대기) pane 은 🔔 로 표시.

set -u
command -v fzf >/dev/null 2>&1 || { echo "fzf 가 필요합니다"; sleep 1; exit 1; }

# 현재 pane 은 목록에서 제외 (첫 필드 기준). 벨/zoom 플래그 표시.
current=$(tmux display -p '#{session_name}:#{window_index}.#{pane_index}')

target=$(tmux list-panes -a -F \
  '#{session_name}:#{window_index}.#{pane_index}|#{?window_bell_flag,🔔,·}#{?window_zoomed_flag,🔍,·}|#{pane_current_command}|#{b:pane_current_path}|#{window_name}' \
  | awk -F'|' -v cur="$current" '$1 != cur {
      printf "%-16s %s  %-10s %-22s %s\n", $1, $2, $3, $4, $5
    }' \
  | fzf --ansi --reverse \
        --prompt="jump ▸ " \
        --header="Enter: 해당 pane 으로 이동  ·  🔔=대기중  🔍=zoom" \
  | awk '{print $1}')

[ -z "$target" ] && exit 0

sess="${target%%:*}"
win_pane="${target#*:}"        # window.pane
win="${win_pane%%.*}"

tmux switch-client -t "$sess" 2>/dev/null
tmux select-window -t "$sess:$win" 2>/dev/null
tmux select-pane -t "$target" 2>/dev/null
