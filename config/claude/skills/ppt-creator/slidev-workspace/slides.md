---
theme: seriph
colorSchema: dark
transition: slide-left
title: Claude Code 확장 시스템
info: |
  Skill · Hook · Sub-agent
  Claude Code를 내 것으로 만드는 세 가지 핵심 개념
highlighter: shiki
lineNumbers: false
routerMode: hash
---

# Claude Code 확장 시스템

**Skill · Hook · Sub-agent**

Claude Code를 내 것으로 만드는 세 가지 핵심 개념

<div class="pt-12">
  <span class="px-2 py-1 rounded bg-white bg-opacity-10">
    발표자: 김종환 · 2026
  </span>
</div>

---
layout: section
---

# 왜 확장이 필요한가?

---

# Claude Code의 한계

Claude Code는 강력하지만, 기본 상태에서는 **범용 AI**입니다

<v-clicks>

- 우리 팀의 특수한 워크플로우를 모른다
- 반복적인 작업을 매번 다시 설명해야 한다
- 여러 복잡한 작업을 병렬로 처리하기 어렵다
- 특정 이벤트에 자동으로 반응하지 않는다

</v-clicks>

<v-click>

<div class="mt-8 p-4 rounded border" style="background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.4)">
  💡 <strong>해결책</strong>: Skill, Hook, Sub-agent로 Claude Code를 <strong>팀 맞춤형 AI</strong>로 확장
</div>

</v-click>

---

# 세 가지 확장 축

::left::

## 🧠 Skill
> "이걸 어떻게 하는지 알려줄게"

특정 작업의 **전문 지식**을 캡슐화

- 언제 사용할지 (description)
- 어떻게 실행할지 (SKILL.md 절차)
- 어떤 도구가 필요한지 (references)

::right::

## 🪝 Hook
> "이 이벤트가 발생하면 자동으로 해"

Claude의 **행동에 개입**하는 트리거

- 도구 호출 전/후에 실행
- 규칙 강제 적용
- 자동화 워크플로우

<br/>

## 🤖 Sub-agent
> "이 작업은 네가 알아서 해"

복잡한 작업을 **독립 실행** 위임

- 병렬 처리 / 장시간 작업 / 전문화된 역할

---
layout: section
---

# 🧠 Skill

---

# Skill이란?

특정 작업을 수행하는 방법을 담은 **전문 지식 패키지**

마치 신입 직원에게 업무 매뉴얼을 건네주는 것과 같다

```
skills/
└── my-skill/
    ├── SKILL.md       ← 핵심: 언제, 어떻게 사용하는지
    └── references/    ← 참고 자료 (API 문서, 패턴 등)
```

<v-click>

**SKILL.md 기본 구조:**

```markdown
---
name: my-skill
description: "언제 이 스킬을 사용하는지 명확하게 (AI가 읽음)
  Use when: (1) ... NOT for: ..."
---

# My Skill

## 워크플로우
1. 첫 번째 단계
2. 두 번째 단계
```

</v-click>

---

# Skill — Claude가 선택하는 과정

<v-clicks>

**1. 사용자 요청 수신**
```
"GitHub PR 리뷰해줘"
```

**2. available_skills 목록에서 description 비교**
```
github: "Use when: creating PRs, reviewing issues, checking CI..."  ← 매칭!
weather: "Use when: user asks about weather..."
obsidian: "Use when: working with Obsidian vault..."
```

**3. 가장 관련성 높은 스킬 선택 후 SKILL.md 읽기**

**4. 절차대로 실행**

</v-clicks>

<v-click>

> 💡 **핵심**: description이 정확하고 구체적일수록 Claude가 올바르게 스킬을 선택한다

</v-click>

---

# Skill 설계 원칙

::left::

### ✅ 좋은 스킬

```markdown
description: "Use when: (1) creating PRs,
  (2) reviewing issues,
  (3) checking CI status.
  NOT for: bulk operations across
  many repos."
```

- 언제 쓰는지 명확
- NOT for 조건 명시
- 단계별 절차 구체적
- 엣지 케이스 포함

::right::

### ❌ 나쁜 스킬

```markdown
description: "GitHub 관련 작업을
  처리합니다"
```

- 너무 광범위한 description
- 절차 없이 개념만 설명
- 중복되는 스킬 여러 개

<br/>

### 💡 팁

- 하나의 스킬 = 하나의 역할
- 실패 경험을 스킬로 문서화
- ClawHub에서 공개 스킬 활용

---
layout: section
---

# 🪝 Hook

---

# Hook이란?

Claude Code의 **특정 이벤트에 자동으로 반응**하는 셸 명령

```
사용자 요청
    ↓
Claude가 도구 호출 결정
    ↓
[PreToolUse Hook] ← 여기서 개입 가능 (검증, 차단)
    ↓
도구 실행
    ↓
[PostToolUse Hook] ← 여기서 개입 가능 (후처리, 알림)
    ↓
Claude에게 결과 전달
```

---

# Hook 종류

| Hook | 실행 시점 | 주요 용도 |
|------|-----------|-----------|
| `PreToolUse` | 도구 호출 **직전** | 검증, 차단, 로깅 |
| `PostToolUse` | 도구 호출 **직후** | 결과 가공, 알림 |
| `Notification` | Claude가 알림 발송 시 | 외부 시스템 연동 |
| `Stop` | Claude가 작업 완료 시 | 후처리, 보고서 생성 |
| `SubagentStop` | 서브에이전트 완료 시 | 결과 수집 |

---

# Hook 설정 방법

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "check-dangerous-cmd.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "npx prettier --write $FILE"
          }
        ]
      }
    ]
  }
}
```

---

# Hook 실전 활용

<v-clicks>

**1. 코드 품질 자동화**
```bash
# Write 도구 후 자동 포맷팅
PostToolUse(Write) → prettier --write $FILE && eslint --fix $FILE
```

**2. 위험 명령어 차단**
```bash
# Bash 실행 전 rm -rf 검사
PreToolUse(Bash) → grep -q "rm -rf" && exit 1 || exit 0
```

**3. 작업 완료 알림**
```bash
# 작업 끝나면 Telegram 알림
Stop → curl -X POST $WEBHOOK -d '{"text": "작업 완료!"}'
```

**4. 자동 git add**
```bash
PostToolUse(Write) → git add $FILE
```

</v-clicks>

---

# Hook 종료 코드의 의미

::left::

## `exit 0` — 정상
Claude 계속 진행

## `exit 1` — 차단
도구 실행 중단, Claude에게 오류 전달

## `stdout` — 피드백
출력 내용을 Claude가 읽고 참고

::right::

```bash
#!/bin/bash
# PreToolUse 예시
# 프로덕션 DB 접근 차단

if echo "$TOOL_INPUT" | grep -q "production"; then
  echo "🚨 프로덕션 DB 접근이 감지됐습니다."
  echo "승인이 필요합니다."
  exit 1  # Claude 작업 중단
fi

exit 0  # 정상 통과
```

---
layout: section
---

# 🤖 Sub-agent

---

# Sub-agent란?

**Claude가 Claude를 실행**하는 것

메인 Claude가 복잡한 작업을 독립된 Claude 인스턴스에게 위임

```
메인 Claude (오케스트레이터)
    ├── Sub-agent 1: "PR #101 리뷰해줘"      ← 병렬 실행
    ├── Sub-agent 2: "테스트 코드 작성해줘"   ← 병렬 실행
    └── Sub-agent 3: "문서 업데이트해줘"      ← 병렬 실행
              ↓
    결과 수집 후 종합
```

<v-click>

**핵심 특징:**
- 완전히 격리된 컨텍스트 (메인 컨텍스트 오염 없음)
- 병렬 실행 가능 → 처리 속도 대폭 향상
- 완료 후 결과만 메인에게 전달

</v-click>

---

# Sub-agent 활용 패턴

<v-clicks>

**패턴 1: 병렬 코드 리뷰**
```
메인 Claude
  → Sub-agent A: "보안 취약점 검사"    ┐
  → Sub-agent B: "성능 이슈 분석"      ├ 동시 실행
  → Sub-agent C: "코드 스타일 체크"    ┘
  ← 결과 수집 후 종합 리포트
```

**패턴 2: 장시간 작업 위임**
```
메인 Claude: "레포 전체 마이그레이션은 Sub-agent에게 맡길게"
  → Sub-agent: 독립적으로 파일 순회, 수정, 테스트 실행
  ← 완료 후 결과만 보고
```

**패턴 3: 역할 분리**
```
메인 Claude: 설계 및 조율
  → Sub-agent 1 (Backend): API 구현
  → Sub-agent 2 (Frontend): UI 구현
```

</v-clicks>

---
layout: section
---

# 세 가지를 함께 쓰면

---

# 실전 시나리오: 자동 PR 처리

::left::

**1. 🪝 Hook (트리거)**

PR 생성 이벤트 감지

```bash
# PostToolUse(Bash)
# gh pr create 명령 감지 →
# 다음 단계 자동 시작
```

**2. 🧠 Skill (전문성)**

github 스킬 로드

- PR 리뷰 절차 파악
- gh CLI 명령어 활용

::right::

**3. 🤖 Sub-agent (병렬 처리)**

```
메인 Claude (조율)
  → Agent A: 코드 리뷰
  → Agent B: 테스트 실행
  → Agent C: 문서 확인
  ↓
결과 수집 → PR 코멘트 작성
```

<br/>

> ✨ **Hook이 감지 → Skill이 방법을 알고 → Sub-agent가 병렬 처리**

---

# 언제 무엇을 쓸까?

::left::

### 🧠 Skill 사용
- 반복되는 절차가 있을 때
- 특정 도구/API 사용법이 복잡할 때
- 팀 규칙/컨벤션을 강제할 때

### 🪝 Hook 사용
- 특정 이벤트에 자동 반응이 필요할 때
- 위험한 행동을 차단해야 할 때
- 코드 품질 자동화, 완료 후 알림

::right::

### 🤖 Sub-agent 사용
- 작업이 크고 복잡할 때
- 병렬 처리로 속도를 높이고 싶을 때
- 메인 컨텍스트를 깨끗하게 유지할 때

<br/>

| | Skill | Hook | Sub-agent |
|---|---|---|---|
| **역할** | 전문 지식 | 자동 개입 | 작업 위임 |
| **형태** | SKILL.md | settings.json | 독립 Claude |
| **효과** | 일관성 ↑ | 자동화 ↑ | 처리량 ↑ |

---
layout: end
---

# Q&A

감사합니다 🙏
