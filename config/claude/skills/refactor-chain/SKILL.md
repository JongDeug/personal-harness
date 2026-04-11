---
name: refactor-chain
description: >
  코드베이스 대상으로 "분석 → 리팩터 → 테스트 → 리뷰" 4단계 체인을 실행하는 스킬.
  /refactor-chain {target-path} 명령어 입력 시 반드시 이 스킬을 사용한다.
  각 단계는 독립 서브에이전트로 실행되며, 이전 단계 결과가 다음 단계 프롬프트에 주입된다.
owner: jongdeug
---

## 사용법

```
/refactor-chain {target-path}
```

예시: `/refactor-chain src/modules/payment`

---

## Step 0: 사전 확인 (메인 Claude가 직접 수행)

Agent 도구를 호출하기 전에 메인이 직접 실행:

1. **대상 경로 확인**: 경로가 존재하는지 확인
2. **git 상태 확인**: `git status --short` 실행
   - dirty working tree면 사용자에게 경고 후 계속 진행 여부 확인
   - `git stash`로 백업할지 물어보기
3. **재실행 감지**: `git diff --name-only`로 이미 변경된 파일 확인
   - 변경된 파일이 있으면 "체인 재실행인가요?" 확인
4. **대상 파일 목록 수집**: `.ts/.tsx` 파일 목록 수집 (node_modules 제외)
   - 30개 초과 시 사용자에게 경고 (타임아웃 위험)
5. 수집된 파일 목록을 `TARGET_FILES`로 저장

owner: jongdeug
---

## Step 1: 분석 에이전트

아래 프롬프트로 **Agent 도구**를 호출한다. 결과를 `ANALYSIS_RESULT`에 저장.

### 에이전트 프롬프트 템플릿

```
작업 디렉토리: {target-path의 절대경로}

## 역할
너는 코드 분석 전문가다. 아래 파일들을 읽고 리팩터링이 필요한 부분을 분석하라.

## 분석 대상
{TARGET_FILES}

## 분석 항목
1. 코드 중복 (DRY 위반)
2. 단일 책임 원칙(SRP) 위반
3. 함수/클래스 길이 초과 (함수 50줄, 클래스 200줄 기준)
4. 명명 규칙 불일치
5. 복잡도 높은 로직 (중첩 if 3단계 이상)

## 출력 형식
반드시 아래 JSON만 출력하라. 다른 텍스트는 절대 포함하지 마라.
각 description은 1-2문장 이내로 제한한다. 최대 20개 이슈만 포함한다.

{
  "issues": [
    {
      "file": "파일 경로",
      "line": 줄번호,
      "type": "duplicate|srp|length|naming|complexity",
      "description": "문제 설명 (1-2문장)",
      "priority": "high|medium|low"
    }
  ],
  "summary": "전체 요약 1-2문장",
  "refactor_targets": ["실제 수정이 필요한 파일 경로만"]
}
```

### Step 1 결과 처리

- JSON을 파싱하여 `ANALYSIS_RESULT`에 저장
- 사용자에게 분석 결과 요약 보고 (issues 개수, high priority 항목)
- **중단 조건**: issues가 0개 → "리팩터링이 필요한 부분이 없습니다." 출력 후 체인 종료

---

## Step 2: 리팩터 에이전트

`ANALYSIS_RESULT`를 주입하여 **Agent 도구**를 호출한다. 결과를 `REFACTOR_RESULT`에 저장.

### 에이전트 프롬프트 템플릿

```
작업 디렉토리: {target-path의 절대경로}

## 역할
너는 코드 리팩터링 전문가다. 아래 분석 결과를 바탕으로 실제 코드를 수정하라.

## 이전 단계 결과 (분석)
```json
{ANALYSIS_RESULT}
```

## 리팩터링 규칙
- priority: high 항목 먼저 처리
- 기능 변경 없이 구조만 개선 (behavioral equivalence 유지)
- 수정 후 기존 import 경로가 깨지지 않도록 확인
- 파일 내용은 Read 도구로 직접 읽어서 처리

## 출력 형식
반드시 아래 JSON만 출력하라. 코드 수정은 Edit 도구로 직접 수행.
각 description은 1-2문장 이내로 제한한다.

{
  "changed_files": ["수정된 파일 경로"],
  "skipped_files": [{"file": "파일", "reason": "스킵 이유"}],
  "changes_summary": [
    {"file": "파일", "description": "변경 내용 요약 (1-2문장)"}
  ],
  "overall_summary": "전체 변경 요약 1-2문장"
}
```

### Step 2 결과 처리

- JSON을 파싱하여 `REFACTOR_RESULT`에 저장
- 사용자에게 변경된 파일 목록 보고
- **중단 조건**: changed_files가 0개 → 사용자에게 알리고 계속 진행 여부 확인

owner: jongdeug
---

## Step 3: 테스트 에이전트

`REFACTOR_RESULT`를 주입하여 **Agent 도구**를 호출한다. 결과를 `TEST_RESULT`에 저장.

### 에이전트 프롬프트 템플릿

```
작업 디렉토리: {target-path의 절대경로}

## 역할
너는 테스트 전문가다. 리팩터링된 파일들의 기존 테스트를 실행하고 결과를 보고하라.

## 이전 단계 결과 (리팩터링)
```json
{REFACTOR_RESULT}
```

## 실행 순서
1. changed_files에서 파일 목록 추출
2. 각 파일에 대응하는 테스트 파일 탐색 (tests/ 디렉토리 미러링 규칙)
   - 예: src/modules/user/user.service.ts → tests/modules/user/user.service.spec.ts
3. 테스트 파일이 있으면 실행: pnpm jest {테스트파일경로} --no-coverage
4. 실패한 테스트가 리팩터링으로 인한 것이면 수정
5. e2e, integration spec은 실행하지 마라

## 출력 형식
반드시 아래 JSON만 출력하라.

{
  "test_results": {
    "passed": 숫자,
    "failed": 숫자,
    "skipped": 숫자
  },
  "fixed_tests": ["수정된 테스트 파일"],
  "failures": [{"file": "파일", "error": "에러 요약 (1문장)"}],
  "status": "pass|fail|no_tests"
}
```

### Step 3 결과 처리

- JSON을 파싱하여 `TEST_RESULT`에 저장
- 사용자에게 테스트 결과 보고
- **중단 조건**: status가 "fail" → 사용자에게 알리고 계속 진행 여부 확인
  - 계속 진행 시 Step 4 에이전트에 "테스트 실패 상태"임을 명시

---

## Step 4: 리뷰 에이전트

Step 1~3 결과를 모두 주입하여 **Agent 도구**를 호출한다.

### 에이전트 프롬프트 템플릿

```
작업 디렉토리: {target-path의 절대경로}

## 역할
너는 시니어 개발자로서 코드 리뷰어다. 리팩터링 전체 과정을 검토하고 최종 의견을 제시하라.

## 체인 전체 결과

### 분석 결과
```json
{ANALYSIS_RESULT}
```

### 리팩터링 결과
```json
{REFACTOR_RESULT}
```

### 테스트 결과
```json
{TEST_RESULT}
```

## 리뷰 기준
1. high priority 이슈가 모두 해결되었는가
2. 변경된 코드가 기존 기능을 해치지 않는가 (테스트 결과 기반)
3. 새로운 안티패턴이 도입되지 않았는가
4. 변경 범위가 적절한가 (scope creep 없는가)

## 출력 형식
반드시 아래 JSON만 출력하라.

{
  "approved": true/false,
  "score": 0~100,
  "comments": [
    {"type": "praise|concern|blocker", "description": "내용 (1-2문장)"}
  ],
  "unresolved_issues": ["미해결 이슈 목록"],
  "recommendation": "승인|조건부승인|재작업필요"
}
```

### Step 4 결과 처리

- 최종 리포트를 사용자에게 출력
- approved: false 또는 blocker 코멘트가 있으면 강조 표시
- unresolved_issues 목록 출력

owner: jongdeug
---

## 실패 처리 원칙

### 에이전트 호출 실패
- Agent 도구가 에러 반환 시 해당 단계 최대 1회 재시도
- 재시도도 실패하면 체인 중단 + 지금까지의 결과 보고

### Git 복구
- 체인 실패 또는 사용자 중단 시 stash를 사용했다면 `git stash pop` 안내
- 리팩터 결과를 되돌리려면 `git checkout -- {파일}` 또는 `git reset HEAD~1` 안내
