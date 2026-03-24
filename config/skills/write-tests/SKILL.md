---
name: write-tests
description: >
  NestJS/TypeScript 또는 Go 프로젝트에서 테스트 코드를 작성할 때 반드시 사용하는 스킬.
  아래 상황 중 하나라도 해당되면 반드시 이 스킬을 사용한다.
  - /write-tests 명령어 입력
  - 신규 함수/모듈/서비스 구현 후 테스트 코드 작성
  - 기존 코드 수정 후 테스트 추가
  - "테스트 작성", "테스트 코드", "unit test", "테스트 추가", "spec 파일" 등의 키워드 포함 요청
  - PR 준비 전 테스트 코드 점검
---
 
## 실행 절차
 
`/write-tests` 호출 또는 테스트 작성 요청 시 아래 순서로 진행한다.
 
1. **언어/프레임워크 감지**: `go.mod` → Go, `package.json` + NestJS → NestJS/TypeScript
2. **대상 파일 읽기**: 테스트 대상 함수/모듈의 코드를 먼저 읽고 파악
3. **기존 테스트 확인**: 같은 디렉토리에 `*.spec.ts` 또는 `*_test.go`가 있는지 확인
   - 있으면: 기존 테스트 구조를 따르고 누락된 케이스만 추가
   - 없으면: 아래 템플릿에 따라 새로 작성
4. **테스트 작성**: 정책(3종 케이스, Mock 규칙)에 따라 작성
5. **테스트 실행**: 작성 후 실행하여 통과 확인
 
---
 
## 테스트 작성 정책
 
현재 디렉토리의 언어/프레임워크를 파악한 후 해당 섹션을 적용한다.
 
---
 
## 1. 작성 의무
 
- **신규 함수/모듈**: Unit Test 필수
- **기존 코드 수정**: 변경된 로직에 대한 테스트 추가. 기존 테스트가 없으면 신규 작성
- 테스트 없이 PR을 올릴 경우 PR 본문에 명확한 사유 기재 필요
 
---
 
## 2. 커버리지 목표
 
| 대상 | 목표 |
|------|------|
| 일반 코드 | 70% 이상 |
| 핵심 비즈니스 로직 | 90% 이상 |
 
---
 
## 3. 테스트 케이스 3종 구성
 
언어에 관계없이 모든 테스트는 아래 세 가지 케이스를 포함한다.
 
1. **Happy Path** — 정상 입력과 예상 흐름
2. **Edge Case** — 경계값, 빈 값, null/nil, 최대값 등
3. **Error Handling** — 예외 발생, 외부 API 실패, 유효성 검사 실패
 
---
 
## 4. NestJS/TypeScript
 
공식 문서: https://docs.nestjs.com/fundamentals/testing
 
### 핵심 원칙
 
- 실제 DB/NATS/HTTP 연결 금지. 반드시 mock으로 대체한다.
- `Test.createTestingModule()` + `.compile()`로 테스팅 모듈을 구성한다.
- 인스턴스는 `moduleRef.get(Token)`으로 가져온다.
- 테스트 파일명: `*.spec.ts` (같은 디렉토리), e2e는 `test/` 디렉토리에 `*.e2e-spec.ts`
 
### Unit Test — 기본 구조
 
`Test.createTestingModule()`에 실제 클래스를 등록하고, 외부 의존성만 `.overrideProvider()`로 교체한다.
이유: 실제 DI 컨테이너를 통해 인스턴스를 얻으므로 NestJS의 의존성 주입 흐름 그대로 테스트할 수 있다.
 
mock 객체에 직접 `mockResolvedValue` 등을 호출한다. `overrideProvider`로 이미 jest.fn()을 주입했으므로 `jest.spyOn()`을 다시 걸 필요 없다.
 
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
 
describe('KakaoService', () => {
  let service: KakaoService;
  let mockPrisma: Record<string, any>;
  let mockNats: Record<string, any>;
 
  beforeEach(async () => {
    mockPrisma = {
      hospitalMapping: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
 
    mockNats = {
      publishEvent: jest.fn(),
      sendRequest: jest.fn(),
    };
 
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [KakaoService],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(NatsService)
      .useValue(mockNats)
      .overrideProvider(ConfigService)
      .useValue({ get: jest.fn((key: string) => 'mock-value') })
      .compile();
 
    service = moduleRef.get<KakaoService>(KakaoService);
  });
 
  afterEach(() => {
    jest.clearAllMocks();
  });
 
  describe('sendMessage', () => {
    it('[Happy Path] 정상 메시지 발송 시 성공 응답 반환', async () => {
      // Arrange
      mockPrisma.hospitalMapping.findFirst.mockResolvedValue({ id: 1, orgId: 'org1' });
 
      // Act
      const result = await service.sendMessage(mapping, dto);
 
      // Assert
      expect(result).toEqual(expected);
      expect(mockPrisma.hospitalMapping.findFirst).toHaveBeenCalledWith({ ... });
    });
 
    it('[Edge Case] 메시지 내용이 빈 문자열일 때', async () => { ... });
 
    it('[Error] 외부 API 실패 시 OmnichannelException throw', async () => {
      mockPrisma.hospitalMapping.findFirst.mockRejectedValue(new Error('DB error'));
      await expect(service.sendMessage(mapping, dto)).rejects.toThrow(OmnichannelException);
    });
  });
});
```
 
### Auto Mocking — 의존성이 많을 때
 
`useMocker()`를 사용하면 등록되지 않은 모든 의존성을 자동으로 mock 처리한다.
 
```typescript
import { ModuleMocker, MockMetadata } from 'jest-mock';
 
const moduleMocker = new ModuleMocker(global);
 
beforeEach(async () => {
  const moduleRef = await Test.createTestingModule({
    providers: [KakaoService],
  })
    .useMocker((token) => {
      if (token === PrismaService) {
        return { hospitalMapping: { findFirst: jest.fn() } };
      }
      if (typeof token === 'function') {
        const mockMetadata = moduleMocker.getMetadata(token) as MockMetadata<any, any>;
        const Mock = moduleMocker.generateFromMetadata(mockMetadata);
        return new Mock();
      }
    })
    .compile();
 
  service = moduleRef.get<KakaoService>(KakaoService);
});
```
 
### HttpService Mock (Observable 반환)
 
```typescript
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
 
.overrideProvider(HttpService)
.useValue({
  post: jest.fn().mockReturnValue(
    of({ data: { result: 'success' }, status: 200 } as AxiosResponse)
  ),
  get: jest.fn(),
})
```
 
### E2E Test
 
실제 HTTP 요청 흐름을 검증할 때 사용한다. `supertest`로 HTTP 요청을 시뮬레이션한다.
 
```typescript
import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
 
describe('Kakao (e2e)', () => {
  let app: INestApplication;
 
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [KakaoModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ hospitalMapping: { findFirst: jest.fn() } })
      .compile();
 
    app = moduleRef.createNestApplication();
    await app.init();
  });
 
  it('POST /webhook/kakao — 정상 수신', () => {
    return request(app.getHttpServer())
      .post('/webhook/kakao')
      .send({ ... })
      .expect(200);
  });
 
  afterAll(async () => {
    await app.close();
  });
});
```
 
### 실행 명령어
 
```bash
pnpm test                                    # 전체
pnpm test --testPathPattern=<파일명>         # 특정 파일
pnpm test:watch                              # watch 모드
```
 
---
 
## 5. Go
 
### 외부 의존성 Mock 규칙
 
실제 DB/외부 API 연결 금지. 인터페이스 기반 mock을 사용한다.
- 표준 `testing` 패키지 사용
- mock은 `testify/mock` 또는 직접 인터페이스 구현체 작성
- DB mock은 `sqlmock` (database/sql 기반) 또는 Repository 인터페이스 mock 사용
 
### 테스트 파일 구조 템플릿
 
테스트 파일은 대상 파일과 같은 패키지에 `_test.go` 접미사로 작성한다.
 
```go
package service_test
 
import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)
 
// Mock 정의
type MockRepository struct {
    mock.Mock
}
 
func (m *MockRepository) FindByID(id int) (*Entity, error) {
    args := m.Called(id)
    return args.Get(0).(*Entity), args.Error(1)
}
 
func TestServiceMethod(t *testing.T) {
    // [Happy Path]
    t.Run("정상 동작", func(t *testing.T) {
        mockRepo := new(MockRepository)
        mockRepo.On("FindByID", 1).Return(&Entity{ID: 1}, nil)
 
        svc := NewService(mockRepo)
        result, err := svc.GetEntity(1)
 
        assert.NoError(t, err)
        assert.Equal(t, 1, result.ID)
        mockRepo.AssertExpectations(t)
    })
 
    // [Edge Case]
    t.Run("ID가 0일 때 처리", func(t *testing.T) { ... })
 
    // [Error]
    t.Run("Repository 오류 시 에러 반환", func(t *testing.T) {
        mockRepo := new(MockRepository)
        mockRepo.On("FindByID", 99).Return((*Entity)(nil), errors.New("not found"))
 
        svc := NewService(mockRepo)
        _, err := svc.GetEntity(99)
 
        assert.Error(t, err)
    })
}
```
 
### Table-Driven Test (반복 케이스에 권장)
 
```go
func TestValidateInput(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        wantErr bool
    }{
        {"[Happy Path] 유효한 입력", "valid", false},
        {"[Edge Case] 빈 문자열", "", true},
        {"[Edge Case] 최대 길이 초과", strings.Repeat("a", 256), true},
    }
 
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            err := ValidateInput(tt.input)
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
        })
    }
}
```
 
### 실행 명령어
 
```bash
go test ./...                        # 전체
go test ./internal/service/...       # 특정 패키지
go test -run TestServiceMethod ./... # 특정 테스트
go test -v -cover ./...              # 커버리지 포함 상세 출력
go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out  # HTML 리포트
```
