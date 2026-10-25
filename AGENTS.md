# AGENTS.md

- 한국어 존댓말로 결과를 먼저 간결하게 설명합니다.
- 문서의 구현 계획, 자동 검사 결과, 수동 확인 결과를 구분합니다. 미실행 검사를 통과로 표시하지 않습니다.
- 패키지는 npm으로 관리하고 `package-lock.json`을 함께 유지합니다. 설치는 `npm ci`를 사용합니다.

## 구현 기준

1. 작업 전에 `docs/plan.md`, `docs/TEST_CASE.md`, 관련 API 계약을 확인합니다. 기준이 충돌하면 먼저 드러냅니다.
2. 작은 동작 하나와 관련 FE 테스트 번호를 정하고 실제 동작·실패 조건을 검증합니다.
3. 요청에 필요한 코드만 수정하고, 인접 코드 정리·불필요한 추상화·새 전역 상태 계층을 추가하지 않습니다.
4. `npm run check`를 실행합니다. 실패 원인을 수정한 뒤 최종 변경에서 다시 검증합니다.
5. 최종 diff에서 요구사항 추적, 오류 경로, 부작용, 불필요한 변경을 확인합니다.

## 타입과 오류

- TypeScript strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`를 유지합니다.
- 외부 JSON은 `unknown`에서 검증하고, `any`·무근거 타입 단언으로 API 오류를 감추지 않습니다.
- ESLint·타입 검사·빌드 실패를 무시하는 설정이나 주석을 추가하지 않습니다.
- ESLint는 코드 규칙, Prettier는 포맷을 담당합니다. 자동 포맷은 커밋 과정과 분리하고 diff를 확인합니다.
- `NEXT_PUBLIC_` 환경 변수에는 공개 API 주소만 저장하고 비밀값을 넣지 않습니다.

## Astryx 사용

- 상위 `AGENTS.md`의 Astryx 지침을 적용합니다. 설치된 버전의 `npx astryx` 문서를 읽고 API를 추측하지 않습니다.
- UI 작성 전 `npx astryx build "<화면 목적>"`, 추천 template, 사용할 component 문서를 순서대로 확인합니다.
- 앱 진입점에서 `@astryxdesign/core/reset.css`와 `@astryxdesign/core/astryx.css`를 가져옵니다.
- 레이아웃은 `AppShell`, `SideNav`와 제공 컴포넌트를 사용합니다. 레이아웃용 `div`를 추가하지 않습니다.
- 밀도 높은 데이터는 Table·List 행으로 표시합니다. 카드로 각 목록 항목을 감싸지 않습니다.
- 사용자 스타일은 컴포넌트 prop을 먼저 사용하고, 필요한 경우 토큰 기반 CSS를 사용합니다.
- 브랜드·강조색은 `astryx theme`으로 생성하며 `:root`의 `--color-*`를 직접 덮어쓰지 않습니다.
- `src/themes/generated/`는 CLI 출력입니다. 원본을 수정한 뒤 다시 생성합니다.

## 검사와 커밋

- 전체 검사: `npm run check`.
- Vitest와 Testing Library로 단위·컴포넌트 동작을 검사합니다. Playwright E2E는 추가하지 않습니다.
- 실제 API의 생성·수정·삭제·복구와 두 테마의 반응형 화면은 문서의 수동 시나리오로 별도 확인합니다.
- 커밋 전 훅은 Prettier 검사와 전체 검사를 실행합니다. 검사를 통과시키려고 훅을 우회하지 않습니다.
- 사용자 작업을 임의로 스테이징·커밋하지 않습니다. 오류를 수정한 뒤 커밋할 diff를 확인합니다.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
