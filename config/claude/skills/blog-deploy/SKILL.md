---
name: blog-deploy
description: 옵시디언 블로그 빌드 + 배포 스킬. `/blog`, "블로그 빌드", "블로그 배포", "deploy blog" 등의 요청에서 반드시 트리거한다. jongdeug.log (Obsidian → static HTML) 을 `build.js` 로 생성하고 상태/목록 조회도 지원한다.
owner: jongdeug
allowed-tools: Bash, Read, mcp__plugin_telegram_telegram__reply
---

# blog-deploy — 옵시디언 블로그 빌드 & 배포

## 실행 조건
- **jongdeug(5270356206) 전용** — 다른 유저가 호출하면 "권한 없음" 응답 후 종료.

## 실행 절차

### 1. 빌드 + 배포
```bash
cd /home/jongdeug/.claude/channels/telegram/jongdeug/blog && sudo node build.js [username]
```
- `username` 생략 시 전체 유저 빌드 (jongdeug + 0deug)
- `username` 지정 시 해당 유저만 빌드 (예: `sudo node build.js jongdeug`)

### 2. 결과 확인
```bash
curl -s -o /dev/null -w "%{http_code}" https://jongdeug.duckdns.org/obsidian/
```

### 3. 응답
빌드 성공 시 reply 로 아래 정보 전달:
- 빌드된 글 수
- 라이브 URL: https://jongdeug.duckdns.org/obsidian/
- 새로 추가/변경된 글 목록 (가능하면)

빌드 실패 시 에러 메시지 전달.

## 인자 분기

- `deploy` → 전체 빌드 + 배포 실행
- `deploy jongdeug` → jongdeug만 빌드 + 배포
- `deploy 0deug` → 0deug만 빌드 + 배포
- `status` → 빌드 없이 현재 상태만 확인 (글 수, URL 응답코드)
- `list` → 소스 폴더의 .md 파일 목록 반환 (전체 유저)
- 인자 없음 → 사용법 안내

## 호출 트리거

`/blog`, `/blog@<botname>`, "블로그 빌드해", "블로그 배포해", "deploy blog", "블로그 상태" 등의 자연어/슬래시 입력 모두 이 스킬로 처리한다.
