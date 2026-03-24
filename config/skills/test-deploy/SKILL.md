---
name: test-deploy
description: >
  테스트 커버리지를 실행하고 결과를 HTML 이메일로 발송하는 스킬.
  /test-deploy 명령어 또는 "테스트 결과 메일로 보내줘", "coverage 이메일 발송",
  "test:cov 결과 공유", "pnpm test:deploy" 등의 요청 시 반드시 이 스킬을 사용한다.
  수신자 이메일을 인자로 받아 Gmail SMTP로 발송하며, 어떤 프로젝트에서도 동작한다.
---

## 사용법

```
/test-deploy {recipient@email.com}
```

## 사전 요건

프로젝트 루트의 `.env`에 아래 항목이 있어야 한다:

```bash
MAIL_USER=본인Gmail@gmail.com
MAIL_PASS=앱비밀번호16자리  # Google 계정 → 보안 → 앱 비밀번호
```

**Gmail 앱 비밀번호 발급**: myaccount.google.com → 보안 → 2단계 인증 → 앱 비밀번호

## 실행 절차

### 1. 사전 확인

```bash
# .env에 MAIL_USER, MAIL_PASS 존재 여부 확인
grep -E "MAIL_USER|MAIL_PASS" .env 2>/dev/null || grep -E "MAIL_USER|MAIL_PASS" .env.$(node -e "console.log(process.env.NODE_ENV||'')") 2>/dev/null
```

키가 없으면 사용자에게 안내 후 중단한다.

### 2. 테스트 실행 및 coverage 캡처

```bash
# OS별 임시 파일 경로 생성 (Windows/Mac/Linux/WSL 모두 지원)
TMPFILE=$(node -e "const os=require('os'),path=require('path');console.log(path.join(os.tmpdir(),'coverage-output.txt'))")

# coverage 결과를 임시 파일로 저장
pnpm test:cov 2>&1 | tee "$TMPFILE"
```

실패한 테스트가 있어도 계속 진행한다 (coverage 결과는 생성됨).

### 3. 이메일 발송

스킬 디렉토리의 헬퍼 스크립트를 사용한다. `SKILL_DIR`은 이 SKILL.md가 위치한 디렉토리이다.

```bash
# 프로젝트 이름은 package.json의 name 필드에서 추출
PROJECT_NAME=$(node -e "const p=require('./package.json');console.log(p.name||'project')" 2>/dev/null || basename $(pwd))

node {SKILL_DIR}/scripts/send-coverage-mail.mjs \
  {recipient} \
  "$TMPFILE" \
  "$PROJECT_NAME" \
  $(pwd)
```

`{SKILL_DIR}`은 이 파일의 실제 절대 경로로 대체한다:
`/home/jongdeug/.claude/skills/test-deploy`

### 4. 완료 메시지 출력

발송 성공 시:
```
✅ Coverage 리포트 발송 완료 → recipient@email.com
```

## 오류 처리

| 상황 | 대응 |
|------|------|
| MAIL_USER/MAIL_PASS 없음 | 설정 방법 안내 후 중단 |
| 테스트 실패 | 실패 사실 알리고 coverage는 계속 발송 |
| SMTP 인증 실패 | 앱 비밀번호 확인 안내 |
| coverage 파싱 실패 | 테스트 출력 형식 확인 안내 |

## 메일 내용

- **제목**: `[{project-name}] Test Coverage Report · {날짜}`
- **본문**: Summary 카드 (Stmts/Branch/Funcs/Lines 전체 %) + 파일별 상세 테이블
- **색상**: 녹색(≥80%), 노란색(60-79%), 빨간색(<60%)
