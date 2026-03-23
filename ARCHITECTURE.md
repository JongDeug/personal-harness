# ARCHITECTURE.md

조직 프로젝트들의 공통 아키텍처 패턴과 기술적 의사결정을 기록한다.

## 시스템 개요

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Mobile App  │────▶│             │────▶│  Database    │
│ (Flutter/RN) │     │   Backend   │     │ (PostgreSQL) │
└─────────────┘     │   (API)     │     └─────────────┘
                    │             │     ┌─────────────┐
┌─────────────┐     │             │────▶│    Cache     │
│   Web App    │────▶│             │     │   (Redis)   │
│ (Next.js)    │     └─────────────┘     └─────────────┘
└─────────────┘
```

## 아키텍처 원칙

1. **단순함 우선** — 필요할 때만 복잡도를 추가한다. 1인 조직에서 과도한 추상화는 부채다.
2. **모노레포 vs 멀티레포** — 프로젝트 규모에 따라 결정. 소규모면 모노레포 선호.
3. **API First** — 모바일과 웹이 공존하므로 API 설계를 먼저 확정한다.
4. **타입 안전성** — TypeScript, Dart 등 타입 시스템을 적극 활용한다.

## 계층 구조 (백엔드)

```
src/
├── modules/          # 도메인별 모듈
│   ├── auth/
│   │   ├── controller
│   │   ├── service
│   │   ├── repository
│   │   └── dto
│   └── user/
├── common/           # 공통 유틸, 미들웨어, 가드
├── config/           # 환경 설정
└── main.ts
```

- **Controller** — 요청/응답 처리, 유효성 검증
- **Service** — 비즈니스 로직
- **Repository** — 데이터 접근 계층
- **DTO** — 데이터 전송 객체, 입출력 스키마 정의

## 계층 구조 (프론트엔드)

```
src/
├── app/              # 라우팅, 페이지
├── components/       # 재사용 가능 컴포넌트
│   ├── ui/           # 기본 UI 컴포넌트
│   └── features/     # 도메인별 컴포넌트
├── hooks/            # 커스텀 훅
├── lib/              # 유틸리티, API 클라이언트
├── stores/           # 상태 관리
└── types/            # 타입 정의
```

## 데이터베이스 규칙

- 테이블명: `snake_case`, 복수형 (e.g. `users`, `order_items`)
- PK: `id` (UUID 또는 auto-increment, 프로젝트별 결정)
- 타임스탬프: `created_at`, `updated_at` 필수
- 소프트 삭제: `deleted_at` nullable 컬럼 사용 (필요 시)
- 마이그레이션: 항상 up/down 양방향 작성

## API 설계 규칙

- RESTful 기본, 복잡한 조회는 GraphQL 고려
- 버저닝: URL path (`/api/v1/`)
- 응답 형식: JSON
- 에러 응답: `{ "error": { "code": "...", "message": "..." } }`
- 인증: JWT (access + refresh token)
- 페이지네이션: cursor-based 선호

## 인프라

- 컨테이너화: Docker + docker-compose (로컬 개발)
- CI/CD: GitHub Actions
- 배포: 프로젝트별 결정 (Vercel, Railway, AWS 등)
- 환경 변수: `.env` 파일 기반, 민감 정보는 시크릿 매니저 사용

## ADR (Architecture Decision Records)

중요한 기술적 의사결정은 `docs/design-docs/`에 기록한다.
