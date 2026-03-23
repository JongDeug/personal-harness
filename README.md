# personal-harness

개인 조직의 개발 표준, 설계 문서, 설정 파일을 관리하는 저장소.

## 구조

```
.
├── AGENTS.md                    # AI 에이전트 협업 규칙 & 코드 컨벤션
├── ARCHITECTURE.md              # 기술 아키텍처 개요
├── docs/
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
│   ├── references/              # 외부 레퍼런스 (LLM 컨텍스트용)
│   │   ├── design-system-reference-llms.txt
│   │   ├── nixpacks-llms.txt
│   │   └── uv-llms.txt
│   ├── DESIGN.md                # 디자인 시스템 가이드
│   ├── FRONTEND.md              # 프론트엔드 개발 가이드
│   ├── PLANS.md                 # 실행 계획 작성 가이드
│   ├── PRODUCT_SENSE.md         # 제품 판단 기준
│   ├── QUALITY_SCORE.md         # 코드 품질 기준
│   ├── RELIABILITY.md           # 안정성/모니터링 가이드
│   └── SECURITY.md              # 보안 가이드라인
├── aerospace/                   # AeroSpace 윈도우 매니저 설정
├── tmux/                        # tmux 설정
├── vscode/                      # VS Code 설정
└── claude/
    └── skills/
        └── git-flow/            # Git 배포 플로우 자동화 스킬
```

## 사용법

### 조직 가이드

각 프로젝트 repo에서 이 repo의 문서를 참조한다. 프로젝트별 `CLAUDE.md`에서 이 repo의 `AGENTS.md`를 기본값으로 삼고, 프로젝트 특화 규칙을 추가한다.

### 설정 파일

각 설정 파일은 해당 도구의 설정 경로에 심링크하여 사용한다.

### Claude 스킬

`claude/skills/` 하위의 스킬은 Claude Code에서 자동으로 인식된다.
