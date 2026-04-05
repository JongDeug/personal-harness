# Slide Design Reference

## Slide Types

| type | 용도 | 필수 필드 |
|------|------|-----------|
| `title` | 표지 슬라이드 | `title` |
| `section` | 챕터 구분 | `title` |
| `bullets` | 제목 + 불릿 포인트 | `title`, `bullets` |
| `code` | 제목 + 코드 블록 | `title`, `code` |
| `two_column` | 좌우 비교 레이아웃 | `title`, `left`, `right` |
| `table` | 데이터 표 | `title`, `headers`, `rows` |
| `image` | 이미지/다이어그램 | `title`, `image_path` |
| `quote` | 강조 인용구 | `quote` |
| `end` | 마무리 슬라이드 | `title` |

> **모든 슬라이드 타입**에 `"notes": "발표자 노트"` 필드 추가 가능.  
> `--script` 플래그 사용 시 노트들을 모아 `_script.md` 파일 자동 생성.

---

## Theme 선택

| theme | 적합한 상황 |
|-------|------------|
| `blue` | 기술 발표, 공식 세션 (기본값) |
| `dark` | 개발자 대상, 코드 중심 발표 |
| `light` | 밝은 환경, 프린트 고려 |

---

## bullets 작성 규칙

- 일반 불릿: 텍스트 그대로
- 하위 불릿: `"-"` 또는 `"- "` 접두사 사용
- **인라인 볼드**: `**텍스트**` 형식 사용 (실제 bold run으로 렌더링됨)

```json
"bullets": [
  "일반 불릿",
  "**강조할 키워드**가 있는 불릿",
  "- 서브 포인트 (들여쓰기 + 작은 폰트)",
  "- **서브에서도 볼드** 가능"
]
```

---

## table 구조

```json
{
  "type": "table",
  "title": "성능 비교",
  "headers": ["항목", "Before", "After"],
  "rows": [
    ["응답속도", "500ms", "**50ms**"],
    ["에러율", "5%", "0.1%"],
    ["처리량", "100 rps", "1000 rps"]
  ],
  "notes": "숫자는 프로덕션 평균 기준"
}
```

- headers 생략 시 헤더 행 없이 데이터만 표시
- 행 수가 많으면 짝수/홀수 행 색상 자동 교차

---

## image 구조

```json
{
  "type": "image",
  "title": "시스템 아키텍처",
  "image_path": "/tmp/arch.png",
  "caption": "마이크로서비스 구성도 (2026)",
  "notes": "각 서비스별 역할을 간략히 설명"
}
```

- `image_path`: 절대 경로 또는 상대 경로 모두 가능
- `caption`: 이미지 하단 설명 텍스트 (선택)
- 이미지 파일이 없으면 플레이스홀더로 대체 (오류 없이 생성 계속)
- Pillow 설치 시 원본 비율 자동 유지, 없으면 전체 영역에 삽입

---

## two_column 구조

```json
{
  "type": "two_column",
  "title": "비교 제목",
  "left": {
    "heading": "Before",
    "bullets": ["항목 1", "**문제점** 강조", "- 세부 내용"]
  },
  "right": {
    "heading": "After",
    "bullets": ["항목 1", "**개선점** 강조", "- 세부 내용"]
  },
  "notes": "before/after 차이를 설명"
}
```

---

## 권장 슬라이드 구성 패턴

### 기술 지식 공유 발표 (30~40분, ~15슬라이드)
```
title → section(개요) → bullets(배경/동기) →
section(개념1) → bullets or code →
section(개념2) → bullets or code →
two_column(비교/정리) → table(수치 정리) → end
```

### 짧은 라이트닝 토크 (5~10분, ~6슬라이드)
```
title → bullets(핵심 3가지) → code(예제) → end
```

### Before/After 비교 발표
```
title → section → two_column(문제 vs 해결) →
code(구현) → table(결과 수치) → bullets(결론) → end
```

### 팀 온보딩 자료
```
title → section(팀 소개) → bullets(우리가 하는 일) →
section(기술 스택) → two_column(백엔드 vs 프론트엔드) →
section(프로세스) → bullets(개발 흐름) → bullets(규칙/문화) →
table(주요 툴 정리) → end
```

### 회고 발표
```
title → section(이번 스프린트) → bullets(잘 된 것) →
bullets(아쉬운 것) → two_column(시도 vs 결과) →
table(지표 비교) → bullets(다음 액션) → end
```

---

## 콘텐츠 작성 원칙

- **슬라이드당 불릿 3~6개** 권장 (최대 7개)
- **코드 슬라이드**: 핵심 코드만, 30줄 이내 권장
- **테이블**: 행 5개 이하 권장 (넘으면 두 슬라이드로 분리)
- **섹션 슬라이드**: 큰 챕터 전환에만 사용 (2~3개 이상 챕터일 때)
- **제목**: 짧고 명확하게 (15자 이내 권장)
- **불릿**: 완결 문장보다 키워드/구문 중심
- **볼드 강조**: 슬라이드당 1~2개 키워드만 강조 (남용 금지)

---

## 발표 주제별 JSON 예시

### Claude Code 기능 소개
```json
{
  "title": "Claude Code 핵심 기능",
  "theme": "dark",
  "slides": [
    { "type": "title", "title": "Claude Code 핵심 기능", "subtitle": "Skills · Hooks · Sub-agents" },
    { "type": "section", "title": "Skills" },
    { "type": "bullets", "title": "Skills란?", "bullets": ["**재사용 가능한 능력 단위**", "- SKILL.md 파일로 정의", "자동 트리거 (description 매칭 기반)"], "notes": "Skills는 파일 기반으로 AI 행동을 확장하는 방식입니다" },
    { "type": "section", "title": "Sub-agents" },
    { "type": "two_column", "title": "단일 vs 병렬", "left": { "heading": "단일 에이전트", "bullets": ["순차 처리", "단순 태스크에 적합"] }, "right": { "heading": "Sub-agents", "bullets": ["**병렬 처리**", "복잡한 태스크 분산"] } },
    { "type": "end", "title": "감사합니다", "subtitle": "Q&A" }
  ]
}
```
