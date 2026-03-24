# test-deploy 스킬

테스트 커버리지를 실행하고 결과를 HTML 이메일로 팀원에게 발송하는 Claude Code 스킬입니다.

## 사용법

```
/test-deploy {recipient@email.com}
```

## 설치 가이드

### 1. 스킬 디렉토리에 의존성 설치

```bash
cd ~/.claude/skills/test-deploy
npm install
```

### 2. Gmail 앱 비밀번호 발급

1. [myaccount.google.com](https://myaccount.google.com) → **보안** → **2단계 인증** → **앱 비밀번호**
2. 앱 이름 입력 (예: `claude-test-deploy`) → **만들기**
3. 생성된 16자리 비밀번호 복사

> 2단계 인증이 켜져 있어야 앱 비밀번호 메뉴가 표시됩니다.

### 3. 프로젝트 .env에 환경변수 추가

사용할 프로젝트의 `.env` (또는 `.env.development`) 파일에 추가:

```bash
# Mail (test-deploy 스킬용)
MAIL_USER=본인Gmail@gmail.com
MAIL_PASS=앱비밀번호16자리  # 공백 없이 붙여서 입력
```

### 4. 실행 테스트

```
/test-deploy 본인이메일@gmail.com
```

메일이 수신되면 설치 완료입니다.

## 메일 예시

| 항목 | 내용 |
|------|------|
| 제목 | `[project-name] Test Coverage Report · 2026. 3. 24.` |
| 발신자 | `project-name CI <MAIL_USER>` |
| 본문 | Summary 카드 (Stmts/Branch/Funcs/Lines) + 파일별 상세 테이블 |

색상 기준: 🟢 ≥ 80% / 🟡 60–79% / 🔴 < 60%

## 주의사항

- 앱 비밀번호는 `.env`에만 저장하고 Git에 커밋하지 마세요 (`.gitignore` 확인)
- Gmail 계정은 팀원 각자 본인 계정을 사용합니다
- `test:cov` 스크립트가 없는 프로젝트는 `package.json`에 추가 필요
