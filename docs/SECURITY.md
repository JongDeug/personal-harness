# Security Guide

보안 가이드라인. 모든 프로젝트에 적용.

## 인증 & 인가

- JWT 기반 인증 (access token + refresh token)
- Access token 만료: 15분~1시간
- Refresh token 만료: 7일~30일, rotate on use
- 비밀번호 해싱: bcrypt (cost factor >= 10)
- 소셜 로그인: OAuth 2.0 / OIDC

## 입력 검증

- **모든 사용자 입력은 신뢰하지 않는다**
- 서버 사이드 검증 필수 (클라이언트 검증은 UX용)
- SQL injection: ORM/Prepared Statement 사용
- XSS: 출력 시 이스케이프, CSP 헤더 설정
- CSRF: SameSite 쿠키 + CSRF 토큰

## 시크릿 관리

- `.env` 파일은 `.gitignore`에 반드시 포함
- 프로덕션 시크릿: 환경 변수 또는 시크릿 매니저
- API 키: 최소 권한 원칙으로 발급
- 시크릿 로테이션: 분기별

## 의존성 보안

- `npm audit` / `pip audit` 정기 실행
- Dependabot 또는 Renovate로 자동 업데이트
- Critical 취약점: 48시간 이내 패치

## HTTPS

- 모든 프로덕션 통신은 HTTPS
- HSTS 헤더 설정
- 내부 API 간 통신도 TLS 사용

## 데이터 보호

- 개인정보: 수집 최소화, 암호화 저장
- 로그에 민감 정보 포함 금지
- 데이터 삭제 요청 대응 가능한 구조
