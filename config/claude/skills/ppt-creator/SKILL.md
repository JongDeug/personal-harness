---
name: ppt-creator
description: "Generate presentation slides for knowledge sharing, tech talks, and developer sessions. Use when: (1) asked to create a PPT/presentation/슬라이드 on any topic, (2) user wants to explain concepts visually (e.g., 'Claude Code의 skill/hook/sub-agent 설명 슬라이드 만들어줘'), (3) user provides slide content to format into a deck. Supports both modes: AI generates full outline+content from a topic, or user provides content and AI structures/designs the deck."
---

# PPT Creator

세 가지 출력 형식 지원:

| 형식 | 명령 | 특징 |
|------|------|------|
| **Slidev (기본)** | `create_slidev.sh` | 디자인 최고, `open.bat` 더블클릭으로 바로 열기 ✅ |
| **Reveal.js** | `create_reveal.js` | 단일 HTML, 서버 완전 불필요 |
| **PPTX (레거시)** | `create_pptx.py` | `.pptx`, MS Office 편집 가능 |

**사용자가 형식을 지정하지 않으면 Slidev로 생성.**

---

## ⚠️ 필수 규칙 (항상 적용)

1. **`routerMode: hash` 필수** — Slidev frontmatter에 항상 포함. 없으면 `file://`에서 슬라이드 이동 시 404 발생
2. **`open.bat` 자동 생성** — `create_slidev.sh`가 자동 생성함. 별도로 만들 필요 없음
3. **`open.bat` 동작 방식** — Chrome을 `--disable-web-security` 플래그로 실행해 `file://` 로컬 파일을 바로 염. 서버 불필요
4. **`rm -rf` 금지** — Obsidian 폴더 업데이트 시 `rsync --delete` 또는 `touch` 방식 사용. `rm -rf` 후 복사하면 Obsidian Sync가 삭제로 인식해 서버에서도 파일이 사라짐

---

## 형식 선택 가이드

| 상황 | 추천 형식 |
|------|---------|
| 일반 발표 (기본) | **Slidev** |
| Obsidian에 보관 | **Slidev** |
| 개발자 대상, 코드 중심 발표 | **Slidev** |
| Chrome 없는 환경 / 완전 오프라인 | Reveal.js |
| MS Office에서 편집 필요 | PPTX |

---

## 인터랙티브 워크플로우

요청이 막연할 때 아래 순서로 확인 후 생성:

```
1. 발표 주제
2. 대상 청중 (개발자 / 비개발자 / 혼합)
3. 발표 시간 → 슬라이드 수 추천
   5분 → 5~6장 | 10분 → 8~10장 | 20분+ → 12~18장
4. 발표 목적 (설명 / 설득 / 공유 / 온보딩)
5. 구성안 텍스트로 제안 → 확인 후 생성
```

주제+시간+목적이 모두 포함된 요청이면 바로 생성해도 됨.

---

## Slidev 워크플로우 (기본)

### 명령
```bash
bash ~/.claude/skills/ppt-creator/scripts/create_slidev.sh \
  <slides.md> <output-dir/>
```

### 출력 구성
- `index.html` + `assets/` — 슬라이드 본체
- `open.bat` — **Windows 더블클릭으로 바로 열기** ✅ (Chrome file:// 방식)
- `serve.bat` — WSL 경유 npx serve (백업용)
- `serve.sh` — Mac/Linux용
- `README.md` — 사용 안내

### Frontmatter 필수 템플릿
```markdown
---
theme: default
colorSchema: dark
transition: slide-left
title: 발표 제목
info: |
  부제목 또는 설명
highlighter: shiki
lineNumbers: false
routerMode: hash
fonts:
  sans: Inter
  mono: JetBrains Mono
---
```
> ⚠️ `routerMode: hash` 빠지면 슬라이드 이동 시 404 오류 발생  
> ℹ️ `theme: default` + `style.css`(slidev-workspace에 상주)가 sensational 디자인을 적용함. `seriph` 쓰면 구형 디자인으로 돌아감

### Markdown 포맷
- `references/slidev-design.md` 참고
- `<v-clicks>`, `<v-click>` 애니메이션 태그 지원

### open.bat 동작 원리
```bat
@echo off
set DIR=%~dp0
set DIR=%DIR:\=/%
start chrome --disable-web-security --allow-file-access-from-files --user-data-dir=%TEMP%\chrome-slides "file:///%DIR%index.html"
```
- Chrome 별도 프로필(`%TEMP%\chrome-slides`)로 실행 → 기존 Chrome 세션 영향 없음
- 이 창에서는 다른 사이트 접속 금지 (보안 꺼진 상태)

### Obsidian 저장 및 동기화

> ⚠️ Obsidian 경로는 사용자(workspace)마다 다름. 호출 전 워크스페이스의 AGENTS.md에서 확인할 것.
> - jongdeug: `~/.claude/channels/telegram/jongdeug/obsidian/`
> - 0deug: `~/.openclaw/workspace-0deug/obsidian/`

```bash
OBSIDIAN_DIR=<워크스페이스별 경로>

# rsync로 업데이트 (rm -rf 절대 금지)
rsync -av --delete <output-dir>/ $OBSIDIAN_DIR/Project/<name>-slides/

# 동기화 강제 트리거
find $OBSIDIAN_DIR/Project/<name>-slides/ -type f | xargs touch
```

---

## Reveal.js 워크플로우

### 명령
```bash
node ~/.claude/skills/ppt-creator/scripts/create_reveal.js \
  <slides.md> [output.html]
```

### 출력 특성
- 단일 `.html` 파일 (~1~2MB, 모든 JS/CSS 인라인)
- `file://` 직접 열기 가능 (서버 완전 불필요) ✅
- 발표자 노트: `S` 키 | 전체화면: `F` 키 | PDF: `Ctrl+P`

### Markdown 포맷
- 슬라이드 구분: `---`
- 레이아웃: `layout: cover | section | two-cols | end | quote`
- 코드 하이라이팅: ` ```typescript {2,4-6} ` (라인 번호 강조)
- 발표자 노트: `<!-- 노트 내용 -->`

---

## PPTX 워크플로우 (레거시)

### 명령
```bash
VENV=~/.claude/skills/ppt-creator/.venv
$VENV/bin/python3 ~/.claude/skills/ppt-creator/scripts/create_pptx.py <input.json> [output.pptx] [--script]
```

- JSON 구조: `references/slide-design.md` 참고
- `--script`: `_script.md` 발표 대본 함께 생성
- 프리셋 템플릿: `templates/tech-talk.json`, `templates/onboarding.json`, `templates/retrospective.json`

### 지원 슬라이드 타입
`title` / `section` / `bullets` / `code` / `two_column` / `table` / `image` / `quote` / `end`

---

## 기본 출력 경로

> ⚠️ Obsidian 경로는 사용자(workspace)마다 다름. 워크스페이스의 AGENTS.md에서 확인할 것.
> - jongdeug: `~/.claude/channels/telegram/jongdeug/obsidian/`
> - 0deug: `~/.openclaw/workspace-0deug/obsidian/`

- Slidev: `<OBSIDIAN_DIR>/Project/<topic>-slides/`
- Reveal.js: `<OBSIDIAN_DIR>/Project/<topic>.html`
- PPTX: `/tmp/<topic>.pptx` (Obsidian에 저장하려면 별도 복사)
