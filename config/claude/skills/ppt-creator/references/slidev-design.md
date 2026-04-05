# Slidev Design Reference

## 파일 구조

Slidev는 단일 `.md` 파일로 전체 프레젠테이션을 정의.  
슬라이드는 `---`로 구분.

```markdown
---
theme: seriph          # 테마 (seriph | default)
background: https://... # 배경 이미지 (선택)
class: text-center
highlighter: shiki     # 코드 하이라이터
lineNumbers: false
info: |
  발표 설명 (메타)
transition: slide-left  # 기본 전환 효과
title: 발표 제목
---

# 첫 번째 슬라이드 제목

내용

---

# 두 번째 슬라이드

내용
```

---

## 테마 선택

| theme | 특징 | 추천 상황 |
|-------|------|---------|
| `seriph` | 세련된 serif 폰트, 클래식 | 기술 발표, 컨퍼런스 |
| `default` | 깔끔한 미니멀 | 팀 내부 공유 |

커스텀 배경색은 frontmatter의 `background` 또는 개별 슬라이드에 `class` 사용.

---

## 슬라이드 레이아웃

```markdown
---
layout: cover          # 표지
---

---
layout: section       # 섹션 구분
---

---
layout: two-cols      # 두 열
---

왼쪽 내용

::right::

오른쪽 내용

---
layout: center        # 중앙 정렬
class: text-center
---

---
layout: quote         # 인용구
---

---
layout: end           # 마무리
---
```

---

## 코드 블록 (핵심 기능)

### 기본
````markdown
```typescript
const x: number = 42
```
````

### 특정 라인 하이라이트
````markdown
```typescript {2,4-6}
function hello() {        // 일반
  console.log('hi')       // 강조
  return true             // 일반
}                         // 강조
```
````

### 클릭할 때마다 라인 순서대로 강조 (스텝 애니메이션)
````markdown
```typescript {1|3|5}
// Step 1: 이 줄
const a = 1
// Step 2: 이 줄
const b = 2
// Step 3: 이 줄
```
````

---

## 애니메이션 (v-click)

```markdown
# 슬라이드 제목

- 처음부터 보이는 항목

<v-click>

- 클릭 후 나타나는 항목

</v-click>

<v-click>

- 또 클릭 후 나타나는 항목

</v-click>
```

또는 간단하게:
```markdown
<v-clicks>

- 항목 1
- 항목 2
- 항목 3

</v-clicks>
```

---

## 발표자 노트

슬라이드 내용 아래 `<!--` 주석으로 작성:

```markdown
# 슬라이드 제목

내용

<!--
발표자 노트: 이 슬라이드에서 강조할 점...
청중에게 물어볼 질문: ...
-->
```

---

## 두 열 레이아웃

```markdown
---
layout: two-cols
---

# 제목

::left::

**왼쪽**
- 항목 1
- 항목 2

::right::

**오른쪽**
- 항목 A
- 항목 B
```

---

## 이미지 삽입

```markdown
<img src="/path/to/image.png" class="mx-auto w-120 rounded shadow" />
```

또는 배경으로:
```markdown
---
background: /path/to/image.png
class: text-white
---
```

---

## 전환 효과

슬라이드별 또는 전역 설정:
```
transition: fade          # 페이드
transition: slide-left    # 왼쪽으로 슬라이드
transition: slide-up      # 위로 슬라이드
transition: none          # 없음
```

---

## 권장 구성 패턴

### 기술 발표 (dark 계열)
```markdown
---
theme: seriph
colorSchema: dark
transition: slide-left
---
# 제목
---
layout: section
---
# 섹션 1
---
# 내용 슬라이드
<v-clicks>
- 항목 1
- 항목 2
</v-clicks>
---
# 코드 예시
```ts {1|3-5}
// 단계별 강조
```
---
layout: end
---
# 감사합니다
```

---

## 출력

- `bash create_slidev.sh slides.md <output-dir>` → `<output-dir>/index.html`
- 브라우저에서 바로 열림 (오프라인 가능)
- Obsidian 저장 시: `.html` 확장자로 저장 (External Browser로 열기)
