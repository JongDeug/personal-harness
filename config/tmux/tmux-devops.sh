#!/bin/bash
SESSION="devops"

# 이미 있으면 그냥 붙기
if tmux has-session -t $SESSION 2>/dev/null; then
    tmux attach -t $SESSION
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

# ===== Window 4: kt-starfruit-was (4개 - star-1, star-2 서버당 2개씩, 타일 레이아웃) =====
tmux new-window -t $SESSION -n kt-starfruit-was
tmux split-window -h -t $SESSION:kt-starfruit-was
tmux split-window -v -t $SESSION:kt-starfruit-was
tmux split-window -v -t $SESSION:kt-starfruit-was.1
tmux select-layout -t $SESSION:kt-starfruit-was tiled
tmux send-keys -t $SESSION:kt-starfruit-was.1 'ssh star-1' C-m
tmux send-keys -t $SESSION:kt-starfruit-was.2 'ssh star-1' C-m
tmux send-keys -t $SESSION:kt-starfruit-was.3 'ssh star-2' C-m
tmux send-keys -t $SESSION:kt-starfruit-was.4 'ssh star-2' C-m
tmux select-pane -t $SESSION:kt-starfruit-was.1

# ===== Window 5: kt-starfruit-nats (3개 - 타일 레이아웃) =====
tmux new-window -t $SESSION -n kt-starfruit-nats
tmux split-window -h -t $SESSION:kt-starfruit-nats
tmux split-window -v -t $SESSION:kt-starfruit-nats
tmux select-layout -t $SESSION:kt-starfruit-nats tiled
tmux send-keys -t $SESSION:kt-starfruit-nats.1 'ssh star-nats-1' C-m
tmux send-keys -t $SESSION:kt-starfruit-nats.2 'ssh star-nats-2' C-m
tmux send-keys -t $SESSION:kt-starfruit-nats.3 'ssh star-nats-3' C-m
tmux select-pane -t $SESSION:kt-starfruit-nats.1

# ===== Window 6: medichis =====
tmux new-window -t $SESSION -n medichis
tmux send-keys -t $SESSION:medichis 'ssh kt-gateway' C-m

# 첫 window(r2d2)부터 시작
tmux select-window -t $SESSION:r2d2
tmux attach -t $SESSION
