---
name: write-tests
description: >
  NestJS/TypeScript 프로젝트에서 Jest + jest-mock-extended 기반 테스트 코드를 작성할 때 반드시 사용하는 스킬.
  mock<T>(), mockDeep<T>()를 활용하여 타입 안전한 mock 객체를 생성하고, Happy Path / Edge Case / Error Handling 3종 케이스를 포함한 테스트를 작성한다.
  아래 상황 중 하나라도 해당되면 반드시 이 스킬을 사용한다.
  - /write-tests 명령어 입력
  - 신규 함수/모듈/서비스 구현 후 테스트 코드 작성
  - 기존 코드 수정 후 테스트 추가
  - "테스트 작성", "테스트 코드", "unit test", "테스트 추가", "spec 파일" 등의 키워드 포함 요청
  - PR 준비 전 테스트 코드 점검
---

## 실행 절차

`/write-tests` 호출 또는 테스트 작성 요청 시 아래 순서로 진행한다.

1. **대상 파일 읽기**: 테스트 대상 함수/모듈의 코드를 먼저 읽고 파악
2. **테스트 디렉토리 확인**: 프로젝트 루트에 `tests/` 폴더가 없으면 생성한다
3. **기존 테스트 확인**: `tests/` 폴더 안에 대응하는 테스트 파일이 있는지 확인
   - 있으면: 기존 테스트 구조를 따르고 누락된 케이스만 추가
   - 없으면: 아래 템플릿에 따라 새로 작성
4. **테스트 파일 위치**: 소스 파일의 경로 구조를 `tests/` 아래에 그대로 미러링한다
   - 예) `src/modules/channels/core/id-adapter.util.ts` → `tests/modules/channels/core/id-adapter.util.spec.ts`
   - 예) `src/common/utils/language-detector.util.ts` → `tests/common/utils/language-detector.util.spec.ts`
5. **테스트 작성**: 정책(3종 케이스, Mock 규칙)에 따라 **하나씩** 작성
6. **테스트 실행**: 작성 후 실행하여 통과 확인

---

## 테스트 작성 정책

---

### 1. 작성 의무

- **신규 함수/모듈**: Unit Test 필수
- **기존 코드 수정**: 변경된 로직에 대한 테스트 추가. 기존 테스트가 없으면 신규 작성
- 테스트 없이 PR을 올릴 경우 PR 본문에 명확한 사유 기재 필요

---

### 2. 커버리지 목표

| 대상 | 목표 |
|------|------|
| 일반 코드 | 70% 이상 |
| 핵심 비즈니스 로직 | 90% 이상 |

---

### 3. 테스트 케이스 3종 구성

모든 테스트는 아래 세 가지 케이스를 포함한다.

1. **Happy Path** — 정상 입력과 예상 흐름
2. **Edge Case** — 경계값, 빈 값, null, undefined, 최대값 등
3. **Error Handling** — 예외 발생, 외부 API 실패, 유효성 검사 실패

---

### 4. Mock 도구: jest-mock-extended

모든 mock은 `jest-mock-extended`를 사용하여 생성한다. 수동으로 `jest.fn()`을 나열하지 않는다.

#### 핵심 API

| API | 용도 |
|-----|------|
| `mock<T>()` | 얕은(1단계) mock 생성. 일반 서비스에 사용 |
| `mockDeep<T>()` | 깊은(중첩) mock 생성. Prisma처럼 `prisma.user.findFirst()`같은 체이닝 객체에 사용 |
| `mockReset()` | mock 상태 초기화. `beforeEach`에서 사용 |
| `calledWithFn()` | 특정 인자에 대해서만 반환값 지정 |

#### 타입

| 타입 | 설명 |
|------|------|
| `MockProxy<T>` | `mock<T>()`의 반환 타입 |
| `DeepMockProxy<T>` | `mockDeep<T>()`의 반환 타입 |

---

### 5. NestJS Unit Test — 기본 구조

공식 문서: https://docs.nestjs.com/fundamentals/testing

#### 핵심 원칙

- 실제 DB/NATS/HTTP 연결 금지. 반드시 mock으로 대체한다.
- `Test.createTestingModule()` + `.compile()`로 테스팅 모듈을 구성한다.
- 인스턴스는 `moduleRef.get(Token)`으로 가져온다.
- 테스트 파일 위치: 프로젝트 루트 `tests/` 폴더 아래에 소스 경로를 미러링하여 작성 (`*.spec.ts`)
- e2e 테스트는 `tests/e2e/` 디렉토리에 `*.e2e-spec.ts`로 작성

#### 일반 서비스 mock — `mock<T>()`

외부 의존성이 1단계 메서드만 가진 경우 `mock<T>()`를 사용한다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNats: MockProxy<NatsService>;
  let mockConfig: MockProxy<ConfigService>;

  beforeEach(async () => {
    mockNats = mock<NatsService>();
    mockConfig = mock<ConfigService>();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    })
      .overrideProvider(NatsService)
      .useValue(mockNats)
      .overrideProvider(ConfigService)
      .useValue(mockConfig)
      .compile();

    service = moduleRef.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('send', () => {
    it('[Happy Path] 정상 발송 시 성공 응답 반환', async () => {
      // Arrange
      mockConfig.get.calledWith('NATS_SUBJECT').mockReturnValue('notification');
      mockNats.publishEvent.mockResolvedValue(undefined);

      // Act
      const result = await service.send(dto);

      // Assert
      expect(result).toEqual(expected);
      expect(mockNats.publishEvent).toHaveBeenCalledWith('notification', dto);
    });

    it('[Edge Case] dto의 content가 빈 문자열일 때', async () => { ... });

    it('[Error] NATS 발행 실패 시 예외 throw', async () => {
      mockNats.publishEvent.mockRejectedValue(new Error('NATS down'));
      await expect(service.send(dto)).rejects.toThrow();
    });
  });
});
```

#### Prisma mock — `mockDeep<T>()`

Prisma처럼 `prisma.model.method()` 형태의 중첩 객체는 `mockDeep<T>()`를 사용한다.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

describe('UserService', () => {
  let service: UserService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(async () => {
    mockPrisma = mockDeep<PrismaClient>();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    service = moduleRef.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('[Happy Path] 유저 조회 성공', async () => {
      // Arrange
      const mockUser = { id: 1, name: 'Alice', email: 'alice@test.com' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('[Edge Case] 존재하지 않는 유저 ID일 때 null 반환', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findById(9999);
      expect(result).toBeNull();
    });

    it('[Error] DB 연결 실패 시 예외 전파', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Connection refused'));
      await expect(service.findById(1)).rejects.toThrow('Connection refused');
    });
  });
});
```

#### Prisma Transaction mock

`prisma.$transaction()` 콜백 패턴을 테스트할 때는 콜백에 mock 자체를 전달한다.

```typescript
it('[Happy Path] 트랜잭션 내 생성 + 업데이트', async () => {
  mockPrisma.$transaction.mockImplementation(async (cb) => cb(mockPrisma));
  mockPrisma.order.create.mockResolvedValue(mockOrder);
  mockPrisma.inventory.update.mockResolvedValue(mockInventory);

  const result = await service.createOrder(dto);

  expect(result).toEqual(mockOrder);
  expect(mockPrisma.order.create).toHaveBeenCalled();
  expect(mockPrisma.inventory.update).toHaveBeenCalled();
});
```

#### HttpService mock — Observable 반환

```typescript
import { mock, MockProxy } from 'jest-mock-extended';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

let mockHttp: MockProxy<HttpService>;
mockHttp = mock<HttpService>();

// 성공
mockHttp.post.mockReturnValue(
  of({ data: { result: 'ok' }, status: 200 } as AxiosResponse),
);

// 실패
mockHttp.post.mockReturnValue(
  throwError(() => new Error('timeout')),
);
```

#### calledWithFn — 인자별 반환값 분기

같은 메서드가 인자에 따라 다른 값을 반환해야 할 때 사용한다.

```typescript
import { calledWithFn } from 'jest-mock-extended';

const mockGet = calledWithFn();
mockConfig.get = mockGet;

mockGet.calledWith('DB_HOST').mockReturnValue('localhost');
mockGet.calledWith('DB_PORT').mockReturnValue(5432);
```

---

### 6. DTO 반환값 필드 검증 규칙 (Response Assertion)

**`toBeInstanceOf()` 만으로 끝내지 않는다.** DTO를 반환하는 메서드는 반드시 주요 필드 값까지 검증한다.

#### 금지 패턴

```typescript
// ❌ 타입만 확인하고 끝 → API 반환값이 바뀌어도 테스트가 통과함
expect(result).toBeInstanceOf(GetAssignmentResponseDto);
```

#### 필수 패턴

```typescript
// ✅ 타입 + 주요 필드 값 검증
expect(result).toBeInstanceOf(GetAssignmentResponseDto);
expect(result.assignId).toBe('ASSIGN-001');
expect(result.callType).toBe(1);
expect(result.userId).toBe('USER-001');
```

#### 검증 범위

아래 필드들은 반드시 assertion에 포함한다:

1. **PK 필드** (예: `assignId`, `customerId`, `recordId`)
2. **서비스에서 직접 추가/변환하는 파생 필드** (예: `unmaskedPhone`, `userName` 등 join/raw에서 가져오는 필드)
3. **기본값이 설정되는 필드** (예: `disCd: 0`, `regDate: dayjs()`, `userId || '0'`)
4. **`getRawAndEntities()` / `getRawMany()` 로 join한 필드** — mock raw 데이터에 포함하고, 결과에서 검증

#### 메서드 호출 인자 검증

`toHaveBeenCalled()` 만 쓰지 않는다. 중요한 사이드이펙트 호출은 인자까지 검증한다.

```typescript
// ❌ 호출 여부만 확인
expect(mockGateway.broadcastAssignmentEvent).toHaveBeenCalled();

// ✅ 인자까지 검증
expect(mockGateway.broadcastAssignmentEvent).toHaveBeenCalledWith(
  AssignmentEventType.CREATED,
  'ASSIGN-001',
  'USER-001',
  '0',
  PrCode.RECEPTION,
  expect.any(String),
);
```

#### Mock 데이터 충실도

Mock 객체는 DTO의 `@Expose()` 필드 중 **최소 PK + 비즈니스 핵심 필드**를 포함해야 한다.
빈약한 mock은 필드 추가/제거 시 테스트가 변경을 감지하지 못한다.

```typescript
// ❌ 너무 빈약한 mock — DTO 변경 감지 불가
const mockContract: Partial<Tcontract> = { customerId: 'CUST-001' };

// ✅ 핵심 필드 포함 — DTO 구조 변경 시 테스트 깨짐
const mockContract: Partial<Tcontract> = {
  contractId: 'CONTRACT-001',
  customerId: 'CUST-001',
  custName: '테스트고객',
  product: '상품A',
  startDate: '20240101',
  endDate: '20241231',
};
```

#### `getRawAndEntities()` 사용 시 raw 필드 검증 체크리스트

서비스에서 `addSelect`로 추가한 필드가 N개이면, mock raw 데이터에도 N개 모두 포함하고, 결과 DTO에서 N개 모두 검증한다.

```typescript
// 서비스: addSelect('customer.bsName'), addSelect('customer.custName'), addSelect('customer.phone'), addSelect('user.userName')
// → mock raw에 4개 모두 포함
raw: [{ bsName: '업체명', custName: '고객명', phone: '010-1234-5678', userName: '담당자' }]

// → 결과에서 4개 모두 검증
expect(result.list[0].bsName).toBe('업체명');
expect(result.list[0].custName).toBe('고객명');
expect(result.list[0].phone).toBe('010-1234-5678');
expect(result.list[0].userName).toBe('담당자');
```

---

### 7. Auto Mocking — 의존성이 많을 때

`useMocker()` + `jest-mock-extended`를 조합하면 등록되지 않은 모든 의존성을 자동 mock 처리할 수 있다.

```typescript
import { mockDeep } from 'jest-mock-extended';

beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({
    providers: [TargetService],
  })
    .useMocker((token) => {
      if (typeof token === 'function') {
        return mockDeep(token);
      }
    })
    .compile();

  service = moduleRef.get<TargetService>(TargetService);
  // 필요한 mock만 꺼내서 설정
  mockPrisma = moduleRef.get(PrismaService);
});
```

---

### 8. E2E Test

실제 HTTP 요청 흐름을 검증할 때 사용한다. `supertest`로 HTTP 요청을 시뮬레이션한다.

```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mockDeep } from 'jest-mock-extended';

describe('User (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [UserModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockDeep<PrismaClient>())
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it('GET /users/:id — 정상 조회', () => {
    return request(app.getHttpServer())
      .get('/users/1')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});
```

---

### 9. 실행 명령어

```bash
pnpm test                                    # 전체
pnpm test --testPathPattern=<파일명>         # 특정 파일
pnpm test:watch                              # watch 모드
```
