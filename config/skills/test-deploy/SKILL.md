---
name: test-deploy
description: >
  테스트 커버리지를 실행하고 결과를 HTML 이메일로 발송하는 스킬.
  /test-deploy 명령어 또는 "테스트 결과 메일로 보내줘", "coverage 이메일 발송",
  "test:cov 결과 공유" 등의 요청 시 반드시 이 스킬을 사용한다.
  pnpm, npm, yarn 등 프로젝트의 패키지 매니저를 자동 감지하여 동작한다.
  수신자 이메일을 인자로 받아 Gmail SMTP로 발송하며, 어떤 프로젝트에서도 동작한다.
---

## 사용법

```
/test-deploy {recipient@email.com} {version}
```

- `version`: 배포 버전 또는 태그 (예: `v1.2.0`, `rc-3`). 생략 시 최신 git 태그를 자동으로 사용한다.

## 사전 요건

SMTP 인증 정보는 **스킬 디렉토리**의 `.env`에 저장한다 (프로젝트 루트가 아님):

```
/home/jongdeug/.claude/skills/test-deploy/.env
```

```bash
MAIL_USER=본인Gmail@gmail.com
MAIL_PASS=앱비밀번호16자리  # Google 계정 → 보안 → 앱 비밀번호
```

> `send-coverage-mail.mjs`가 `dotenv.config({ path: resolve(skillDir, '.env') })`로 스킬 디렉토리의 `.env`를 명시적으로 로드한다. 프로젝트마다 설정할 필요 없이 한 번만 세팅하면 어느 프로젝트에서도 동작한다.

**Gmail 앱 비밀번호 발급**: myaccount.google.com → 보안 → 2단계 인증 → 앱 비밀번호

## 실행 절차

### 1. 사전 확인

```bash
# 스킬 디렉토리의 .env에 MAIL_USER, MAIL_PASS 존재 여부 확인
grep -E "MAIL_USER|MAIL_PASS" /home/jongdeug/.claude/skills/test-deploy/.env 2>/dev/null
```

키가 없으면 스킬 디렉토리의 `.env` 파일에 추가하도록 안내 후 중단한다.

### 2. 태그 체크아웃

```bash
# 버전: 인자로 받은 값 또는 최신 git 태그
VERSION={version}  # 인자가 없으면 아래 fallback
if [ -z "$VERSION" ]; then
  VERSION=$(git describe --tags --abbrev=0 2>/dev/null)
fi

# 태그가 없으면 중단
if [ -z "$VERSION" ]; then
  echo "❌ git 태그가 존재하지 않습니다. 버전을 직접 지정해주세요: /test-deploy email version"
  # 중단
fi

# 현재 브랜치 저장 후 태그로 체크아웃
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout "$VERSION"
```

태그가 존재하지 않으면 안내 후 중단한다.

### 3. 테스트 실행 및 coverage 캡처

```bash
# OS별 임시 파일 경로 생성 (프로젝트명 포함, Windows/Mac/Linux/WSL 모두 지원)
TMPFILE=$(node -e "const os=require('os'),path=require('path'),p=require('./package.json');console.log(path.join(os.tmpdir(),'coverage-output-'+(p.name||'project')+'.txt'))")

# 패키지 매니저 자동 감지: pnpm-lock.yaml → pnpm, yarn.lock → yarn, 그 외 → npm
if [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
elif [ -f "yarn.lock" ]; then
  PM="yarn"
else
  PM="npm"
fi

# coverage 결과를 임시 파일로 저장
# package.json에 test:cov 스크립트가 있으면 사용, 없으면 jest --coverage로 fallback
$PM run test:cov 2>&1 | tee "$TMPFILE" || npx jest --coverage 2>&1 | tee "$TMPFILE"
```

실패한 테스트가 있어도 계속 진행한다 (coverage 결과는 생성됨).

### 4. 원래 브랜치 복귀

```bash
git checkout "$ORIGINAL_BRANCH"
```

테스트 실행 후 반드시 원래 브랜치로 돌아온다.

### 5. 이메일 발송

스킬 디렉토리의 헬퍼 스크립트를 사용한다. `SKILL_DIR`은 이 SKILL.md가 위치한 디렉토리이다.

```bash
# 프로젝트 이름은 package.json의 name 필드에서 추출
PROJECT_NAME=$(node -e "const p=require('./package.json');console.log(p.name||'project')" 2>/dev/null || basename $(pwd))

node {SKILL_DIR}/scripts/send-coverage-mail.mjs \
  {recipient} \
  "$TMPFILE" \
  "$PROJECT_NAME" \
  $(pwd) \
  "$VERSION"
```

`{SKILL_DIR}`은 이 파일의 실제 절대 경로로 대체한다:
`/home/jongdeug/.claude/skills/test-deploy`

### 6. 완료 메시지 출력

발송 성공 시:
```
✅ Coverage 리포트 발송 완료 → recipient@email.com (태그: {version})
```

## 오류 처리

| 상황 | 대응 |
|------|------|
| MAIL_USER/MAIL_PASS 없음 | 설정 방법 안내 후 중단 |
| 태그가 존재하지 않음 | 버전 직접 지정 안내 후 중단 |
| 태그 체크아웃 실패 | 오류 안내 후 중단 (원래 브랜치 유지) |
| 테스트 실패 | 실패 사실 알리고 coverage는 계속 발송, 이후 원래 브랜치 복귀 |
| SMTP 인증 실패 | 앱 비밀번호 확인 안내 |
| coverage 파싱 실패 | 테스트 출력 형식 확인 안내 |

## 메일 내용

- **제목**: `[{project-name}] {version} · ✅ Passed · 10/10 tests · {날짜}`
- **본문**: Summary 카드 (Stmts/Branch/Funcs/Lines 전체 %) + 파일별 상세 테이블
- **색상**: 녹색(≥80%), 노란색(60-79%), 빨간색(<60%)
