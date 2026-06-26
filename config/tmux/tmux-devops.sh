#!/bin/bash
SESSION="devops"

# 이미 있으면 그냥 붙기
if tmux has-session -t $SESSION 2>/dev/null; then
    if [ -n "$TMUX" ]; then
        tmux switch-client -t $SESSION
    else
        tmux attach -t $SESSION
    fi
    exit 0
fi

# ===== Window 1: r2d2 =====
tmux new-session -d -s $SESSION -n r2d2
tmux send-keys -t $SESSION:r2d2 'ssh r2d2' C-m

# ===== Window 2: devbox =====
tmux new-window -t $SESSION -n devbox
tmux send-keys -t $SESSION:devbox 'ssh devbox' C-m

# ===== Window 3: staging =====
tmux new-window -t $SESSION -n staging
tmux send-keys -t $SESSION:staging 'ssh staging' C-m

# ===== Window 4: kt-star-was-deploy (2개 - star-1, star-2 서버당 1개씩) =====
tmux new-window -t $SESSION -n kt-star-was-deploy
tmux split-window -h -t $SESSION:kt-star-was-deploy
tmux select-layout -t $SESSION:kt-star-was-deploy tiled
tmux send-keys -t $SESSION:kt-star-was-deploy.1 'ssh star-1' C-m
tmux send-keys -t $SESSION:kt-star-was-deploy.2 'ssh star-2' C-m
tmux select-pane -t $SESSION:kt-star-was-deploy.1

# ===== Window 5: kt-star-was-log (8개 - 2행 4열, 윗줄 star-1 x4 / 아랫줄 star-2 x4, 로그 확인용) =====
LOG_WIN="$SESSION:kt-star-was-log"
tmux new-window -t $SESSION -n kt-star-was-log
# 4개 칼럼으로 균등 분할
tmux split-window -h -t "$LOG_WIN"
tmux split-window -h -t "$LOG_WIN"
tmux split-window -h -t "$LOG_WIN"
tmux select-layout -t "$LOG_WIN" even-horizontal
# 각 칸 위에 호스트 라벨 표시 (pane user option 으로 박아 ssh 원격이 터미널 제목을 덮어써도 유지)
tmux set-option -w -t "$LOG_WIN" pane-border-status top
tmux set-option -w -t "$LOG_WIN" pane-border-format ' #{@host} '
# 각 칼럼을 위/아래로 나눠 윗줄 star-1, 아랫줄 star-2 (pane_id로 추적해 split 후 번호 변동에 안전)
for col in $(tmux list-panes -t "$LOG_WIN" -F '#{pane_left} #{pane_id}' | sort -n | awk '{print $2}'); do
    bottom=$(tmux split-window -v -t "$col" -P -F '#{pane_id}')
    tmux set-option -p -t "$col" @host star-1
    tmux set-option -p -t "$bottom" @host star-2
    tmux send-keys -t "$col" 'ssh star-1' C-m
    tmux send-keys -t "$bottom" 'ssh star-2' C-m
done
tmux select-pane -t "$LOG_WIN.1"

# ===== Window 6: kt-starfruit-nats (3개 - 타일 레이아웃) =====
tmux new-window -t $SESSION -n kt-starfruit-nats
tmux split-window -h -t $SESSION:kt-starfruit-nats
tmux split-window -v -t $SESSION:kt-starfruit-nats
tmux select-layout -t $SESSION:kt-starfruit-nats tiled
tmux send-keys -t $SESSION:kt-starfruit-nats.1 'ssh star-nats-1' C-m
tmux send-keys -t $SESSION:kt-starfruit-nats.2 'ssh star-nats-2' C-m
tmux send-keys -t $SESSION:kt-starfruit-nats.3 'ssh star-nats-3' C-m
tmux select-pane -t $SESSION:kt-starfruit-nats.1

# ===== Window 7: medichis =====
tmux new-window -t $SESSION -n medichis
tmux send-keys -t $SESSION:medichis 'ssh kt-gateway' C-m

# 첫 window(r2d2)부터 시작
tmux select-window -t $SESSION:r2d2
if [ -n "$TMUX" ]; then
    tmux switch-client -t $SESSION
else
    tmux attach -t $SESSION
fi
