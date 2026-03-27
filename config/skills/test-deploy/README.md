# test-deploy

테스트 커버리지를 실행하고 결과를 HTML 이메일로 발송하는 도구입니다.

---

## 실행 방법

### A. Claude Code 스킬

```
/test-deploy 수신자@email.com v1.0.0
```

`version` 생략 시 최신 git 태그를 자동으로 사용합니다.

### B. 쉘에서 직접 실행

아래 순서를 따라주세요.

---

## 설치 (최초 1회)

### 1. 레포 클론

```bash
git clone https://github.com/JongDeug/personal-harness.git
```

> 이미 클론되어 있다면 생략합니다.

### 2. 의존성 설치

```bash
cd personal-harness/config/skills/test-deploy
npm install
```

### 3. Gmail 앱 비밀번호 발급

1. [myaccount.google.com](https://myaccount.google.com) → **보안** → **2단계 인증** → **앱 비밀번호**
2. 앱 이름 입력 (예: `test-deploy`) → **만들기**
3. 생성된 16자리 비밀번호 복사

> 2단계 인증이 켜져 있어야 앱 비밀번호 메뉴가 표시됩니다.

### 4. `.env` 설정

**test-deploy 디렉토리** 안에 `.env` 파일을 생성합니다:

```bash
# personal-harness/config/skills/test-deploy/.env
MAIL_USER=본인Gmail@gmail.com
MAIL_PASS=앱비밀번호16자리
```

---

## 쉘 실행

테스트할 **프로젝트 루트 디렉토리**에서 아래 명령어를 실행합니다.

`RECIPIENT`와 `SKILL_DIR`만 본인 환경에 맞게 변경하세요.

```bash
# ── 변수 설정 ─────────────────────────────────────────────────
RECIPIENT="수신자@email.com"
SKILL_DIR="/path/to/personal-harness/config/skills/test-deploy"

# ── 1. 버전 감지 (직접 지정하려면: VERSION="v1.2.0") ─────────
VERSION=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -z "$VERSION" ]; then
  echo "git 태그가 없습니다. VERSION을 직접 지정해주세요."
  return 1 2>/dev/null || exit 1
fi

# ── 2. 태그 체크아웃 ──────────────────────────────────────────
ORIGINAL_BRANCH=$(git rev-parse --abbrev-ref HEAD)
git checkout "$VERSION"

# ── 3. 패키지 매니저 감지 ─────────────────────────────────────
if [ -f "pnpm-lock.yaml" ]; then
  PM="pnpm"
elif [ -f "yarn.lock" ]; then
  PM="yarn"
else
  PM="npm"
fi

# ── 4. 테스트 실행 & coverage 캡처 ───────────────────────────
TMPFILE=$(node -e "const os=require('os'),path=require('path'),p=require('./package.json');console.log(path.join(os.tmpdir(),'coverage-output-'+(p.name||'project')+'.txt'))")
$PM run test:cov 2>&1 | tee "$TMPFILE" || npx jest --coverage 2>&1 | tee "$TMPFILE"

# ── 5. 원래 브랜치 복귀 ──────────────────────────────────────
git checkout "$ORIGINAL_BRANCH"

# ── 6. 이메일 발송 ───────────────────────────────────────────
PROJECT_NAME=$(node -e "const p=require('./package.json');console.log(p.name||'project')" 2>/dev/null || basename "$(pwd)")
node "$SKILL_DIR/scripts/send-coverage-mail.mjs" \
  "$RECIPIENT" "$TMPFILE" "$PROJECT_NAME" "$(pwd)" "$VERSION"
```

> 태그 체크아웃 없이 **현재 브랜치에서 바로 실행**하려면 1, 2, 5번 단계를 생략하면 됩니다.

---

## 메일 예시

| 항목 | 내용 |
|------|------|
| 제목 | `[project-name] v1.0.0 · ✅ Passed · 10/10 tests · 2026. 3. 24.` |
| 발신자 | `project-name CI <MAIL_USER>` |
| 본문 | Summary 카드 (Stmts/Branch/Funcs/Lines) + 파일별 상세 테이블 |

색상 기준: 🟢 >= 80% / 🟡 60-79% / 🔴 < 60%

---

## 주의사항

- 앱 비밀번호는 `.env`에만 저장하고 Git에 커밋하지 마세요
- `test:cov` 스크립트가 없는 프로젝트는 `npx jest --coverage`로 fallback됩니다
