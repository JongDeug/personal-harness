# Frontend Guide

프론트엔드(웹 + 모바일) 개발 가이드라인.

## 웹 (React / Next.js)

### 프로젝트 구조

```
src/
├── app/              # App Router 페이지
├── components/
│   ├── ui/           # shadcn/ui 등 기본 컴포넌트
│   └── features/     # 도메인별 컴포넌트
├── hooks/            # 커스텀 훅
├── lib/              # 유틸리티, API 클라이언트
├── stores/           # 상태 관리 (Zustand 등)
└── types/            # 공유 타입
```

### 규칙

- **Server Components 우선** — 클라이언트 상태가 필요한 경우에만 `'use client'`
- **데이터 페칭** — Server Components에서 직접, 또는 React Query 사용
- **스타일링** — Tailwind CSS 기본. CSS Modules는 복잡한 애니메이션에만
- **폼** — React Hook Form + Zod 유효성 검증
- **상태 관리** — 서버 상태는 React Query, 클라이언트 상태는 Zustand

### 성능

- Core Web Vitals 기준 충족 (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- 이미지: `next/image` 사용
- 번들 크기: 정기적으로 `@next/bundle-analyzer`로 확인

## 모바일 (Flutter / React Native)

### 공통 규칙

- 네이티브 느낌 우선: 플랫폼별 UI 패턴 존중
- 오프라인 지원: 핵심 기능은 오프라인에서도 동작
- 딥링크: 모든 주요 화면은 딥링크로 접근 가능

### 상태 관리

- Flutter: Riverpod 또는 BLoC
- React Native: React Query + Zustand

### 테스트

- 위젯/컴포넌트 테스트: 핵심 UI 인터랙션
- 통합 테스트: 주요 사용자 플로우
- E2E: 릴리스 전 주요 시나리오 (Detox / Integration Test)
