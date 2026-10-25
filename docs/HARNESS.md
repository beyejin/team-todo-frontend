# 개발 루프와 품질 검사

## 실행 기준

1. `docs/plan.md`와 `docs/TEST_CASE.md`의 관련 `FE-###`를 읽고 동작 하나를 선택합니다.
2. 실제 결과나 실패 경로를 표현하는 Vitest 테스트를 작성하고 구현합니다. API JSON은 `unknown`에서 검증합니다.
3. `npm run check`로 lint → format check → strict typecheck → 단위·컴포넌트 테스트 → production build를 실행합니다.
4. 실패 원인을 수정하고 다시 검사합니다. 타입 강제 변환이나 경고 무시로 우회하지 않습니다.
5. 브라우저에서 실제 API와 모바일·키보드 동작을 확인하고 diff를 검토합니다. 최종 수정 후 검사를 다시 실행합니다.

Playwright E2E 스위트는 추가하지 않습니다. JSDOM 테스트는 서버 계약·입력 검증·상태 전이·오류 복구를 다루고 실제 레이아웃 검증을 대신하지 않습니다.

## 자동 검사

- ESLint: Next.js Core Web Vitals + typescript-eslint `strictTypeChecked`, 경고도 실패.
- TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, unused/override/return 검사. `skipLibCheck: false`.
- Prettier: 검사 단계에서 파일을 자동 수정하지 않습니다.
- Vitest: 테스트 파일이 없거나 실패하면 종료 코드가 실패합니다.
- Next.js: 개발 모드가 아닌 production build까지 완료해야 통과입니다.
- 패키지는 호환되는 정확한 버전과 `package-lock.json`으로 고정합니다. Next 플러그인의 ESLint 10 peer 미지원 때문에 ESLint 9.39.5를 사용합니다.
- Next의 dev/prod 생성 타입은 중복 전역 선언을 만들 수 있어 `.next/dev`를 생산 타입 검사에서 제외합니다. 앱 소스나 의존성 타입을 건너뛰는 설정은 아닙니다.
- jest-dom 7의 Vitest 타입 진입점과 Vitest 5의 두 제네릭 매개변수 차이는 공식 standalone matchers와 `Matchers<R, T>` 확장으로 연결합니다.

## 커밋 게이트

`npm ci`의 `prepare`가 Husky를 설치합니다. `.husky/pre-commit`은 `lint-staged --diff-filter=ACMRD --hide-unstaged --fail-on-changes`를 실행합니다. 추가·복사·수정·이름 변경뿐 아니라 삭제만 있는 커밋도 `scripts/verify.sh`의 전체 검사를 거칩니다. Prettier 검사는 이 스크립트에서 실행하므로 삭제된 파일을 직접 포맷 인자로 넘기지 않습니다. 추적 파일의 미스테이징 수정은 검사 동안 숨겼다가 복원하며 자동 포맷·자동 스테이징을 하지 않습니다.

훅은 로컬 개발 보조 장치이며 사용자가 우회할 수 있습니다. 새 untracked 파일을 격리하거나 원격 CI를 강제하지 않습니다. 수업 범위에 맞춰 원격 저장소·배포·CI 설정은 포함하지 않습니다.

실제 훅과 검사 설정을 복사한 임시 Git 저장소에 Husky를 설치하여 다음을 확인했습니다. 사용자 저장소의 index와 커밋은 변경하지 않았습니다.

- 스테이징한 `any` 타입 오류를 작업 트리에서만 고쳐도 실제 ESLint가 커밋을 차단했습니다. 실패 후 HEAD·index·작업 트리 내용이 유지되고 임시 stash가 정리되었습니다.
- 포맷 오류가 있는 파일도 실제 Prettier 검사에서 커밋이 차단되었으며, HEAD·index·작업 트리가 유지되었습니다. 두 검증 모두 도구 대역 없이 실행했습니다.
- 삭제만 스테이징하는 회귀 검증도 추가했습니다. 임시 앱의 모든 테스트 파일을 삭제한 커밋은 lint·포맷·타입 검사를 거친 뒤 Vitest의 `No test files found`로 차단되었고, HEAD·index·작업 트리가 유지되었습니다.

## 실제 API 검증 환경

사용 중인 8000번 서버의 데이터를 변경하지 않도록 별도 SQLite 파일과 8001번 API를 사용합니다. QA 프론트는 3001번과 `.next-qa`를 사용합니다.

```sh
# backend 폴더
TODO_DB_PATH=/tmp/team-todo-qa.sqlite \
TTODO_CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001 \
uv run uvicorn app.main:app --host 127.0.0.1 --port 8001

# frontend 폴더, 다른 터미널
NEXT_DIST_DIR=.next-qa NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001 \
npm run dev -- --port 3001
```

테스트 서버에는 `DATABASE_URL`, `TTODO_API_TOKEN`이 없는 로컬 환경을 사용합니다. QA 종료 후 기본 환경에서 `npm run check`를 실행해 산출물을 확인합니다. 실행 사실과 미실행 수동 항목은 `docs/VERIFICATION.md`에 구분합니다.

## 설정 근거

- [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- [TypeScript ESLint configurations](https://typescript-eslint.io/users/configs/)
- [Vitest matcher 확장](https://vitest.dev/guide/extending-matchers)
- [lint-staged 옵션](https://github.com/lint-staged/lint-staged#command-line-flags)
- [Husky 시작](https://typicode.github.io/husky/get-started.html)
