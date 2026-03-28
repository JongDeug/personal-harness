# AGENTS.md

이 문서는 AI 에이전트(Claude 등)가 이 조직의 프로젝트에서 작업할 때 따라야 할 규칙과 컨텍스트를 정의한다.

## 조직 개요

- 1인 개인 조직. 모든 프로젝트는 본인 + AI 에이전트가 협업하는 구조
- 주요 도메인: 모바일 앱(iOS/Android) + 웹 서비스
- 이 repo는 조직 전체에 적용되는 표준, 설계 문서, 실행 계획을 관리한다

## 코드 컨벤션

상세 컨벤션은 [`docs/CODING_CONVENTION.md`](docs/CODING_CONVENTION.md)를 참조한다.

### 요약

- 변수/함수명: `camelCase` (JS/TS/Dart/Go), `snake_case` (Python)
- 클래스/타입명: `PascalCase`
- 상수: `UPPER_SNAKE_CASE`
- 파일명: **프레임워크별 규칙 우선** (NestJS: `auth.controller.ts`, React: `UserProfile.tsx`, Flutter: `user_profile.dart` 등)
- 들여쓰기: 2 spaces (JS/TS/HTML/CSS/YAML/Dart), 4 spaces (Python/Go)
- 최대 줄 길이: 150자
- 문자열: 작은따옴표(`'`) 사용
- 테스트: Given-When-Then 주석 패턴
- Lint: ESLint + Prettier 필수

### 커밋 메시지

[Conventional Commits](https://www.conventionalcommits.org/) 형식을 따른다.

```
<type>(<scope>): <subject>

<body>
```

- type: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`, `perf`
- scope: 선택사항. 변경 영역 (e.g. `auth`, `api`, `ui`)
- subject: 명령형, 소문자 시작, 마침표 없음
- body: 선택사항. "왜" 이 변경이 필요한지 설명

### 브랜치 전략

git-flow 기반. 상세 절차는 `claude/skills/git-flow/SKILL.md` 참조.

- `main` — 프로덕션
- `develop` — 개발 통합
- `feat/{issue-key}` — 기능 개발
- `rc/{version}` — 릴리스 후보
- `fix/{issue-key}-{N}` — RC 중 버그 수정
- `hotfix/{version}` — 긴급 수정

### PR 규칙

- PR 제목은 커밋 메시지 형식과 동일
- 모든 PR은 최소 self-review 후 머지
- CI 통과 필수

## AI 에이전트 작업 규칙

### 원칙

1. **코드를 읽기 전에 수정하지 않는다** — 항상 기존 코드를 먼저 파악
2. **최소 변경 원칙** — 요청된 것만 변경, 불필요한 리팩토링 금지
3. **안전 우선** — 되돌리기 어려운 작업(force push, delete 등)은 반드시 확인
4. **문서 참조** — 작업 전 관련 docs/ 문서가 있는지 확인
5. **사이드이펙트 검수 필수** — 코드 수정 후 반드시 영향 범위를 분석하고 결과를 보고한다 (아래 상세 절차 참조)

### 필수 스킬 사용 규약

아래 스킬은 해당 상황에서 **반드시** 사용한다. 스킬 상세는 각 `SKILL.md`를 참조.

| 스킬 | 경로 | 사용 시점 |
|------|------|-----------|
| `/git-flow` | `config/skills/git-flow/SKILL.md` | 브랜치 생성, PR, 배포, 핫픽스 등 **모든 Git 플로우 작업** 시. 직접 git 명령을 실행하지 말고 반드시 스킬의 커맨드(`/feat`, `/finish-feat`, `/start-rc`, `/rc-fix`, `/revert-issue`, `/release`, `/hotfix`, `/finish-hotfix`)를 통해 진행 |
| `/write-tests` | `config/skills/write-tests/SKILL.md` | **신규 기능 구현 또는 기존 코드 수정** 후 반드시 테스트 코드를 작성. 테스트 없이 PR을 올리지 않는다 |

### 사이드이펙트 검수 절차

코드를 수정한 뒤, 커밋 또는 PR 생성 **전에** 반드시 아래 검수를 수행한다.

#### 1. 영향 범위 분석

- 변경된 함수/클래스/모듈을 **참조(import, 호출)하는 모든 곳**을 추적한다
- 해당 참조부에서 기존 동작이 깨지지 않는지 확인한다

#### 2. 타입·인터페이스 변경 시 호출부 전수 검사

- 함수 시그니처, DTO, 인터페이스, 타입 등이 변경되었으면 **모든 호출부/구현부**를 찾아 일관성을 확인한다
- 컴파일 에러가 발생하는 곳이 없는지 검증한다

#### 3. 삭제·이름 변경 시 참조 누락 체크

- 함수, 변수, 파일, export 등을 삭제하거나 이름을 변경했으면 **import/export/참조가 끊어지는 곳**이 없는지 확인한다
- 사용되지 않는 import가 남아 있으면 정리한다

#### 4. 변경 요약 리포트 출력

수정 완료 후 아래 형식으로 사이드이펙트 검수 결과를 **사용자에게 보고**한다:

```
## 사이드이펙트 검수 결과

**변경 파일**: (수정한 파일 목록)

**영향받는 파일/함수**:
- `파일:함수명` — 확인 결과 (이상 없음 / 수정 필요 → 조치 내용)

**검수 항목**:
- [ ] 참조부 동작 확인
- [ ] 타입/시그니처 일관성 확인
- [ ] 삭제/이름 변경 참조 누락 없음
- [ ] 미사용 import 정리

**결론**: 이상 없음 / 추가 조치 필요
```

**작업 흐름 예시:**

1. `/feat {issue-key}` → feature 브랜치 생성
2. 기능 구현 또는 코드 수정
3. **사이드이펙트 검수** → 영향 범위 분석 및 리포트 출력
4. `/write-tests` → 변경 사항에 대한 테스트 작성 및 통과 확인
5. `/finish-feat {issue-key}` → push + PR 생성

### 프로젝트별 컨텍스트

각 프로젝트 repo에 `CLAUDE.md`가 있으면 그것을 우선으로 따른다. 이 문서는 조직 수준의 기본값이다.

### 문서 구조 참조

| 문서 | 용도 |
|------|------|
| `ARCHITECTURE.md` | 기술 아키텍처 개요 |
| `docs/CODING_CONVENTION.md` | 코딩 컨벤션 상세 |
| `docs/DESIGN.md` | 디자인 시스템 가이드 |
| `docs/FRONTEND.md` | 프론트엔드 개발 가이드 |
| `docs/SECURITY.md` | 보안 가이드라인 |
| `docs/RELIABILITY.md` | 안정성/모니터링 가이드 |
| `docs/QUALITY_SCORE.md` | 코드 품질 기준 |
| `docs/PRODUCT_SENSE.md` | 제품 판단 기준 |
| `docs/PLANS.md` | 실행 계획 작성 가이드 |
| `docs/design-docs/` | 설계 문서 모음 |
| `docs/exec-plans/` | 실행 계획 모음 |
| `docs/product-specs/` | 제품 스펙 모음 |
| `docs/references/` | 외부 레퍼런스 모음 |
| `docs/generated/` | 자동 생성 문서 |
| `config/skills/git-flow/SKILL.md` | Git 배포 플로우 스킬 |
| `config/skills/write-tests/SKILL.md` | 테스트 코드 작성 스킬 |

## 기술 스택 (기본값)

프로젝트별로 다를 수 있으나, 조직 기본값은 다음과 같다:

- **웹 프론트엔드**: React / Next.js + TypeScript
- **모바일**: Flutter / React Native (프로젝트별 선택)
- **백엔드**: Node.js (NestJS) 또는 Python (FastAPI)
- **DB**: PostgreSQL (기본), Redis (캐시)
- **인프라**: Docker, CI/CD (GitHub Actions)
- **패키지 매니저**: pnpm (JS/TS), uv (Python)
