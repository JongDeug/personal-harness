---
name: git-flow
description: >
  Git 배포 플로우 자동화 스킬. 아래 커맨드 중 하나가 언급될 때 반드시 이 스킬을 사용한다.
  - /feat {issue-key} — feature 브랜치 생성
  - /finish-feat {issue-key} — feature 작업 완료 후 push + PR 생성 (develop 대상)
  - /start-rc — RC 브랜치 생성 (버전은 main 최신 태그 자동 감지)
  - /rc-fix {issue-key} — RC 중 버그수정 브랜치 생성
  - /revert-issue {issue-key} — RC에서 특정 이슈 전체 revert
  - /release {version} — 배포 (main merge + 태깅 + develop sync)
  - /hotfix {version} — 핫픽스 브랜치 생성
  - /finish-hotfix — 핫픽스 완료 및 RC rebase
  개발자가 브랜치 생성, 배포, 핫픽스 등 Git 배포 플로우 단계를 실행할 때 항상 사용.
---

## 빠른 참조 (TL;DR)

| 상황 | 커맨드 | 한 줄 설명 |
|------|--------|-----------|
| 기능 시작 | `/feat ABC-12` | develop에서 feat/ABC-12 브랜치 생성 |
| 기능 완료 | `/finish-feat ABC-12` | push + develop 대상 PR 생성 |
| 배포 준비 | `/start-rc` | develop에서 RC 브랜치 생성 (버전 자동 감지) |
| RC 버그수정 | `/rc-fix ABC-12` | RC에서 fix 브랜치 생성 |
| RC 이슈 제거 | `/revert-issue ABC-12` | RC에서 해당 이슈 커밋 전체 revert |
| 배포 | `/release 2.1.0.0` | main 머지 + 태깅 + develop sync |
| 긴급 수정 | `/hotfix 2.1.0.0` | main에서 hotfix 브랜치 생성 |
| 긴급 수정 완료 | `/finish-hotfix` | main 머지 + 태깅 + RC rebase |

**일반적인 흐름**: `/feat` → 구현 → `/finish-feat` → PR 머지 → `/start-rc` → QA → `/release`

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

### `/start-rc`

배포 준비 RC 브랜치를 생성하고 리모트에 push한다.

**RC 브랜치 버전은 현재 main의 최신 태그를 자동으로 사용한다.**
이는 "어떤 main 버전 위에서 QA를 진행하는지" 기록하기 위한 용도이다.
(예: main 최신 태그 `1.10.0.0` → RC 브랜치 `rc/1.10.0.0`)

1. `git fetch origin`
2. **main 최신 태그 자동 감지:**
   ```
   git tag --list --sort=-v:refname | head -1
   ```
   감지된 버전을 `{version}`으로 사용. 태그가 없으면 에러 후 중단.
3. `git diff origin/develop origin/main` 실행
   - 차이가 있으면 diff 내용 출력 후 "계속 진행할까요?" 확인 요청
   - 차이 없으면 그냥 진행
4. `git checkout develop && git pull origin develop`
5. `git checkout -b rc/{version}`
6. `git push origin rc/{version}`
7. **초기 태그 버전 계산:**
   `{version}`에서 `{major}.{minor}.{hotfix}` 파싱 후, 해당 prefix의 최신 태그를 조회:
   ```
   git tag --list "{major}.{minor}.{hotfix}.*" --sort=-v:refname | head -1
   ```
   - 태그가 없으면: `{tag_version}` = `{major}.{minor}.{hotfix}.0`
   - 태그가 있으면: 최신 태그의 test 번호 +1 → `{tag_version}` = `{major}.{minor}.{hotfix}.{test+1}`
   (예: 최신 태그 `1.2.0.0` 존재 → `{tag_version}` = `1.2.0.1`)
8. **package.json 버전 업데이트 및 커밋:**
   ```
   npm pkg set version={tag_version}
   git add package.json
   git commit -m "[chore]: 버전 {tag_version}으로 업데이트"
   git push origin rc/{version}
   ```
9. **태그 생성:**
   ```
   git tag {tag_version}
   git push origin {tag_version}
   ```
10. 생성 완료 메시지 + RC 중 버그 발견 시 `/rc-fix {issue-key}` 사용 안내

---

### `/rc-fix {issue-key}`

RC 테스트 중 버그 발견 시 수정 브랜치를 생성하고, 머지 후 test 번호를 올려 태그를 찍는다. N은 자동 계산.

1. 현재 브랜치가 `rc/`로 시작하는지 확인. 아니면 에러 후 중단
2. 현재 RC 버전 파악 (브랜치명에서 추출, 예: `rc/2.1.0.0` → `2.1.0`)
3. 기존 fix 브랜치 개수 파악:
   ```
   git branch -a | grep "fix/{issue-key}-"
   ```
4. N = 기존 개수 + 1
5. `git checkout -b fix/{issue-key}-{N}`
6. **RC 브랜치로 PR 생성:**
   ```
   git push origin fix/{issue-key}-{N}
   gh pr create --base rc/{version} --head fix/{issue-key}-{N} \
     --title "fix: {issue-key}" \
     --body "RC {version} 버그수정"
   ```
7. PR URL 출력 후 사용자에게 머지 요청. 사용자가 머지 완료했다고 알릴 때까지 대기
8. **머지 확인 후 test 번호 증가 태그 생성:**
   ```
   git checkout rc/{version} && git pull origin rc/{version}
   # 현재 RC에 해당하는 최신 태그의 test 번호 조회
   git tag --list "{major}.{minor}.{hotfix}.*" --sort=-v:refname | head -1
   # test 번호 +1 하여 새 버전 계산
   NEW_VERSION={major}.{minor}.{hotfix}.{test+1}
   ```
   **package.json 버전 업데이트 및 커밋:**
   ```
   npm pkg set version=$NEW_VERSION
   git add package.json
   git commit -m "[chore]: 버전 $NEW_VERSION으로 업데이트"
   git push origin rc/{version}
   git tag $NEW_VERSION
   git push origin $NEW_VERSION
   ```
   (예: 최신 태그 `2.1.0.1` → 새 태그 `2.1.0.2`)
9. 새 태그명 출력

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

RC를 PR을 통해 main과 develop에 머지하고 배포 태그를 생성한다. 모든 머지는 PR로 진행하여 GitHub에서 이력을 확인할 수 있도록 한다.

배포 태그는 RC 버전의 **minor를 +1하고 hotfix·test를 0으로 리셋**한 버전을 사용한다.
(예: `rc/2.1.0.3` → 배포 태그 `2.2.0.0`)

1. `git fetch origin`
2. `rc/{version}` 리모트 브랜치 존재 확인. 없으면 에러 후 중단
3. **배포 태그 버전 계산:**
   - RC 버전에서 `{major}.{minor}` 파싱
   - `minor +1`, `hotfix=0`, `test=0` → `release_version = {major}.{minor+1}.0.0`
   - 사용자에게 배포 태그 버전 확인 요청: "배포 태그는 `{release_version}`으로 생성됩니다. 계속할까요?"
4. **RC 브랜치에서 package.json 버전 업데이트 및 태그 생성:**
   ```
   git checkout rc/{version} && git pull origin rc/{version}
   npm pkg set version={release_version}
   git add package.json
   git commit -m "[chore]: 버전 {release_version}으로 업데이트"
   git tag {release_version}
   git push origin rc/{version}
   git push origin {release_version}
   ```
   (예: `2.2.0.0`)
5. **main으로 PR 생성:**
   ```
   gh pr create --base main --head rc/{version} \
     --title "release: {release_version}" \
     --body "RC {version} → main 배포 (태그: {release_version})"
   ```
6. PR URL 출력 후 사용자에게 머지 요청. 사용자가 머지 완료했다고 알릴 때까지 대기
7. **develop으로 PR 생성 (동기화):**
   ```
   gh pr create --base develop --head rc/{version} \
     --title "chore: merge rc/{version} into develop" \
     --body "release {release_version} 배포 후 develop 동기화"
   ```
8. PR URL 출력 후 사용자에게 머지 요청. 사용자가 머지 완료했다고 알릴 때까지 대기
9. 최종 `git fetch origin && git diff origin/develop origin/main` 동기화 확인
10. 배포 완료 메시지 출력

---

### `/hotfix {version}`

프로덕션 배포 후 긴급 버그 발생 시 main에서 핫픽스 브랜치를 생성한다.

1. `git fetch origin`
2. `git checkout main && git pull origin main`
3. `git checkout -b hotfix/{version}`
4. 생성 완료 메시지 + 수정 후 `/finish-hotfix` 실행 안내

---

### `/finish-hotfix`

핫픽스를 PR을 통해 main에 머지하고 진행 중인 RC 브랜치가 있으면 rebase한다.

1. 현재 브랜치가 `hotfix/`로 시작하는지 확인. 아니면 에러 후 중단
2. 현재 브랜치명 저장
3. `git push origin {hotfix_branch}`
4. **main으로 PR 생성:**
   ```
   gh pr create --base main --head {hotfix_branch} \
     --title "hotfix: {hotfix_branch}" \
     --body "핫픽스 → main 머지"
   ```
5. PR URL 출력 후 사용자에게 머지 요청. 사용자가 머지 완료했다고 알릴 때까지 대기
6. **RC 브랜치 rebase (있을 경우):**
   ```
   git branch -a | grep "rc/"
   ```
   - rc 브랜치가 있으면: `git checkout {rc_branch} && git rebase origin/main`
   - rebase 후 `git push origin {rc_branch} --force-with-lease`
   - rc 브랜치 없으면 스킵
7. 완료 메시지 출력

---

## 공통 주의사항

- `git push`는 각 단계에서 명시적으로 표기된 경우에만 실행. 표기 없으면 push 전에 사용자 확인
- conflict 발생 시 즉시 중단하고 상황 설명 후 해결 방법 안내
- revert, rebase 등 되돌리기 어려운 작업은 반드시 실행 전 사용자 확인
- 각 단계 완료 후 현재 브랜치 상태(`git branch --show-current`) 출력
