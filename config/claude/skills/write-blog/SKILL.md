---
name: write-blog
description: jongdeug.log 블로그 글 작성 오케스트레이션. 메인 세션이 직접 planner·image-maker·diagrammer·writer·editor 5명의 sub-agent 를 조율해 초안을 만든다. 트리거는 `/write-blog`, "블로그 써줘", "블로그 글 작성", "블로그 초안". 단순히 "블로그" 만 언급된 경우는 **작성인지 배포인지 사용자에게 되물은 뒤** 분기한다 (배포는 blog-deploy 스킬 소관).
---

Base directory for this skill: /Users/jongdeug/.claude/skills/write-blog

# write-blog — 블로그 작성 오케스트레이션 (메인 세션 주도)

이 스킬은 **메인 세션이 직접** 5명의 팀원을 1단 sub-agent 로 순차·병렬 호출해 블로그 글 한 편을 완성한다. 과거에는 `blog-writer` 를 2차 sidechain 에서 팀 오케스트레이터로 썼지만, nested sidechain 에서 `Agent`/`AskUserQuestion` 호출이 불안정해 팀원 스폰이 실제로 일어나지 않던 문제 때문에 **메인 세션 주도 구조로 롤백**했다.

구조 요약:

```
메인 세션 (이 스킬)
├── Agent(blog-planner)           # 1단
├── AskUserQuestion                # 메인에서 아웃라인 승인
├── Agent(blog-image-maker)   ┐   # 1단, 병렬
├── Agent(blog-diagrammer)    ┘   # 1단, 병렬
├── Agent(blog-writer)             # 1단 — 본문 집필 전담
└── Agent(blog-editor)             # 1단 — 검수
```

모든 Agent 호출은 **메인 세션에서 직접** 한다. 각 sub-agent 는 서로를 부르지 않는다.

## 트리거 구분

- **이 스킬(write-blog) 트리거:** `/write-blog`, "블로그 써줘", "블로그 글 작성", "블로그 초안"
- **blog-deploy 스킬 트리거:** `/blog`, "블로그 빌드", "블로그 배포"
- 사용자가 단순히 "블로그" 만 언급하면 둘 중 어느 쪽인지 물어본 뒤 분기. 이 스킬을 먼저 트리거하지 말 것.

## 플로우

### 1. 경로 해석

```bash
BLOG_VAULT_PATH=$(bash ~/.claude/scripts/resolve-blog-vault.sh)
```

- exit 0 → stdout 의 절대경로를 `BLOG_VAULT_PATH` 로 사용.
- exit 1 → stderr 메시지를 사용자에게 그대로 전달하고 **중단**. 폴백 금지.
- `attachments_search_roots` 기본값: `${BLOG_VAULT_PATH%/Resource/blog}/Archive/plugin/attached-file` 한 디렉토리. 존재 검증 후 다음 단계로.

### 2. 기획 — blog-planner 호출

```
Agent(subagent_type="blog-planner",
      prompt="topic, memo, BLOG_VAULT_PATH 를 포함한 한 편의 프롬프트")
```

반환 JSON 을 `outline_json` 으로 보관.

### 3. 아웃라인 승인 — AskUserQuestion (메인 세션에서)

사용자에게 **요약만** 보여 준다. 전체 JSON 을 펼치지 말 것.

```
Title: <title>
Category: <category>
Tags: [<tags>]
섹션: ## ..., ## ..., ## ...
이미지 슬롯 N개 / 다이어그램 슬롯 M개
```

`AskUserQuestion` 선택지: "이대로 진행" / "수정 필요".

- "수정 필요" 이면 사용자 지시를 받아 planner 재호출 또는 `outline_json` 을 메인에서 국소 수정(큰 변경은 planner 재호출 권장).

### 4. 이미지·다이어그램 — 병렬 호출

승인된 `outline_json` 기준으로 **한 응답 안에 두 Agent 호출을 묶어 병렬 스폰**:

- `image_slots[]` 가 비어 있지 않으면:
  ```
  Agent(subagent_type="blog-image-maker",
        prompt="image_slots[], attachments_search_roots, BLOG_VAULT_PATH 포함")
  ```
- `diagram_slots[]` 가 비어 있지 않으면:
  ```
  Agent(subagent_type="blog-diagrammer",
        prompt="diagram_slots[], 카테고리/제목 맥락, reference_diagram_files=['${BLOG_VAULT_PATH}/AI/My Pi Stack.md'] 포함")
  ```

슬롯이 없는 쪽은 호출 생략하고 `{"slots": []}` 로 대체해 다음 단계에 넘긴다. 둘 다 없으면 단계 통째로 건너뜀.

### 5. draft_path 계산 + 본문 집필 — blog-writer 호출

먼저 메인 세션이 버전 번호를 **실제로 확정**한다:

```
Glob("~/.claude/drafts/blog/<slug>-v*.md")
```

- 기존 최대 버전이 `K` 면 `draft_path = ~/.claude/drafts/blog/<slug>-v{K+1}.md`.
- 없으면 `v1`. planner 의 `draft_version_hint` 는 참고만.

그 다음:

```
Agent(subagent_type="blog-writer",
      prompt="topic, memo, outline_json 전문, image_result, diagram_result, BLOG_VAULT_PATH, draft_path")
```

blog-writer 는 본문을 쓰고 `Write` 로 drafts 에 저장한 뒤 JSON 을 반환한다. 덮어쓰기 금지 — 메인이 이미 버전 계산을 마친 새 경로를 넘긴 상태다.

### 6. 검수 — blog-editor 호출

```
Agent(subagent_type="blog-editor",
      prompt="draft_path, outline_json 전문")
```

- editor 는 파일을 직접 Read/Edit 한다. 반환은 JSON 리포트.
- 리포트의 `passed` 가 false 거나 `issues_remaining` 에 `severity: critical` 이 있으면 **수정 루프를 자동으로 돌리지 말고 사용자에게 그대로 보고**.
- `placeholder` 잔여가 잡히면 원인에 따라 image-maker 또는 diagrammer 를 재호출해 보강한 뒤, blog-writer 를 `v(N+1)` 로 다시 호출 → editor 재검수.

### 7. 보고

사용자에게 짧게:

- `draft_path` 와 `editor_report.note`
- `pending_user_actions` 가 있으면 목록화 (blog-writer 의 `pending_notes` + image-maker 의 `needs_user_input: true` 항목 + screenshot 요청 문구)
- `passed: false` 면 문제를 요약하고 수정 방향을 물음 (자동 재작업 금지)

### 8. 배치 (사용자 승인 시)

사용자가 "배치해 줘" / "올려" 승인하면 vault 로 이동:

```
${BLOG_VAULT_PATH}/<category>/<title>.md
```

- 파일명은 title 그대로 (공백·한글 유지). 기존 동명 파일이 있으면 덮어쓰지 말고 사용자에게 확인.
- 승인 없이 바로 옮기지 말 것.

### 9. 배포 안내 (선택)

배치까지 끝나면 "blog-deploy 스킬로 빌드·배포하시겠습니까?" 한 줄로 안내만. 실행은 사용자가 결정.

---

## 초안 저장 규약

- 덮어쓰기 금지. 수정 요청 시 `v번호 + 1` 로 새 파일.
- 버전 번호는 **메인 세션이 5단계 직전** `Glob` 으로 재검증해 확정한 뒤 blog-writer 에 `draft_path` 로 넘긴다.
- 텔레그램 보고 형식이 이미 존재하면 기존 패턴 따름 (경로 + 주요 포인트 3~5줄).

## 참조

- 에이전트 정의:
  - `~/.claude/agents/blog-planner.md`
  - `~/.claude/agents/blog-image-maker.md`
  - `~/.claude/agents/blog-diagrammer.md`
  - `~/.claude/agents/blog-writer.md`
  - `~/.claude/agents/blog-editor.md`
- 경로 해석 스크립트: `~/.claude/scripts/resolve-blog-vault.sh`
- 블로그 빌드/배포: `blog-deploy` 스킬 (`sudo node build.js`)
- 톤 참고 (blog-writer 가 직접 Read): `${BLOG_VAULT_PATH}/회고/개발자 첫 회고.md`, `${BLOG_VAULT_PATH}/트러블슈팅/*.md`, `${BLOG_VAULT_PATH}/AI/My Pi Stack.md`
