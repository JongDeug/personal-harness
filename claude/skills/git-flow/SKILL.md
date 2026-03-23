---
name: git-flow
description: >
  Git 배포 플로우 자동화 스킬. 아래 커맨드 중 하나가 언급될 때 반드시 이 스킬을 사용한다.
  - /feat {issue-key} — feature 브랜치 생성
  - /finish-feat {issue-key} — feature 작업 완료 후 push + PR 생성 (develop 대상)
  - /start-rc {version} — RC 브랜치 생성 및 동기화 확인
  - /rc-fix {issue-key} — RC 중 버그수정 브랜치 생성
  - /revert-issue {issue-key} — RC에서 특정 이슈 전체 revert
  - /release {version} — 배포 (main merge + 태깅 + develop sync)
  - /hotfix {version} — 핫픽스 브랜치 생성
  - /finish-hotfix — 핫픽스 완료 및 RC rebase
  개발자가 브랜치 생성, 배포, 핫픽스 등 Git 배포 플로우 단계를 실행할 때 항상 사용.
---

## 브랜치 규칙

- **고정**: `main` (프로덕션), `develop` (개발 통합)
- **임시** (머지 후 삭제):
  - `feat/{jira-issue-key}` — 기능 개발 (e.g. `feat/ABC-12`, `feat/PROJ-99`)
  - `rc/{version}` — 배포 준비/QA (e.g. `rc/2.1.0.0`)
  - `fix/{jira-issue-key}-{N}` — RC 중 버그수정, N 자동 증가 (e.g. `fix/ABC-12-1`, `fix/ABC-12-2`)
  - `hotfix/{version}` — 배포 후 긴급수정 (e.g. `hotfix/2.1.0.0`)
- **버전 태그 형식**: `Major.Minor.Hotfix.Test`

---

## 커맨드별 실행 절차

### `/feat {issue-key}`

feature 브랜치를 생성한다. develop 최신화 후 분기.

1. `git fetch origin`
2. `git checkout develop && git pull origin develop`
3. `git checkout -b feat/{issue-key}`
4. 생성된 브랜치명과 다음 단계(작업 후 develop으로 PR) 안내

---

### `/finish-feat {issue-key}`

feature 작업을 완료하고 push 후 develop으로 PR을 생성한다.

1. 현재 브랜치가 `feat/{issue-key}`인지 확인. 아니면 에러 후 중단
2. `git push origin feat/{issue-key}`
3. 커밋 내역 분석:
   ```
   git log develop..HEAD --oneline
   ```
4. `.github/PULL_REQUEST_TEMPLATE.md` 존재 여부 확인
   - **있으면**: 해당 파일을 읽어 템플릿 형식에 맞게 내용 채워서 PR 본문 작성
   - **없으면**: 커밋 내역을 분석해 제목과 본문을 자유롭게 작성
5. PR 생성:
   ```
   gh pr create --base develop --head feat/{issue-key} \
     --title "..." \
     --body "..."
   ```
6. 생성된 PR URL 출력

---

### `/start-rc {version}`

배포 준비 RC 브랜치를 생성한다. develop과 main이 동기화되어 있는지 먼저 확인.

1. `git fetch origin`
2. `git diff origin/develop origin/main` 실행
   - 차이가 있으면 diff 내용 출력 후 "계속 진행할까요?" 확인 요청
   - 차이 없으면 그냥 진행
3. `git checkout develop && git pull origin develop`
4. `git checkout -b rc/{version}`
5. 생성 완료 메시지 + RC 중 버그 발견 시 `/rc-fix {issue-key}` 사용 안내

---

### `/rc-fix {issue-key}`

RC 테스트 중 버그 발견 시 수정 브랜치를 생성한다. N은 자동 계산.

1. 현재 브랜치가 `rc/`로 시작하는지 확인. 아니면 에러 후 중단
2. 기존 fix 브랜치 개수 파악:
   ```
   git branch -a | grep "fix/{issue-key}-"
   ```
3. N = 기존 개수 + 1
4. `git checkout -b fix/{issue-key}-{N}`
5. 생성된 브랜치명과 수정 후 RC 브랜치로 PR 안내

---

### `/revert-issue {issue-key}`

QA 요청으로 특정 이슈를 배포 리스트에서 제외할 때 사용. 해당 이슈의 모든 머지 커밋을 revert.

1. 현재 브랜치가 `rc/`로 시작하는지 확인. 아니면 에러 후 중단
2. 해당 이슈 관련 머지 커밋 탐색:
   ```
   git log --oneline --merges
   ```
   - `feat/{issue-key}` 머지 커밋
   - `fix/{issue-key}-*` 머지 커밋 전부
3. 찾은 커밋 목록을 보여주고 "이 커밋들을 revert할까요?" 확인 요청
4. 확인 후 최신 커밋부터 역순으로 revert:
   ```
   git revert -m 1 {commit-hash}
   ```
5. 완료 메시지 출력

---

### `/release {version}`

RC를 main에 머지하고 태그를 생성한 뒤 develop에도 반영한다.

1. `git fetch origin`
2. `git diff origin/develop origin/main` — 차이 있으면 경고 출력 (중단하지 않고 계속)
3. `rc/{version}` 브랜치 존재 확인. 없으면 에러 후 중단
4. **main에 머지 + 태깅:**
   ```
   git checkout main && git pull origin main
   git merge --no-ff rc/{version} -m "release: {version}"
   git tag {version}
   git push origin main --tags
   ```
5. **develop에 반영:**
   ```
   git checkout develop && git pull origin develop
   git merge --no-ff rc/{version} -m "chore: merge rc/{version} into develop"
   git push origin develop
   ```
6. 최종 `git diff origin/develop origin/main` 동기화 확인
7. 배포 완료 메시지 출력

---

### `/hotfix {version}`

프로덕션 배포 후 긴급 버그 발생 시 main에서 핫픽스 브랜치를 생성한다.

1. `git fetch origin`
2. `git checkout main && git pull origin main`
3. `git checkout -b hotfix/{version}`
4. 생성 완료 메시지 + 수정 후 `/finish-hotfix` 실행 안내

---

### `/finish-hotfix`

핫픽스를 main에 머지하고 진행 중인 RC 브랜치가 있으면 rebase한다.

1. 현재 브랜치가 `hotfix/`로 시작하는지 확인. 아니면 에러 후 중단
2. 현재 브랜치명 저장
3. **main에 머지:**
   ```
   git checkout main && git pull origin main
   git merge --no-ff {hotfix_branch} -m "hotfix: {hotfix_branch}"
   git push origin main
   ```
4. **RC 브랜치 rebase (있을 경우):**
   ```
   git branch -a | grep "rc/"
   ```
   - rc 브랜치가 있으면: `git checkout {rc_branch} && git rebase origin/main`
   - rebase 후 `git push origin {rc_branch} --force-with-lease`
   - rc 브랜치 없으면 스킵
5. 완료 메시지 출력

---

## 공통 주의사항

- `git push`는 각 단계에서 명시적으로 표기된 경우에만 실행. 표기 없으면 push 전에 사용자 확인
- conflict 발생 시 즉시 중단하고 상황 설명 후 해결 방법 안내
- revert, rebase 등 되돌리기 어려운 작업은 반드시 실행 전 사용자 확인
- 각 단계 완료 후 현재 브랜치 상태(`git branch --show-current`) 출력
