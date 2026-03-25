# personal-harness

개인 조직의 개발 표준, 설계 문서, 설정 파일을 관리하는 저장소.

## 구조

```
.
├── AGENTS.md                    # AI 에이전트 협업 규칙 & 코드 컨벤션
├── ARCHITECTURE.md              # 기술 아키텍처 개요
├── docs/
│   ├── CODING_CONVENTION.md     # 코딩 컨벤션 상세
│   ├── DESIGN.md                # 디자인 시스템 가이드
│   ├── FRONTEND.md              # 프론트엔드 개발 가이드
│   ├── PLANS.md                 # 실행 계획 작성 가이드
│   ├── PRODUCT_SENSE.md         # 제품 판단 기준
│   ├── QUALITY_SCORE.md         # 코드 품질 기준
│   ├── RELIABILITY.md           # 안정성/모니터링 가이드
│   ├── SECURITY.md              # 보안 가이드라인
│   ├── design-docs/             # 설계 문서
│   │   ├── index.md
│   │   └── core-beliefs.md
│   ├── exec-plans/              # 실행 계획
│   │   ├── active/
│   │   ├── completed/
│   │   └── tech-debt-tracker.md
│   ├── generated/               # 자동 생성 문서
│   │   └── db-schema.md
│   ├── product-specs/           # 제품 스펙
│   │   ├── index.md
│   │   └── new-user-onboarding.md
│   └── references/              # 외부 레퍼런스 (LLM 컨텍스트용)
│       ├── design-system-reference-llms.txt
│       ├── nixpacks-llms.txt
│       └── uv-llms.txt
├── config/
│   ├── aerospace/               # AeroSpace 윈도우 매니저 설정
│   ├── tmux/                    # tmux 설정
│   ├── vscode/                  # VS Code 설정
│   └── skills/                  # Claude Code 스킬 (로컬용)
│       ├── git-flow/
│       ├── obsidian/
│       ├── write-tests/
│       └── test-deploy/
└── plugins/                     # Claude Code 마켓플레이스 배포용
    ├── git-flow/
    ├── obsidian/
    ├── test-deploy/
    └── write-tests/
```

## 사용법

### 조직 가이드

각 프로젝트 repo에서 이 repo의 문서를 참조한다. 프로젝트별 `CLAUDE.md`에서 이 repo의 `AGENTS.md`를 기본값으로 삼고, 프로젝트 특화 규칙을 추가한다.

### 설정 파일

`config/` 하위의 설정 파일들을 해당 도구의 설정 경로에 심링크하여 사용한다.

### Claude 스킬 (로컬)

`config/skills/`를 `~/.claude/skills`에 심링크하여 사용한다.

```bash
ln -s /path/to/personal-harness/config/skills ~/.claude/skills
```

### Claude 스킬 (마켓플레이스 설치)

이 repo를 마켓플레이스로 등록하면 개별 스킬을 선택하여 설치할 수 있다.

```bash
# 1. 마켓플레이스 등록
claude plugin marketplace add https://github.com/JongDeug/personal-harness

# 2. 원하는 스킬만 골라서 설치
claude plugin install git-flow@personal-harness
claude plugin install obsidian@personal-harness
claude plugin install test-deploy@personal-harness
claude plugin install write-tests@personal-harness
```

| 플러그인 | 트리거 | 설명 |
|----------|--------|------|
| **git-flow** | `/feat`, `/finish-feat`, `/start-rc`, `/release`, `/hotfix` 등 | Git Flow 배포 플로우 자동화 |
| **obsidian** | `/obsidian` 또는 "옵시디언", "노트", "데일리" 등 | Obsidian vault CLI 관리 (macOS/Windows/WSL) |
| **test-deploy** | `/test-deploy` 또는 "테스트 결과 메일로 보내줘" 등 | 테스트 커버리지 결과 이메일 발송 |
| **write-tests** | `/write-tests` 또는 "테스트 작성" 등 | NestJS/TypeScript/Go 테스트 코드 작성 |

> `test-deploy` 사용 시 `.env`에 Gmail 앱 비밀번호 설정 필요 (`GMAIL_USER`, `GMAIL_APP_PASSWORD`)
> `obsidian` 사용 시 Obsidian 데스크탑 앱의 CLI 기능이 활성화되어 있어야 함
