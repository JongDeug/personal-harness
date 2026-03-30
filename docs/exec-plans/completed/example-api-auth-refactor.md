# API 인증 미들웨어 JWT 전환

- 상태: Completed
- 시작일: 2025-07-10
- 완료일: 2025-07-15

## 목표

세션 기반 인증을 JWT(access + refresh token) 방식으로 전환하여 모바일/웹 통합 인증 구조를 확보한다.

## 배경

- 모바일 앱 출시로 세션 쿠키 기반 인증이 한계에 도달
- 모바일과 웹에서 동일한 API를 사용하려면 stateless 인증이 필요
- 컴플라이언스 요구사항으로 토큰 저장 방식 변경 필요

## 실행 단계

- [x] Step 1: JWT 모듈 설계 (access token 15분, refresh token 7일)
- [x] Step 2: auth.guard.ts 교체 — 세션 체크 → JWT 검증
- [x] Step 3: refresh token rotation 엔드포인트 추가 (`POST /auth/refresh`)
- [x] Step 4: 기존 세션 미들웨어 제거, 관련 테스트 업데이트
- [x] Step 5: 모바일/웹 클라이언트에서 통합 테스트
- [x] Step 6: 기존 세션 데이터 마이그레이션 (active 세션 → refresh token 발급)

## 리스크 & 롤백 계획

- **리스크**: 마이그레이션 중 기존 로그인 세션이 끊길 수 있음
- **롤백**: 세션 미들웨어를 feature flag로 유지하고, JWT 실패 시 세션 fallback (1주간)
- **실제 결과**: 마이그레이션 스크립트로 기존 세션 100% 전환 완료, fallback 미사용

## 완료 조건

- [x] 모든 API 엔드포인트가 JWT로 인증
- [x] refresh token rotation 정상 동작
- [x] 기존 세션 관련 코드 완전 제거
- [x] 모바일/웹 통합 테스트 통과
