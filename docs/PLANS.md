# Plans Guide

실행 계획(Execution Plan) 작성 및 관리 가이드.

## 실행 계획이란

기능 개발이나 기술적 변경을 시작하기 전에 작성하는 구체적인 실행 문서다.
"무엇을 할지"가 아니라 "어떻게 할지"에 초점을 맞춘다.

## 작성 시점

- 2일 이상 걸릴 것으로 예상되는 작업
- 여러 시스템/모듈에 걸치는 변경
- 되돌리기 어려운 변경 (DB 마이그레이션, API 변경 등)

## 템플릿

```markdown
# [제목]

- 상태: Draft / In Progress / Completed
- 시작일: YYYY-MM-DD
- 예상 완료: YYYY-MM-DD

## 목표

(한 문장으로)

## 배경

(왜 이 작업이 필요한가)

## 실행 단계

- [ ] Step 1: ...
- [ ] Step 2: ...
- [ ] Step 3: ...

## 리스크 & 롤백 계획

(무엇이 잘못될 수 있고, 어떻게 되돌릴 것인가)

## 완료 조건

(무엇이 되면 이 작업이 "끝난" 것인가)
```

## 파일 위치

- 진행 중: `exec-plans/active/`
- 완료: `exec-plans/completed/`
- 기술 부채: `exec-plans/tech-debt-tracker.md`
