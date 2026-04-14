---
name: git-flow
description: >
  Git 배포 플로우 자동화 스킬. 아래 커맨드 중 하나가 언급될 때 반드시 이 스킬을 사용한다.
  - /feat {issue-key} — feature 브랜치 생성
  - /finish-feat {issue-key} — feature 작업 완료 후 push + PR 생성 (develop 대상)
  - /start-rc — RC 브랜치 생성 (버전은 main 최신 태그 자동 감지)
  - /rc-fix {issue-key} — RC 중 버그수정 브랜치 생성
  - /revert-issue {issue-key} — RC에서 특정 이슈 전체 revert
  - /rc-notes [version] [--post [tag]] — 활성 RC에 머지된 PR을 모아 마크다운 릴리즈 노트 생성, 옵션으로 GitHub Releases에 드래프트 게시
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
| 릴리즈 노트 | `/rc-notes [--post]` | 활성 RC에 머지된 PR을 모아 마크다운 노트 생성, `--post`로 GitHub Releases 드래프트 게시 |
| 배포 | `/release 2.1.0.0` | main 머지 + 태깅 + develop sync |
| 긴급 수정 | `/hotfix 2.1.0.0` | main에서 hotfix 브랜치 생성 |
| 긴급 수정 완료 | `/finish-hotfix` | main 머지 + 태깅 + RC rebase |

**일반적인 흐름**: `/feat` → 구현 → `/finish-feat` → PR 머지 → `/start-rc` → QA → `/rc-notes` → `/release`

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

배포 준비 RC 브랜치를 생성하거나, RC 진행 중이면 develop을 기존 RC에 동기화한다.

1. `git fetch origin`
2. **최신 태그 감지:**
   ```
   git tag --list --sort=-v:refname | head -1
   ```
   태그가 없으면 에러 후 중단. 태그를 `{major}.{minor}.{hotfix}.{test}`로 파싱.

3. **분기 판단:**
   - **Case A**: 최신 태그가 `{major}.{minor}.0.0` 형식 (`hotfix==0` AND `test==0`) → 실제 배포가 나간 상태 → 신규 RC 생성
   - **Case B**: 그 외 (`hotfix>0` OR `test>0`) → RC 진행 중 → 기존 RC에 develop 동기화

---

**Case A — 신규 RC 생성**

4. `git diff origin/develop origin/main` 실행
   - 차이가 있으면 diff 출력 후 "계속 진행할까요?" 확인 요청
   - 차이 없으면 그냥 진행
5. `git checkout develop && git pull origin develop`
6. `git checkout -b rc/{major}.{minor}.0.0`
7. `git push origin rc/{major}.{minor}.0.0`
8. **초기 태그 버전 계산:**
   ```
   git tag --list "{major}.{minor}.0.*" --sort=-v:refname | head -1
   ```
   - 태그가 없으면: `{tag_version}` = `{major}.{minor}.0.0`
   - 태그가 있으면: test +1 → `{tag_version}` = `{major}.{minor}.0.{test+1}`
   (예: `1.2.0.0` 이미 존재 → `{tag_version}` = `1.2.0.1`)
9. **package.json 버전 업데이트 및 커밋:**
   ```
   npm pkg set version={tag_version}
   git add package.json
   git commit -m "[chore]: 버전 {tag_version}으로 업데이트"
   git push origin rc/{major}.{minor}.0.0
   ```
10. **태그 생성:**
    ```
    git tag {tag_version}
    git push origin {tag_version}
    ```
11. 생성 완료 메시지 + RC 중 버그 발견 시 `/rc-fix {issue-key}` 사용 안내

---

**Case B — 기존 RC에 develop 동기화**

4. RC 브랜치 결정: `rc_branch = rc/{major}.{minor}.0.0`
   ```
   git branch -r | grep "origin/rc/{major}.{minor}.0.0"
   ```
   브랜치 없으면 에러 후 중단 ("RC 브랜치를 찾을 수 없습니다: {rc_branch}")

5. develop에 RC에 없는 신규 커밋이 있는지 확인:
   ```
   git log origin/{rc_branch}..origin/develop --oneline
   ```
   없으면 "develop에 반영할 신규 커밋이 없습니다" 안내 후 중단.

6. develop → rc 동기화 PR 생성:
   ```
   gh pr create --base {rc_branch} --head develop \
     --title "chore: sync develop into {rc_branch}" \
     --body "신규 커밋 목록:\n{커밋 목록}\n\ndevelop 신규 작업을 RC에 반영합니다."
   ```
   > ⚠️ rc에 `/rc-fix`로 머지된 커밋이 있고 develop에 없는 경우 충돌 발생 가능. PR에서 충돌 해결 후 머지.

7. PR URL 출력, 사용자에게 머지 요청. 사용자가 머지 완료했다고 알릴 때까지 대기

8. **머지 확인 후 test 번호 증가 태그 생성:**
   ```
   git checkout {rc_branch} && git pull origin {rc_branch}
   git tag --list "{major}.{minor}.0.*" --sort=-v:refname | head -1
   # test 번호 +1 하여 새 버전 계산
   NEW_VERSION={major}.{minor}.0.{test+1}
   ```
   **package.json 버전 업데이트 및 커밋:**
   ```
   npm pkg set version=$NEW_VERSION
   git add package.json
   git commit -m "[chore]: 버전 $NEW_VERSION으로 업데이트"
   git push origin {rc_branch}
   git tag $NEW_VERSION
   git push origin $NEW_VERSION
   ```

9. 새 태그명 출력

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

### `/rc-notes [version] [--post [tag]]`

활성 RC에 머지된 PR을 모아 마크다운 릴리즈 노트를 생성한다. 기본은 콘솔 출력만, `--post` 옵션을 주면 GitHub Releases에 **드래프트로** 게시한다.

> ⚠️ 명령 이름 주의: `/release-notes`는 Claude Code 빌트인 명령(앱 변경 로그)과 충돌하므로 `/rc-notes`로 이름을 잡았다.

**프로젝트 무관**: 어느 저장소에서 호출해도 자동 동작. Jira 프로젝트 키와 GitHub repo는 자동 감지/설정값에서 읽는다. 컨택센터(`CN`) 외 어느 프로젝트(`MC`, `PROJ`...)에서도 그대로 쓸 수 있다.

#### 인자

| 인자 | 설명 |
|---|---|
| `version` | RC 버전 명시 (예: `1.14.0.0`). 없으면 활성 RC 자동 감지 |
| `--post` | GitHub Releases에 드래프트 게시. 태그 명시 안 하면 RC의 최신 태그에 첨부 |
| `--post {tag}` | 명시 태그(예: `1.14.0.3`)에 드래프트 게시 |

**자동 publish 안 함**: 항상 `--draft`로 생성. 사용자가 GitHub UI에서 직접 "Publish release" 눌러 공개.

#### 절차

1. `git fetch origin --tags`

2. **Jira base URL 확보** (우선순위 순):
   - 명시 인자 `--jira-url <url>`
   - 환경변수 `$JIRA_BASE_URL`
   - `git config --get release.jiraUrl`
   - 모두 없으면 사용자에게 한 번만 묻는다:
     ```
     Jira base URL을 입력하세요 (예: https://yourorg.atlassian.net)
     이후 git config에 영구 저장됩니다. 사용 안 하려면 빈 줄로 Enter:
     ```
     입력 받으면 `git config release.jiraUrl <url>`로 저장.
   - 그래도 비었으면 링크 없이 텍스트로만 출력 (스킵 가능).

3. **RC 브랜치 결정**:
   - 인자 있으면 `rc/{version}` 사용
   - 없으면 활성 RC 자동 감지:
     ```
     git branch -r | grep 'origin/rc/' | head -1 | sed 's|.*origin/||'
     ```
   - 활성 RC 없으면 "활성 RC 없음" 출력 후 종료

4. **RC 분기 시점 파악**:
   ```
   git merge-base origin/main origin/{rc_branch}
   ```
   결과 sha를 `base_sha`로 저장.

5. **RC에 들어간 머지 PR 수집**:
   ```
   gh pr list --base develop      --state merged --json number,title,mergedAt,author,headRefName --limit 100
   gh pr list --base {rc_branch}  --state merged --json number,title,mergedAt,author,headRefName --limit 100
   ```
   - 두 결과를 합침
   - **`base_sha`의 커밋 시각 이후에 머지된 PR만** 필터 (그 이전 PR은 이미 main에 있음)
   - PR 번호 기준 중복 제거 (develop 머지 후 sync로 RC에 다시 들어간 경우 한 번만 노출)
   - sync PR(`title`이 `chore: sync develop into rc/...` 패턴) 자체는 노트에서 제외

6. **각 PR 분류**:
   - 제목 prefix(대소문자 무시)로 카테고리:
     - `fix`, `[fix]`, `bugfix`, `bug` → **Bug Fixes**
     - `feat`, `[feat]`, `feature` → **Features**
     - `refactor`, `[refactor]` → **Refactoring**
     - `chore`, `[chore]`, `docs`, `style`, `test` → **Chores**
     - 그 외 → **Other**
   - **Jira 키 추출**: PR 제목 + `headRefName`(브랜치명)에서 정규식 `\b([A-Z][A-Z0-9]+)-(\d+)\b` 매칭. 여러 키도 모두 추출. prefix 무관(어느 프로젝트든 동작).

7. **태그 목록 수집**:
   ```
   RC 버전에서 {major}.{minor}.{hotfix} 추출
   git tag --list "{major}.{minor}.{hotfix}.*" --sort=v:refname
   ```
   각 태그의 커밋 날짜:
   ```
   git log -1 --format='%cs' {tag}
   ```

8. **마크다운 출력** (다음 형식):
   ```markdown
   # Release {최신 태그}

   **기간**: {base_sha 날짜} ~ {오늘} ({경과 일수}일)
   **RC 브랜치**: `{rc_branch}`
   **최종 태그**: `{최신 태그}`

   ## 변경 사항

   ### Bug Fixes
   - **[CN-15](https://trustnhope.atlassian.net/browse/CN-15)** 콜노트 길이 초과 시 저장 실패 수정 (#46)
   ### Features
   - ...
   ### Refactoring
   - ...
   ### Chores
   - ...

   ## 태그 히스토리
   - `1.14.0.0` (2026-03-28)
   - `1.14.0.1` (2026-04-02)
   - `1.14.0.2` (2026-04-05)
   - `1.14.0.3` (2026-04-10)

   ## 기여자
   - @user1
   - @user2
   ```
   - Jira 키 표시: `release.jiraUrl` 있으면 `[KEY-123]({url}/browse/KEY-123)` 링크. 없으면 그냥 텍스트 `KEY-123`.
   - 빈 카테고리는 출력 생략.
   - 기여자는 PR `author.login` 중복 제거.

9. **출력 끝에 안내**:
   ```
   위 노트를 검토 후 main PR 본문이나 GitHub Releases에 붙여넣으세요.
   /release {version}을 실행할 때 PR 본문에 첨부하면 됩니다.
   ```

10. **`--post` 옵션이 주어졌으면 GitHub Releases에 드래프트 게시**:
    1. 게시 대상 태그 결정:
       - `--post {tag}` 인자 있으면 그 태그
       - 없으면 절차 7에서 수집한 가장 최신 태그
    2. 태그가 origin에 푸시되어 있는지 확인:
       ```
       git ls-remote --tags origin {tag}
       ```
       없으면 에러 출력 후 종료: `"태그 {tag}가 origin에 없습니다. git push origin {tag} 후 다시 시도하세요."`
    3. 같은 태그에 기존 릴리즈가 있는지 확인:
       ```
       gh release view {tag} --json isDraft,url 2>/dev/null
       ```
    4. **기존 릴리즈 없으면** — 드래프트 새로 생성:
       ```
       gh release create {tag} \
         --title "Release {tag}" \
         --notes "$(절차 8의 마크다운 출력)" \
         --draft
       ```
       > 마크다운 본문은 single-quoted heredoc(`<<'EOF'`)으로 전달. 백틱은 escape하지 말고 그대로 쓴다 (`` `tag` ``, `` `branch` ``).
    5. **기존 릴리즈가 있으면** — 사용자에게 확인 후 본문 업데이트:
       ```
       기존 릴리즈가 있습니다 ({URL}, draft={isDraft}).
       본문을 덮어쓸까요? (y/N)
       ```
       y면:
       ```
       gh release edit {tag} --notes "$(절차 8의 마크다운 출력)"
       ```
       n이면 스킵하고 안내만.
    6. 결과 출력:
       ```
       📝 GitHub Release 드래프트:
       https://github.com/{owner}/{repo}/releases/tag/{tag} (Draft)

       검토 후 GitHub UI에서 "Publish release"를 눌러 공개하세요.
       ```

#### 주의

- **`--post` 없으면 100% 읽기 전용**: git push, tag, commit 일절 안 함.
- **`--post`도 절대 publish 안 함**: 항상 `--draft`로 생성. 사용자가 GitHub UI에서 직접 publish.
- **재사용성**: 첫 호출 시 `git config release.jiraUrl` 한 번만 설정하면 끝. 다른 프로젝트에서도 동일 명령으로 동작.

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
