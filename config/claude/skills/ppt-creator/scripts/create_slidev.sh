#!/usr/bin/env bash
# create_slidev.sh - Build Slidev HTML presentation from a .md file
#
# Usage:
#   bash create_slidev.sh <slides.md> <output-dir>
#
# Output:
#   <output-dir>/index.html  (self-contained, open in browser)
#   <output-dir>/...         (assets)

set -e

SLIDES_MD="$1"
OUTPUT_DIR="$2"
WORKSPACE="$(dirname "$(realpath "$0")")/../slidev-workspace"

if [ -z "$SLIDES_MD" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Usage: bash create_slidev.sh <slides.md> <output-dir>"
  exit 1
fi

SLIDES_ABS="$(realpath "$SLIDES_MD")"
OUTPUT_ABS="$(realpath -m "$OUTPUT_DIR")"

echo "[INFO] Building Slidev: $SLIDES_ABS"
echo "[INFO] Output: $OUTPUT_ABS"

# Copy slide file into workspace
cp "$SLIDES_ABS" "$WORKSPACE/slides.md"

cd "$WORKSPACE"

# Build
npx slidev build slides.md --base ./ --out "$OUTPUT_ABS" 2>&1

echo "[OK] Saved: $OUTPUT_ABS/index.html"

# ── 런처 스크립트 생성 ──────────────────────────────────────────
# Windows: open.bat — Chrome file:// 직접 열기 (서버 불필요, routerMode:hash 빌드 전제)
python3 -c "
lines = [
    '@echo off\r\n',
    'set DIR=%~dp0\r\n',
    'set DIR=%DIR:\\\\=/%\r\n',
    'start chrome --disable-web-security --allow-file-access-from-files --user-data-dir=%TEMP%\\\\chrome-slides \"file:///%DIR%index.html\"\r\n',
]
import sys
with open(sys.argv[1], 'w', newline='') as f:
    f.writelines(lines)
" "$OUTPUT_ABS/open.bat"

# Windows: serve.bat — WSL 경유 npx serve (백업용)
python3 -c "
lines = [
    '@echo off\r\n',
    'echo Starting slide server via WSL...\r\n',
    'start http://localhost:3030\r\n',
    'wsl bash -c \"cd \$(wslpath \047%~dp0\047) && npx serve . -l 3030\"\r\n',
]
import sys
with open(sys.argv[1], 'w', newline='') as f:
    f.writelines(lines)
" "$OUTPUT_ABS/serve.bat"

# Mac/Linux: serve.sh
cat > "$OUTPUT_ABS/serve.sh" << 'UNIXEOF'
#!/usr/bin/env bash
PORT=3030
echo "Starting local server at http://localhost:$PORT ..."
if command -v npx &>/dev/null; then
  (sleep 1 && open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null) &
  npx serve . -l $PORT
elif command -v python3 &>/dev/null; then
  (sleep 1 && open "http://localhost:$PORT" 2>/dev/null || xdg-open "http://localhost:$PORT" 2>/dev/null) &
  python3 -m http.server $PORT
else
  echo "[ERROR] Node.js or Python3 is required."
fi
UNIXEOF
chmod +x "$OUTPUT_ABS/serve.sh"

# README
cat > "$OUTPUT_ABS/README.md" << 'READMEEOF'
# 슬라이드 열기

## Windows
`serve.bat` 더블클릭 → 브라우저 자동 오픈

## Mac / Linux
```bash
bash serve.sh
```

## 수동으로 열기
```bash
# Node.js 있는 경우
npx serve . -l 3030

# Python 있는 경우
python3 -m http.server 3030
```
그 다음 브라우저에서 `http://localhost:3030` 접속

## 발표자 모드
슬라이드에서 `P` 키 → 발표자 노트 + 다음 슬라이드 미리보기
READMEEOF

echo "[OK] Launchers: serve.bat (Windows) / serve.sh (Mac/Linux)"
