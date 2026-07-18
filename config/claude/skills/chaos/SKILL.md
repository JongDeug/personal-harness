---
name: chaos
description: Chaos 세컨드브레인에 지식을 적재·검수·조회할 때. "기록해줘 / 카오스에 넣어줘 / 개념 찾아줘 / 뭐 적었더라" 류 요청, 또는 Chaos MCP(POST /chaos/mcp) 툴을 쓸 때. 캡처 전 기존 개념 재사용 프로토콜을 강제한다.
---

# Chaos 사용 스킬

종환님의 개인 세컨드브레인 Chaos 에 지식을 넣고 꺼내는 워크플로. **Chaos MCP 가 연결돼 있어야** 툴(`capture`·`find_concepts`·`search_atoms` 등)을 쓸 수 있다.
공식 문서(전체): 리포 `docs/chaos-usage.md`.

## 모델 한 줄

`atom`(기록) ──evidence(pending→검수 accept)──▶ `concept`(id=hash(name), 같은 이름=같은 개념) ──중심성≥5──▶ `hub`(자동 표면화). 개념 생성은 **입력 즉시**(배치 없음), 개념 추출은 **에이전트 몫**.

## ★ 캡처 프로토콜 (이 순서 그대로)

1. **중복 확인** — `search_atoms(q)`. 이미 있으면 새로 넣지 말고 `update_atom` 으로 보강.
2. **개념 추출** — 이 기록이 '무엇에 대한'지 핵심 개념(고유명사·기술용어·주제)을 뽑는다.
3. **★기존 개념 재사용** — 개념마다 `find_concepts(q)` 로 조회. 있으면 **그 이름 그대로** 쓴다(‘인공지능’ 뽑았어도 기존 ‘AI’ 있으면 ‘AI’). ← 파편화 방지의 핵심.
4. **적재** — `capture({ atoms:[{ title, body, kind, concepts:[{name, quote}] }] })`.
   - `title` 필수, `body`=원문 전체(record/reference 필수), `concepts`=개념+뒷받침 원문구절(quote).
   - 실행할 일은 별도 `kind:action` atom(title 만). 외부 자료는 `kind:reference`+`url` (+핵심은 `kind:record` 추가).
5. evidence 는 **pending** 으로 생김 → 종환님이 프로젝트에서 검수(accept)하면 허브로 표면화.

## 원자 작성 원칙

- 지식·생각은 **잘게 쪼개지 마라.** 한 메모 = atom 1개(title=대표 1~2줄, body=원문 보존). 실행할 일만 action 으로 분리.
- `body` 는 마크다운. 읽기 좋은 줄글 위주, `##`·목록 남발 금지. 코드·경로·CLI 는 백틱/코드블록. 원문 단어·뉘앙스 보존, 구조만 입힘.

## 조회

- 기록 검색 → `search_atoms(q, date_from, date_to)` · 주제 → `list_themes` · 개념/허브 → `list_concepts(surfaced)`
- 개념 재사용 조회 → `find_concepts(q)` · 개념 상세 → `get_concept(id)` · 할일 → `list_actions(status)` · 주간/회상 → `insights(range)`
- 운동/식단/습관/독서/캘린더 → 각 도메인 툴.

## 검수·정리

- `review_queue` 로 대기분 → `review_evidence(atomId, decision)` accept/reject · 개념 정리 `review_concept(id,…)`.

## 하지 말 것

- ❌ `find_concepts` 없이 새 이름 남발(파편화). ❌ 포인트로 잘게 쪼개기. ❌ 없는 기록 지어내기(없으면 "없다"). ❌ 계층/폴더 만들기(개념은 평면). ❌ 임의 삭제(명시 확인 후만).
