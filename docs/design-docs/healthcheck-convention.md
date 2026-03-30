# HealthCheck API Convention

서비스 간 일관된 HealthCheck 응답 필드 컨벤션.

> **최종 업데이트**: 2025-09-17

## API Endpoint

```
GET /HealthCheck?checks[]=db&checks[]=redis&checks[]=rabbitMq&checks[]=nats
```

- `checks[]={checkPropertyName}` 으로 점검 항목을 배열로 전달
- `checks` 파라미터가 없으면 아래 **필수 필드만** 응답

## 응답 JSON Format

밑줄(`**`) 필드는 필수. 나머지는 `checks[]`로 요청 시에만 포함.
각 object 내부의 하위 필드는 모두 필수.

```jsonc
{
  "serviceName": "medichis-sessionWatch",   // 필수. {serviceName}-{detailServiceName} 형식 (string)
  "version": "1.10.1",                      // 필수. 서비스 버전 (string)
  "timestamp": "20250101123059",             // 필수. 현재시간 YYYYMMDDHHmmss (string)

  // --- 이하 옵셔널 (checks[] 파라미터로 요청 시) ---

  "db": { ... },
  "redis": { ... },
  "rabbitMq": { ... },
  "nats": { ... }
}
```

## DB

```typescript
interface DBHealthCheckResult {
  /** 종합 판단: 'UP' (정상) | 'DOWN' (실패/타임아웃) */
  status: 'UP' | 'DOWN';

  /**
   * healthCheck에 사용된 DB 이름.
   * null이면 기본 커넥션 테스트(SELECT 1)만 수행.
   */
  dbName: string | null;

  /** 풀에 생성된 총 커넥션 수 (pool._allConnections.length) */
  allConnections: number;

  /** 유휴(Idle) 커넥션 수. 0이면 모두 사용 중 */
  freeConnections: number;

  /** 풀 최대 커넥션 수 (connectionLimit) */
  limitConnections: number;

  /** 커넥션 대기 큐 길이. 높으면 커넥션 부족 */
  waitingConnections: number;

  /** 커넥션 획득 소요 시간(ms). 타임아웃 시 null */
  acquireMs: number | null;

  /** 쿼리 실행 소요 시간(ms). 타임아웃 시 null */
  queryMs: number | null;

  /** 실패 시 오류 메시지. status='DOWN'일 때만 존재 */
  errorMessage: string | null;
}
```

## Redis

```typescript
interface RedisHealthCheckResult {
  /** 'UP' (정상) | 'DEGRADED' (연결 O, 응답 비정상) | 'DOWN' (연결 불가) */
  status: 'UP' | 'DEGRADED' | 'DOWN';

  /** 클라이언트 내부 상태: 'ready' | 'connecting' | 'end' | 'reconnecting' */
  redisStatus: string;

  /** ping 응답 정상 여부 */
  pingOk: boolean;

  /** 에러 메시지 (DOWN/DEGRADED 시) */
  errorMessage: string | null;

  /** ping 왕복 시간(ms) */
  pingMs: number | null;
}
```

## RabbitMQ

```typescript
interface RabbitMQHealthCheckResult {
  /** 'UP' (정상) | 'DEGRADED' (연결 O, 일부 경고) | 'DOWN' (연결 불가) */
  status: 'UP' | 'DEGRADED' | 'DOWN';

  /** AMQP TCP 연결 활성 여부 */
  isConnected: boolean;

  /** 기본 채널 정상 오픈 여부. false면 메시지 송수신 불가 */
  isChannelOpen: boolean;

  /** 초기화(assertExchange → assertQueue → bindQueue → consume) 완료 여부 */
  isReady: boolean;

  /** 브로커가 connection.blocked 이벤트로 송신 차단한 상태 (디스크/메모리 부족 등) */
  isBlockedBroker: boolean;

  /** 재연결 시도 누적 횟수 */
  reconnectCount: number;

  /** 마지막 연결 성공 시각 (YYYY-MM-DD HH:mm:ss) */
  lastConnectedAt: string | null;

  /** 마지막 메시지 소비 후 경과 시간(ms). null이면 소비 이력 없음 */
  lastConsumeAgoMs: number | null;

  /** ping publish → confirm 왕복 시간(ms). null이면 미수행/실패 */
  lastPingMs: number | null;

  /** passive check(exchange, queue 존재 확인) 성공 여부 */
  passiveOk: boolean;

  /** ping publish → confirm 정상 응답 여부 */
  pingOk: boolean;

  /** 소비 지연/정지 상태 여부 (consumeStaleMs 초과 시 true) */
  consumeOk: boolean;
}
```

## NATS

> 아직 정의되지 않음. 확정 시 업데이트 필요.
