---
name: explain-diff-chaos
description: Use when the user asks for a rich explanation of a code change, diff, branch, or PR AND wants it saved into the chaos second-brain as a private "개발(Dev)" entry. Thin trigger — the real capability (authoring methodology + storage) lives in the Chaos MCP. 트리거는 `/explain-diff-chaos`, "카오스에 이 변경 해설 올려줘", "이 PR 개발 해설로 정리해줘".
---

# Explain Diff → Chaos (개발 해설) — 얇은 트리거

> [!IMPORTANT] 이 스킬은 트리거일 뿐. 능력은 Chaos MCP 에 있다.
> - **집필 방법론(SSOT)** = MCP 프롬프트 **`explain_diff_guide`** — 4섹션 구조(Background·Intuition·Code·Quiz) + draw.io 스타일 excalidraw 다이어그램 스펙 + scene 규칙.
> - **저장/조회/수정/삭제** = MCP 툴 `create_diff` / `list_diffs` / `get_diff` / `update_diff` / `delete_diff`.
> 스킬은 (1) 대상을 분석하고 (2) 위 프롬프트를 읽어 집필하고 (3) 툴로 등록할 뿐이다.

## 절차

1. **대상 분석**: 인자의 diff/PR/브랜치/커밋을 `git show`/`git diff`, 또는 `gh pr view`/`gh pr diff`(다른 레포면 gh) 로 분석. 주변 코드를 넓게 본다. `repo`·`base_sha`·`head_sha`·`branch`·`pr_url` 을 채운다.
2. **방법론 가져와 집필**: Chaos MCP 의 **`explain_diff_guide` 프롬프트**를 읽어 그 지침대로 `body_md`(4섹션 마크다운)와 다이어그램을 만든다.
   - 다이어그램은 **`excalidraw-diagram` 스킬을 실제로 호출**해 draw.io 스타일 씬을 만든다(파이썬 손레이아웃 금지 — 과거 "가독성 없다" 지적의 원인).
   - 각 `scene` 은 `.excalidraw` JSON 을 **문자열**로.
3. **등록**: `create_diff({ title, body_md, summary?, repo?, base_sha?, head_sha?, branch?, pr_url?, diagrams:[{title, scene}] })`. 수정은 `update_diff`(무중복).
4. **확인**: 응답 `{id, slug}` → 인앱 **'개발' 탭(`/chaos/diffs`)** 안내. Excalidraw 뷰어 줌/팬·인터랙티브 퀴즈 확인 요청.

## Chaos MCP 접속 (세션에 안 떠 있을 때 폴백)

이 세션에 `chaos` MCP 툴이 안 보이면(전역 등록이라도 세션 시작 시 연결 실패 가능), 세션에서 **`/mcp` 재연결**하거나, 프로덕션 MCP 를 **토큰으로 직접 호출**한다:

- 엔드포인트: `POST https://jongdeug.duckdns.org/chaos/mcp`, 헤더 `Authorization: Bearer <토큰>` + `Accept: application/json, text/event-stream`. 토큰은 `~/.claude.json` 의 `mcpServers.chaos.headers.Authorization` 에 있다.
- 방법론: `{"jsonrpc":"2.0","id":1,"method":"prompts/get","params":{"name":"explain_diff_guide"}}`
- 등록: `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_diff","arguments":{ … }}}`
- 응답이 SSE 면 `data:` 라인의 JSON 을 파싱, `result.content[0].text` 가 실제 결과.

## 비공개

diffs 는 오너 전용(공개 발행·URL·RSS 없음)이지만 오너의 인앱 스트림·시맨틱 검색엔 자동 편입된다(개념 미생성 — 운동·식단 패턴). PII/사내정보 과도노출은 스스로 판단해 피한다.

---
SSOT: chaos `docs/explain-diff-feature.md` · 방법론 원본은 MCP `explain_diff_guide` 프롬프트(`apps/api/src/mcp-server.ts`).
