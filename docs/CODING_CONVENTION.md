# Coding Convention

이 문서는 조직 전체에 적용되는 코딩 컨벤션을 정의한다.
프로젝트별 `CLAUDE.md`에서 오버라이드할 수 있으며, 명시되지 않은 항목은 이 문서를 따른다.

## 목적

- 일관된 코딩 스타일로 협업 효율성 및 코드 가독성 향상
- 다양한 프로젝트에서의 유지보수 용이성 확보
- 리뷰 속도 단축 및 코드 품질 향상

## 1. Naming Convention

| 요소 | 형식 | 규칙 | 예시 |
|------|------|------|------|
| 파일명 | **프레임워크 규칙 우선** | 아래 프레임워크별 파일명 규칙 참조 | - |
| 클래스명 | `PascalCase` | 명사형, 객체/역할의 실체를 표현 | `UserController`, `HttpClient` |
| 함수명 | `camelCase` | 동사 + 목적어(명사) 패턴 | `getUserData()`, `sendEmail()` |
| 변수명 | `camelCase` | 의미 있는 명사형, 줄임말 지양 | `userId`, `isActive`, `emailAddress` |
| 전역 상수 | `UPPER_SNAKE_CASE` | 변하지 않는 고정 값 | `DEFAULT_TIMEOUT_MS`, `MAX_RETRY_COUNT` |

### 상세 규칙

- 클래스명은 역할/객체를 명사로 표현: `CustomerService`, `DbConnector`
- 함수명은 동사 + 명사 패턴 권장: `fetchUser()`, `updatePassword()`, `sendNotification()`
- 변수명은 줄임말 최소화: `usrId` (X) → `userId` (O), `res` (X) → `response` (O)
- 상수명은 환경, 설정, 시간, 키 이름 등 변경되지 않는 값에 사용: `API_KEY`, `SESSION_EXPIRY_MS`
- 문자열 값은 작은따옴표(`'`) 사용: `method: 'POST'`, `response.data.code !== '0'`

### 프레임워크별 파일명 규칙

각 프레임워크의 공식/관례적 파일명 규칙을 우선으로 따른다.

| 프레임워크 | 파일명 형식 | 예시 |
|------------|------------|------|
| **NestJS** | `kebab-case` + 역할 접미사 | `auth.controller.ts`, `user.service.ts`, `create-user.dto.ts` |
| **Next.js / React** | 컴포넌트: `PascalCase`, 그 외: `camelCase` 또는 `kebab-case` | `UserProfile.tsx`, `useAuth.ts`, `api-client.ts` |
| **Flutter** | `snake_case` | `user_profile.dart`, `auth_service.dart` |
| **FastAPI / Python** | `snake_case` | `user_router.py`, `auth_service.py` |
| **Go** | `snake_case` | `user_handler.go`, `auth_middleware.go` |

프레임워크 규칙이 명확하지 않은 경우 `camelCase`를 기본값으로 사용한다.

## 2. 들여쓰기 & 줄 길이

| 항목 | 규칙 |
|------|------|
| 들여쓰기 | 2 spaces (JS/TS/HTML/CSS/YAML/Dart), 4 spaces (Python/Go) |
| 줄 길이 제한 | 최대 150자. 필요 시 줄바꿈 처리 |

## 3. 테스트 코드 컨벤션

- 테스트 파일은 `*.test.ts` (또는 프레임워크 관례) 형식 사용
- **Given-When-Then** 주석 패턴 권장

```typescript
// Given
const validId = '123';

// When
const result = await getUser(validId);

// Then
expect(result).toHaveProperty('name');
```

## 4. 주석 규칙

### 함수 주석 (JSDoc)

```typescript
/**
 * 사용자 정보를 가져옵니다.
 *
 * @param userId {string} 사용자 고유 ID
 * @returns {Promise<User>} 사용자 객체
 * @throws {Error} 사용자 정보가 없거나 조회 실패 시
 */
async function getUser(userId: string): Promise<User> { ... }
```

### 인라인 주석

핵심 로직 위에 한 줄 주석 권장:

```typescript
// 사용자 상태 확인
if (user.status === 'active') { ... }
```

### 블록 주석

```typescript
/*
 * 이 함수는 외부 API 연동을 수행하며,
 * 에러 발생 시 자동 재시도 로직을 포함합니다.
 */
```

## 5. 죽은 코드 제거

- 사용하지 않는 함수, 변수, import는 반드시 삭제
- `// TODO` 또는 `// FIXME` 주석은 추후 제거 대상으로 관리

## 6. Lint & Formatter

- **ESLint + Prettier** 조합 필수 (JS/TS 프로젝트)
- 커밋 전 lint 실행, 규칙에 맞지 않는 문법 수정
- PR 전 lint, test, build를 반드시 통과

## 7. HTTP Method 규칙

RESTful API 설계를 지향하며, HTTP Status Code도 명확히 사용한다.

| Method | 목적 |
|--------|------|
| `GET` | 데이터 조회 |
| `POST` | 리소스 생성 |
| `PUT` | 전체 리소스 대체 (idempotent) |
| `PATCH` | 리소스 일부 수정 |
| `DELETE` | 리소스 삭제 |
