---
name: write-girls
description: jongdeug.log 블로그용 보조 블로깅 팀(코드네임 girls)을 Agent Teams 로 운영한다. 메인 세션이 team lead 겸 planner 가 되어 outline 을 직접 확정하고, `girls` 타입 teammate 4명(image / diagram / writer / editor role)을 스폰해 공유 task list 와 mailbox 로 협업시킨다. 트리거는 오직 `/write-girls`. 드래프트는 `~/.claude/drafts/girls/` 로 분리되고 vault 의 `girls/` 카테고리에 배치되어 기존 blog-deploy 파이프라인으로 빌드된다.
---

Base directory for this skill: /Users/jongdeug/.claude/skills/write-girls

# write-girls — Agent Teams 기반 보조 블로깅 팀 (메인 세션이 lead + planner)

이 스킬은 `write-blog` (subagent 기반) 와 **평행한 별도 팀** 이다. girls 팀은 **Agent Teams (실험적)** 위에서 돌아간다. 메인 세션이 team lead 이자 planner 역할을 겸하며, 4명의 teammate 가 각자 독립된 Claude Code 세션에서 image / diagram / writer / editor 중 한 role 을 담당한다.

트레이드오프: 토큰 비용이 증가한다. 다만 teammate 끼리 mailbox 로 직접 대화하고 task list 를 공유하므로, image/diagram teammate 의 결과가 writer 에게 빠르게 전달되고 lead 가 중계 단계에서 일을 가로채지 않아도 된다. Planner 를 lead 가 겸하므로 teammate 1명 분량의 오버헤드와 outline 확정 왕복 message 를 절감한다.

## 트리거 구분

- **이 스킬(write-girls):** `/write-girls` **전용**. 자연어로 자동 추론하지 않는다.
- **write-blog:** `/write-blog`, "블로그 써줘", "블로그 글 작성", "블로그 초안" — girls 팀 관여 X.
- **blog-deploy:** `/blog`, "블로그 빌드", "블로그 배포" — 배포는 girls 카테고리도 같이 빌드됨.

"블로그" 만 단독 언급된 경우 write-blog / blog-deploy 중 어느 쪽인지 되묻는다. 이 스킬은 먼저 트리거하지 말 것.

## 아키텍처

```
메인 세션 (lead + planner)
├── teammate[image]      (girls, role: image)
├── teammate[diagram]    (girls, role: diagram)
├── teammate[writer]     (girls, role: writer)
└── teammate[editor]     (girls, role: editor)

Shared Task List
├─ T1 image slots                 [assigned: image]
├─ T2 diagram slots               [assigned: diagram]
├─ T3 draft       (deps T1, T2)   [assigned: writer]
└─ T4 editorial   (deps T3)       [assigned: editor]
```

- teammate 타입은 모두 **`girls`** 로 동일. 역할 분화는 **spawn prompt 의 `role:` 줄**로 한다.
- outline 확정은 lead(메인 세션) 가 직접 한다. teammate 에게 위임하지 않는다.
- teammate 간 직접 메시지 허용. 예: image/diagram 이 writer 에게 결과 전달.
- 사용자 승인 게이트(outline 확정, vault 배치)는 lead 가 직접 `AskUserQuestion` 으로 처리.
- 최종 vault 이동과 cleanup 은 lead 전담.

## 사전 전제

이 스킬은 다음이 모두 충족된 환경에서만 돌아간다. 하나라도 빠지면 **진행 중단** 하고 사용자에게 그대로 보고.

1. `claude --version` ≥ 2.1.32
2. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` (env 또는 settings.json)
3. `~/.claude/agents/girls.md` 존재
4. tmux 설치 (split-pane 기본; `teammateMode: in-process` 로 바꾸면 tmux 없이도 가능)

## 플로우

### 0. 사전 전제 체크

```bash
claude --version
echo "$CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"
test -f ~/.claude/agents/girls.md && echo "girls agent OK"
which tmux || echo "tmux missing (in-process 모드로 전환 필요)"
```

env var 가 셸에서 비어 보여도 settings.json 에 있으면 claude 런타임이 로드한다. 사용자가 "테스트로 뜨는지 보고 싶다" 하면 `claude --teammate-mode in-process` 로 일회 실행 유도.

### 1. 경로 해석

```bash
BLOG_VAULT_PATH=$(bash ~/.claude/scripts/resolve-blog-vault.sh)
```

- 실패 시 stderr 를 그대로 사용자에게 보고하고 중단.
- `attachments_search_roots` 기본값: `${BLOG_VAULT_PATH%/Resource/blog}/Archive/plugin/attached-file` 한 디렉토리. 존재 검증.

### 2. topic / memo 수집

사용자가 트리거 시점에 주제·메모를 주지 않았으면 먼저 물어본다. 필요한 값:

- **topic** (필수) — 한 줄 요지
- **memo** (optional) — 참고 링크, 커밋 해시, 파일 경로, 맥락 메모
- 기타 힌트(카테고리/태그/톤 요청)는 있으면 outline 에 반영, 없으면 lead 재량

### 3. Outline 확정 — lead 직접 작성

팀 스폰보다 **먼저** lead 가 outline 을 확정한다. outline 이 image/diagram slot 을 결정하므로, 이게 없으면 teammate 에게 줄 일이 없다.

#### 3.1 참고 글 Read (voice·포맷 일관성)

- `${BLOG_VAULT_PATH}/girls/` Glob 으로 기존 글 후보 확인.
- 없으면 아래 중 하나를 Read:
  - `${BLOG_VAULT_PATH}/AI/My Pi Stack.md`
  - `${BLOG_VAULT_PATH}/회고/*.md`
  - `${BLOG_VAULT_PATH}/트러블슈팅/*.md`

#### 3.2 근거 검증 (기술 글 한정)

prompt 에 포함된 커밋·파일·노트 경로를 Read/Grep 으로 **실제로 확인**. 상상으로 채우지 말 것. 근거는 `outline.summary` 에 `근거: <파일:라인>` 로 메모.

#### 3.3 Slug 계산

- 제목 → 소문자, 공백/특수문자 `-`, 한글 유지.
- `~/.claude/drafts/girls/<slug>-v*.md` 존재 여부 Glob 으로 검사. (drafts 경로 확정용 — 최종 버전 산정은 9단계에서 재검증)

#### 3.4 카테고리

**카테고리는 항상 `girls` 고정.** 다른 값 금지.

#### 3.5 Outline JSON 구성

Lead 는 아래 스키마를 그대로 채운 `outline_json` 을 메모리에 들고 있는다. 대안 여러개 만들지 말고 확정본 하나만.

```json
{
  "title": "글 제목",
  "slug": "글-제목",
  "category": "girls",
  "date": "YYYY-MM-DD",
  "tags": ["태그1", "태그2"],
  "description": "한 줄 요약 (RSS/SEO용, 90자 이내)",
  "outline": [
    {
      "heading": "## 섹션 제목",
      "summary": "핵심 1~2줄 요약 (근거 있으면 경로 표시)",
      "needs_image": false,
      "needs_diagram": false
    }
  ],
  "image_slots": [
    {
      "id": "pi-rack",
      "caption": "라즈베리파이 랙 사진",
      "source": "reuse|screenshot|create",
      "section_heading": "## 섹션 제목"
    }
  ],
  "diagram_slots": [
    {
      "id": "pi-arch",
      "purpose": "Pi 위에 올라간 서비스 관계도",
      "suggested_style": "boxes with arrows",
      "section_heading": "## 섹션 제목"
    }
  ],
  "draft_version_hint": 1,
  "reference_posts_read": ["${BLOG_VAULT_PATH}/girls/기존글.md"]
}
```

### 4. 아웃라인 승인 — AskUserQuestion

사용자에게 **요약만** 보여 준다. JSON 펼치지 말 것.

```
Title: <title>
Category: girls
Tags: [<tags>]
섹션: ## ..., ## ..., ## ...
이미지 슬롯 N개 / 다이어그램 슬롯 M개
```

선택지: "이대로 진행" / "수정 필요".

- "수정 필요" 이면 사용자 지시를 받아 lead 가 직접 outline_json 을 재작성 → 다시 승인 루프.

### 5. 팀 생성 — 4 teammate 스폰

아웃라인 승인 후 팀을 만든다. 모두 `girls` 타입 재사용 (`~/.claude/agents/girls.md`).

각 teammate 에게 넘기는 **공통 인자**:
- `BLOG_VAULT_PATH={절대경로}`
- `attachments_search_roots=[...]` (image teammate 에 특히 필요)
- `team_name=girls-<slug-or-date>` (lead 가 결정, 후속 단계에서 재사용)

**role 별 추가 인자** (spawn 시 또는 직후 첫 message):
- image: `outline_json.image_slots[]` + `attachments_search_roots`
- diagram: `outline_json.diagram_slots[]` + `reference_diagram_files=[${BLOG_VAULT_PATH}/AI/My Pi Stack.md]` + `title`/`category`
- writer: T1/T2 결과 수집 후 outline_json + image_result + diagram_result + draft_path 전달
- editor: T3 완료 후 draft_path + outline_json 전달

**image_slots[] / diagram_slots[] 가 비어 있으면** 해당 teammate(image 또는 diagram)는 스폰하지 않는다. lead 가 빈 결과(`{"slots": []}`)를 writer 에게 직접 넘긴다.

**스폰 이름 관례**: `image`, `diagram`, `writer`, `editor` — 이후 메시지에서 이 이름으로 호출. 예측 가능하게 lead 가 명시적으로 지정.

**모델**: teammate 정의의 `model: opus` 가 그대로 적용됨. 필요 시 spawn 시 `--model sonnet` 로 특정 teammate 만 경량화 가능(토큰 절감용).

**display mode**: 기본 `auto`. 사용자가 tmux 안에서 claude 를 띄웠다면 split-pane, 아니면 in-process. 특별히 요청 없으면 그대로 둔다.

### 6. 태스크 정의 (shared task list)

Lead 가 4 태스크를 생성, 의존성 세팅, 각 teammate 에게 직접 assign.

| ID | subject | owner | blockedBy |
|----|---------|-------|-----------|
| T1 | image_slots 해결 | image | - |
| T2 | diagram_slots 구현 | diagram | - |
| T3 | 본문 작성 → drafts 저장 | writer | T1, T2 |
| T4 | 최종 검수 | editor | T3 |

- 슬롯이 비어서 image 또는 diagram teammate 를 스폰하지 않은 경우, 해당 태스크는 **생성하지 않는다**. 그 결과 T3 의 blockedBy 에서도 빠진다.
- task description 에 각 role 의 입력 인자를 **전부 박아둔다**. teammate 가 task 를 claim 하면 description 이 바로 지침이 됨.

### 7. T1 / T2 병렬 — image / diagram

승인된 `outline_json` 에서:
- `image_slots[]` 가 있으면 image teammate 에게 message 로 slot 배열 + attachments_search_roots 전달 → T1 claim 해서 진행.
- `diagram_slots[]` 가 있으면 diagram teammate 에게 message 로 slot 배열 + reference_diagram_files 전달 → T2 claim.

두 task 는 상호 독립이라 병렬 진행. 둘 다 완료되면 lead 는 `image_result`, `diagram_result` 를 보관.

빈 슬롯이면 해당 task 를 생성하지 않고 빈 결과를 바로 writer 에게 넘겨 T3 를 unblock.

### 8. draft_path 계산 (lead 전담)

Lead 가 직접 Glob 으로 버전 재검증:

```
Glob("~/.claude/drafts/girls/<slug>-v*.md")
```

- 기존 최대 버전 K → `draft_path = ~/.claude/drafts/girls/<slug>-v{K+1}.md`.
- 없으면 `v1`. outline_json 의 `draft_version_hint` 는 참고만.
- writer 는 이 경로를 그대로 사용 (재계산 금지).

### 9. T3 수행 — writer

Lead 는 writer teammate 에게 다음을 message 로 전달:
- `topic`
- `memo`
- `outline_json` 전문
- `image_result` / `diagram_result`
- `BLOG_VAULT_PATH`
- `draft_path` (8단계 산출)

writer 가 본문을 쓰고 `Write` 로 drafts 에 저장 후 완료 JSON 을 lead 에게 message.

### 10. T4 수행 — editor

Lead 는 editor teammate 에게 `draft_path` + `outline_json` 전달. editor 는 파일을 직접 Read/Edit 하고 JSON 리포트를 message 로 반환.

- `passed: false` 또는 `issues_remaining` 에 `critical` 이 있으면 **자동 재작업 금지**. 사용자에게 그대로 보고.
- `placeholder` 잔여면 원인 파악 후 image/diagram teammate 재작업 요청 → writer 에게 v(N+1) 로 재집필 message → editor 재검수.

### 11. 보고

사용자에게 짧게:

- `draft_path` 와 `editor_report.note`
- `pending_user_actions` 목록:
  - writer 의 `pending_notes`
  - image teammate 의 `needs_user_input: true` 항목
  - screenshot 요청 문구
- `passed: false` 면 문제 요약 + 수정 방향 질문(자동 재작업 금지).

### 12. 배치 (사용자 승인 시)

"배치해 줘" / "올려" 승인 받으면 lead 가 vault 로 이동:

```
${BLOG_VAULT_PATH}/girls/<title>.md
```

- 카테고리 `girls` 고정, 경로 한 레벨.
- 파일명은 title 그대로(공백·한글 유지). 기존 동명 파일 있으면 덮어쓰지 말고 확인.
- 승인 없이 바로 옮기지 말 것.

### 13. 팀 cleanup

배치 끝나거나 사용자가 "그만" 하면 lead 가 팀을 정리한다.

1. 각 teammate(최대 4명) 에게 shutdown 요청 (팀원이 "현재 작업 완료 후 종료" 응답).
2. 전원 종료 확인 후 team cleanup 실행.
3. 실패 시 orphan tmux 세션 확인: `tmux ls` → `tmux kill-session -t <name>`.

**cleanup 은 반드시 lead 가** 한다. teammate 가 cleanup 실행하면 리소스 불일치 가능.

### 14. 배포 안내 (선택)

배치까지 끝나면 "blog-deploy 스킬로 빌드·배포하시겠습니까?" 한 줄 안내. girls 카테고리도 기존 파이프라인이 자동 렌더. 실행은 사용자 결정.

---

## 초안 저장 규약

- 덮어쓰기 금지. 수정 시 `v번호+1` 로 새 파일.
- 버전 번호는 **lead 가 8단계에서** `Glob` 으로 재검증 후 확정 → writer 에게 `draft_path` 전달.
- 드래프트 경로는 항상 `~/.claude/drafts/girls/` 이하. write-blog 드래프트와 섞지 않음.
- 텔레그램 보고 형식이 있으면 기존 패턴 따름 (경로 + 주요 포인트 3~5줄).

## Agent Teams 운영 팁

- **기다리기** — lead 가 teammate 결과를 기다리지 않고 스스로 작업 시작하는 경향이 있다. 필요하면 "Wait for your teammates to complete their tasks before proceeding" 명시.
- **세션 resume 제약** — `/resume`, `/rewind` 는 in-process teammate 를 복원하지 못한다. 재개 시 lead 에게 "팀원 새로 스폰" 지시.
- **orphan tmux** — 종료가 깔끔하지 않으면 `tmux ls` → `tmux kill-session -t <name>` 수동 정리.
- **permission** — teammate 는 lead 의 권한 모드를 상속. 민감 동작 전엔 사용자 확인.
- **1 세션 1 팀** — lead 는 한 번에 한 팀만 관리. 기존 팀 cleanup 후 새 팀.

## 참조

- 공용 teammate 정의: `~/.claude/agents/girls.md` (4 role 통합)
- 경로 해석 스크립트: `~/.claude/scripts/resolve-blog-vault.sh` (write-blog 와 공용)
- 블로그 빌드/배포: `blog-deploy` 스킬 — girls 카테고리도 같이 렌더
- 톤 참고 (lead 의 outline 작성 / writer 가 직접 Read): `${BLOG_VAULT_PATH}/회고/개발자 첫 회고.md`, `${BLOG_VAULT_PATH}/트러블슈팅/*.md`, `${BLOG_VAULT_PATH}/AI/My Pi Stack.md`
- Agent Teams 공식 문서: https://code.claude.com/docs/en/agent-teams
