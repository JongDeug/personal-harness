#!/usr/bin/env bash
# tmux cheat sheet — 이 설정(.tmux.conf)에 실제로 바인딩된 키만 정리.
# 터미널에서: tcheat   |   tmux 안에서: prefix + ?  (display-popup)
# 색상은 Catppuccin Mocha (truecolor). prefix = C-Space.

set -u

# ── 팔레트 (truecolor) ──────────────────────────────────────────────
c() { printf '\033[38;2;%sm' "$1"; }       # 전경색
b() { printf '\033[48;2;%sm' "$1"; }       # 배경색
R='\033[0m'; BOLD='\033[1m'; DIM='\033[2m'
MAUVE='203;166;247'; GREEN='166;227;161'; TEXT='205;214;244'
SUB='166;173;200'; PEACH='250;179;135'; RED='243;139;168'
BLUE='137;180;250'; SURFACE='69;71;90'; BASE='30;30;46'

# prefix 는 가능하면 tmux 에서 실시간으로 읽고, 없으면 C-Space
PREFIX="C-Space"
if [ -n "${TMUX:-}" ] && command -v tmux >/dev/null 2>&1; then
  p=$(tmux show -gv prefix 2>/dev/null)
  [ -n "$p" ] && PREFIX="${p#C-}"  && PREFIX="C-${PREFIX}"
fi

hr()  { printf "$(c "$SURFACE")%s${R}\n" "────────────────────────────────────────────────────────────"; }
head_() { printf "  $(c "$MAUVE")${BOLD}%s${R}\n" "$1"; }
# 키/설명 한 줄: 키는 초록 굵게, 설명은 본문색
row() { printf "    $(c "$GREEN")${BOLD}%-14s${R} $(c "$TEXT")%s${R}\n" "$1" "$2"; }
note(){ printf "    $(c "$RED")%s${R} $(c "$SUB")%s${R}\n" "$1" "$2"; }

clear 2>/dev/null || true
printf "\n"
printf "  $(b "$MAUVE")$(c "$BASE")${BOLD} tmux cheat sheet ${R}   $(c "$SUB")prefix = $(c "$PEACH")${BOLD}%s${R}$(c "$SUB")   ·  \`|\` \`-\` 분할 · \`h j k l\` 이동${R}\n\n" "$PREFIX"

head_ "PANES  (분할·이동·리사이즈)"
row "prefix |"   "좌우 분할 (현재 디렉토리 유지)"
row "prefix -"   "상하 분할 (현재 디렉토리 유지)"
row "prefix h/j/k/l" "왼/아래/위/오른쪽 pane 이동 (vim식)"
row "C-h/j/k/l"  "vim ↔ tmux pane 이동 (prefix 없이·vim-tmux-navigator)"
row "prefix H/J/K/L" "pane 크기 조절 (5칸씩)"
row "prefix z"   "현재 pane 확대/복귀 (에이전트 pane 크게 볼 때)"
row "prefix e"   "sync-panes 토글 (여러 pane 에 동시 입력)"
row "prefix x"   "현재 pane 닫기"
printf "\n"

head_ "WINDOWS  (창)"
row "prefix c"   "새 window (현재 디렉토리에서)"
row "M-Left / M-Right" "이전 / 다음 window (Alt+←/→, prefix 없이)"
row "prefix 1..9" "번호로 window 이동"
row "prefix ,"   "window 이름 변경"
row "prefix &"   "window 닫기"
printf "\n"

head_ "SESSIONS  (세션)"
row "prefix s"   "세션 목록·전환"
row "prefix d"   "detach (세션 백그라운드로)"
row "prefix \$"   "세션 이름 변경"
row "prefix S"   "세션 저장 (resurrect)"
row "prefix R"   "세션 복원 (resurrect)"
note "↺" "continuum 이 15분마다 자동 저장·부팅 시 복원"
printf "\n"

head_ "COPY MODE  (복사, vi 키)"
row "prefix ["   "copy mode 진입   ·  q 로 나가기"
row "v / Space"  "선택 시작 (vi)"
row "y"          "복사 → OS 클립보드 (OSC52, SSH 넘어서도 전달)"
row "/ 또는 ?"   "아래로/위로 검색"
row "마우스 드래그" "드래그만으로 복사됨 (mouse on)"
printf "\n"

head_ "TOOLS / POPUP  (팝업 도구)"
row "prefix g"   "lazygit (90% 팝업)"
row "prefix G"   "git worktree 선택·생성 (fzf) → 열면 claude 자동 실행"
printf "      $(c "$SUB")└ 팝업 안: $(c "$GREEN")Enter$(c "$SUB")=현재 창 분할 · $(c "$GREEN")C-w$(c "$SUB")=새 window · $(c "$GREEN")C-d$(c "$SUB")=삭제 · $(c "$GREEN")M-Enter$(c "$SUB")=cd${R}\n"
row "prefix p"   "pane 점퍼 (모든 에이전트 목록 → 즉시 이동, 🔔=대기)"
row "prefix r"   "설정 리로드 (.tmux.conf)"
row "prefix ?"   "이 치트시트"
printf "\n"

head_ "AGENT-FRIENDLY  (에이전트 활용 팁)"
note "●" "백그라운드 창에서 에이전트가 끝나면(BEL) 상태줄에 붉은 ● + OS 알림"
note "p" "prefix p 로 모든 에이전트 pane 을 훑고 대기중(🔔)인 곳으로 점프"
note "z" "에이전트 pane 을 prefix z 로 확대해 로그 집중 확인"
note "e" "prefix e 로 여러 에이전트 pane 에 같은 명령 브로드캐스트"
note "G" "작업별 git worktree 를 pane 으로 띄워 여러 에이전트 병렬 실행"
printf "\n"
hr

# tmux 팝업(display-popup -E)으로 떴을 때만 키 대기. 터미널 직접 실행이면 바로 종료.
if [ -n "${TMUX:-}" ] && [ -t 0 ] && [ "${TMUX_CHEAT_WAIT:-}" = "1" ]; then
  printf "  $(c "$SUB")아무 키나 누르면 닫힘…${R}"
  read -rsn 1
fi
