---
name: blog-writing
description: Write blog posts for jongdeug.log (Obsidian → static HTML blog) in 종환의 voice — 담담한 로그/기록식, 존댓말 설명형, 자랑/쇼케이스 금지. Use when user asks to draft, rewrite, or polish a post for jongdeug.log.
owner: jongdeug
---

# Blog Writing — jongdeug.log

종환님 블로그(`jongdeug.log`, Obsidian → HTML)에 올리는 글을 쓴다.

**톤만 엄격히 지킨다.** 구조·길이·섹션 구성·카탈로그 형식 모두 글 주제에 맞춰 자유롭게 짠다. 이 스킬은 틀이 아니라 목소리다.

---

## When to Activate

- 블로그 글 초안/리라이팅/폴리싱 요청
- `Resource/blog/` 아래 글 손볼 때

---

## Voice (지킬 것)

### 톤
- **담담한 로그/기록식.** 자랑, 쇼케이스, 세일즈, 감탄 유도 배제.
- **존댓말 설명형:** `~했습니다`, `~입니다`, `~돌아갑니다`, `~두었습니다`. 반말 로그체(`~했다`, `~돈다`) 쓰지 않는다.
- 과장 형용사·감탄사·수사 배제.

### 문장 감각
- 한 문장 = 한 줄, 문장 사이 빈 줄로 호흡.
- 단답식 전보체(한 줄씩 툭툭 끊기)와 장황한 복문 모두 피한다.
- 핵심 단어에 `**볼드**` 강조.
- 괄호 아사이드 허용 — (리눅스를 잘 몰랐던 시절이었습니다.)
- `> blockquote`로 용어/부연 설명 가능.
- 마무리에 `!!` 한 번 정도 OK (과용 금지).

### 개인정보 필터
공개 블로그이므로 유저별 고유 파일(`MEMORY.md`, `portfolio.md`, `COMMANDS.md`, `blog/`, `client_secret.json`, `.env` 등) 노출 금지. 워크스페이스 구조를 보여줄 땐 공통 뼈대만.

---

## Structure

구조는 주제가 정한다. 참고 패턴 몇 개만 두지만, **억지로 맞추지 않는다**:

- 가벼운 도입이 어울리면 `## 들어가기에 앞서`
- 트러블슈팅 성격이면 `### 문제 직면 / ### 문제 해결`
- 회고면 `## Keep / ## Problem / ## Try`
- 외부 인용 있으면 `## 참고 링크`

주제가 다르면 섹션도 완전히 다르게 짠다.

---

## Frontmatter

```yaml
---
title: "글 제목"
date: YYYY-MM-DD
tags: [태그1, 태그2]
description: 한 줄 요약 (RSS/SEO용)
---
```

## HTML 블록

옵시디언 마크다운 안에 inline CSS HTML 블록 삽입 가능. 팔레트: `#7c3aed` · `#06b6d4` · `#f97316` · `#22c55e`. 다크모드 대응은 `var(--bg-secondary)`, `var(--border)`, `var(--text)` 등 테마 토큰 우선.

---

## Workflow

1. 주제/의도 짧게 확인
2. 초안은 `.omc/drafts/<slug>-vN.md`에 저장 (덮어쓰지 않기)
3. 경로 + 주요 포인트 3~5줄 요약을 텔레그램 reply로 보고
4. 피드백 반영 시 v번호 올려 새 파일로 저장
5. 확정되면 `Resource/blog/<category>/<제목>.md`로 복사 + `chown jongdeug:gpio`
6. 배포는 `/deploy` 스킬 또는 `node build.js`

---

## Banned Patterns

- "오늘날 빠르게 변화하는...", "혁신적인", "게임 체인저", "놀라운"
- "이 글에서는 X를 설명합니다" 같은 AI식 프리앰블
- "제 강점은...", "포트폴리오로서의 의미는..." 같은 자기 세일즈
- "완전", "모든", "최고의" 같은 과장 수식
- 가짜 취약성 서사, 기능 나열형 자랑

---

## Quality Gate

- [ ] frontmatter 4필드 (title/date/tags/description)
- [ ] 담담한 톤 (자랑/쇼케이스/감탄 없음)
- [ ] 존댓말 설명형 종결
- [ ] 문장 호흡 유지 (전보체도 장문도 아님)
- [ ] 개인정보 파일 노출 없음

---

## References

- 톤 참고: `Resource/blog/회고/개발자 첫 회고.md`, `Resource/blog/트러블슈팅/*.md`, `Resource/blog/AI/My Pi Stack.md`
- 블로그 엔진: `~/.claude/channels/telegram/jongdeug/blog/`
- 배포: `/deploy`
