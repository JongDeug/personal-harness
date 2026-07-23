---
name: explain-diff-chaos
description: Use when the user asks for a rich explanation of a code change, diff, branch, or PR AND wants it saved into the chaos second-brain as a private "개발(Dev)" entry. Authors a 4-section markdown explanation + Excalidraw diagrams and registers it via the chaos API (POST /api/diffs). 트리거는 `/explain-diff-chaos`, "카오스에 이 변경 해설 올려줘", "이 PR 개발 해설로 정리해줘".
---

# Explain Diff → Chaos (개발 해설)

코드 변경(diff/브랜치/PR)을 **chaos 세컨드브레인의 비공개 '개발' 콘텐츠**로 등록한다.
글(Background·Intuition·Code·Quiz)은 마크다운으로, 다이어그램은 **Excalidraw**로 저장한다.
설계 SSOT: chaos 레포 `docs/explain-diff-feature.md`. explain-diff 계열의 chaos 출력 변형이다.
(HTML 변형 `[[explain-diff]]`, Obsidian 변형 `[[explain-diff-obsidian]]`.)

> [!IMPORTANT] 비공개 전용 (단, 오너 스트림·검색엔 편입)
> diffs 는 blog 와 달리 **공개 발행이 없다.** 오너만 인앱 '개발' 탭에서 본다(회사일/민감 diff 가능).
> 공개 URL·SEO·RSS 로 나가지 않는다. PII/사내정보는 그래도 스스로 판단해 과도 노출을 피한다.
> 등록하면 **오너의 인앱 스트림 피드('개발' 레인)·시맨틱 검색(`search_atoms`)에 자동 편입**된다(shadow atom `ev_diff_`, 운동·식단 패턴). **개념/허브는 만들지 않는다**(conceptHints:[]) — 이 편입은 서버(create_diff/REST)가 알아서 하므로 스킬이 따로 할 일은 없다.

## 0. 프리플라이트 (등록 전 필수)

1. **chaos 레포 탐색**: 기본 `/Users/jongdeug/Documents/chaos`(로컬) 또는 `~/workspace/chaos`(서버). 존재하는 쪽을 `CHAOS_DIR` 로.
2. **시크릿 로드**: `CHAOS_DIR/.env` 에서 `SB_INTERNAL_SECRET`, `SB_OWNER_TELEGRAM_ID` 를 읽는다.
3. **API 가동 확인**: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/me` → **401 이면 정상 가동**(미인증). 연결 거부면 chaos-api 를 먼저 띄우라고 안내(`docker compose up` 등).

```bash
CHAOS_DIR=/Users/jongdeug/Documents/chaos
[ -d "$CHAOS_DIR" ] || CHAOS_DIR=~/workspace/chaos
set -a; . "$CHAOS_DIR/.env"; set +a          # SB_INTERNAL_SECRET, SB_OWNER_TELEGRAM_ID
curl -s -o /dev/null -w "chaos-api %{http_code}\n" http://localhost:3001/api/me   # 401 = up
[ -n "$SB_INTERNAL_SECRET" ] && echo "secret OK"
```

## 1. 대상 분석

- 인자로 받은 diff/브랜치/PR/커밋 범위를 `git -C "$CHAOS_DIR"`(또는 대상 레포)에서 분석:
  `git show <sha>`, `git diff <base>..<head>`, `git log --oneline`. 주변 코드를 넓게 탐색.
- **메타 자동 감지**: `repo`(`basename $(git rev-parse --show-toplevel)` 또는 remote), `base_sha`/`head_sha`(`git rev-parse`), `branch`(`git branch --show-current`), `pr_url`(있으면). 인자로 명시돼 있으면 그것을 우선.

## 2. 본문 집필 (`body_md`)

4개 섹션을 Martin Kleppmann 문체(명료·매끄러움)로 마크다운 작성:

- **Background**: 변경과 관련된 기존 시스템. 초보자용 깊은 배경(건너뛰기 안내) + 변경 직결 배경. 주변 코드를 넓게 탐색해 근거.
- **Intuition**: 핵심 직관을 토이 예시 데이터로. 세부보다 본질.
- **Code**: 변경을 이해하기 좋은 순서로 그룹핑한 하이레벨 워크스루. 파일 경로는 백틱, diff 는 ` ```diff ` 펜스로 `+`/`-` 살림.
- **Quiz**: 변경을 진짜 이해했는지 확인하는 5문제(중난이도, 함정 아님).

> [!NOTE] chaos 마크다운 렌더러 제약
> chaos 의 `mdToHtml` 은 헤딩·리스트·blockquote·표·펜스드 코드블록을 지원하지만 **인터랙티브 JS 는 없다.**
> 퀴즈는 **정적 마크다운**으로: 각 문항 아래에 보기와 정답·해설을 그대로 쓴다(정답을 `> [!answer]` blockquote 나 "정답:" 로 표기). HTML 변형의 클릭 채점은 여기선 불가.

## 3. 다이어그램 (Excalidraw)

- 재사용할 소수의 다이어그램 패밀리(시스템/데이터흐름도 등)를 골라 **`excalidraw-diagram` 스킬**로 `.excalidraw` 씬 파일을 만든다. 노드/메시지에 **예시 데이터**를 넣는다.
- 각 씬은 chaos 의 `diffs.diagrams[]` 에 `{ title, scene }` 로 담긴다(scene = `.excalidraw` JSON 객체). chaos 가 의존성 0 뷰어(`DiagramRender` 의 `ExcalidrawView`)로 렌더 + 휠 줌/드래그 팬 한다.
- 스크래치패드에 `diagram1.excalidraw`, `diagram2.excalidraw` … 로 저장.

## 4. 등록 — 두 경로

### 경로 A (우선): Chaos MCP `create_diff` 툴

이 세션에 **Chaos MCP 가 연결돼 있으면**(POST /chaos/mcp, Bearer 토큰) `create_diff` 툴을 그대로 호출한다 — 토큰 인증이라 시크릿·telegramId 불필요. 인자: `{ title, body_md, summary?, repo?, base_sha?, head_sha?, branch?, pr_url?, diagrams:[{title, scene}] }`. **각 `scene` 은 `.excalidraw` 씬의 JSON 문자열**(MCP 스키마상 객체가 아니라 문자열 — Zod strip 회피). (읽기 `list_diffs`/`get_diff`, 수정 `update_diff`(무중복 편집·부분갱신), 삭제 `delete_diff`.) 이게 `explain-diff-chaos` 스킬과 **동일 역할의 MCP 툴**이다.

### 경로 B (폴백): REST `POST /api/diffs` (loopback)

MCP 가 없을 때. **인증(반드시 loopback)**: chaos `CaptureGuard` 신뢰채널 = ①`x-forwarded-for` 헤더 없음 ②loopback 소켓 ③`x-internal-secret === SB_INTERNAL_SECRET`, 그리고 body 에 `telegramId` 필수. → `http://localhost:3001` 로 직접, `x-internal-secret` 헤더 + body `telegramId`.

payload 는 본문·씬이 크고 특수문자가 많으니 **파일로 쓰고 `jq` 로 조립**한다(셸 이스케이프 회피):

```bash
# body.md = 2단계 본문, diagram1.excalidraw = 3단계 씬 (스크래치패드에 저장돼 있다고 가정)
jq -n \
  --arg tid  "$SB_OWNER_TELEGRAM_ID" \
  --arg title "리트라이 로직에 지수 백오프 도입" \
  --rawfile body body.md \
  --arg repo "chaos" --arg base "$BASE_SHA" --arg head "$HEAD_SHA" \
  --arg branch "$BRANCH" --arg pr "$PR_URL" \
  --slurpfile d1 diagram1.excalidraw \
  '{ telegramId:$tid, title:$title, body_md:$body, repo:$repo,
     base_sha:$base, head_sha:$head, branch:$branch, pr_url:$pr,
     diagrams:[ { title:"재시도 흐름", scene:$d1[0] } ] }' > payload.json

curl -s -X POST http://localhost:3001/api/diffs \
  -H "content-type: application/json" \
  -H "x-internal-secret: $SB_INTERNAL_SECRET" \
  --data @payload.json
# → { "ok": true, "id": "df_...", "slug": "..." }
```

- 씬이 여러 개면 `--slurpfile d2 diagram2.excalidraw` 를 추가하고 `diagrams` 배열에 `{title, scene:$d2[0]}` 를 더 넣는다.
- `pr_url`/`branch` 가 없으면 해당 `--arg` 를 빈 문자열로(서버가 빈값→NULL 처리).

## 5. 확인 & 보고

- 응답 `{id, slug}` 로 인앱 딥링크를 안내: **`/chaos/diffs`** (웹 '개발' 탭). 특정 해설은 앱에서 카드 클릭.
- Mermaid 없이 **Excalidraw 뷰어**로 그림이 뜨는지, 퀴즈/코드블록이 정상 렌더되는지 확인 요청.

## API 계약 (chaos `apps/api/src/diffs/diffs.controller.ts`)

| 메서드·경로 | 설명 |
|-------------|------|
| `POST /api/diffs` | 생성. body: `{ telegramId, title, body_md, summary?, repo?, base_sha?, head_sha?, branch?, pr_url?, diagrams?:[{title,scene}], slug? }` → `{ok,id,slug}` |
| `GET /api/diffs` | 내 목록 → `{diffs:[...]}` |
| `GET /api/diffs/:id` | 단건(id 또는 slug) → `{ok,diff}` |
| `PATCH /api/diffs/:id` | 수정(부분) + `telegramId` |
| `DELETE /api/diffs/:id` | 삭제 |

모든 라우트 `@Public() @UseGuards(CaptureGuard)` — 세션(SPA) ∥ 신뢰채널+telegramId(이 스킬). 공개 읽기 엔드포인트 없음(비공개).
