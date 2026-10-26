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

훅은 로컬 개발 보조 장치이며 사용자가 우회할 수 있습니다. 새 untracked 파일을 격리하거나 원격 CI를 강제하지 않습니다. 원격 배포의 접근 제어는 아래 별도 항목으로 검증하며, 커밋 게이트 통과를 배포 완료로 간주하지 않습니다.

실제 훅과 검사 설정을 복사한 임시 Git 저장소에 Husky를 설치하여 다음을 확인했습니다. 사용자 저장소의 index와 커밋은 변경하지 않았습니다.

- 스테이징한 `any` 타입 오류를 작업 트리에서만 고쳐도 실제 ESLint가 커밋을 차단했습니다. 실패 후 HEAD·index·작업 트리 내용이 유지되고 임시 stash가 정리되었습니다.
- 포맷 오류가 있는 파일도 실제 Prettier 검사에서 커밋이 차단되었으며, HEAD·index·작업 트리가 유지되었습니다. 두 검증 모두 도구 대역 없이 실행했습니다.
- 삭제만 스테이징하는 회귀 검증도 추가했습니다. 임시 앱의 모든 테스트 파일을 삭제한 커밋은 lint·포맷·타입 검사를 거친 뒤 Vitest의 `No test files found`로 차단되었고, HEAD·index·작업 트리가 유지되었습니다.

## 실제 API 검증 환경

사용 중인 8000번 서버의 데이터를 변경하지 않도록 별도 SQLite 파일과 8001번 API를 사용합니다. QA 프론트는 3001번과 `.next-qa`를 사용합니다.

```sh
# backend 폴더
env -u DATABASE_URL -u KANBAN_DATABASE_URL -u TTODO_API_TOKEN \
  TODO_DB_PATH=/tmp/team-todo-qa.sqlite \
  TTODO_CORS_ORIGINS=http://localhost:3001,http://127.0.0.1:3001 \
  uv run uvicorn app.main:app --host 127.0.0.1 --port 8001

# frontend 폴더, 다른 터미널
NEXT_DIST_DIR=.next-qa NEXT_PUBLIC_API_BASE_URL= \
TTODO_BASE_URL=http://127.0.0.1:8001 TTODO_API_TOKEN= \
npm run dev -- --port 3001
```

일반 Todo는 기본적으로 같은 출처의 Next.js `/api/v1/tasks` 프록시를 사용합니다. `TTODO_BASE_URL`과 `TTODO_API_TOKEN`은 일반 Todo·칸반이 함께 사용하는 서버 전용 설정이며, 브라우저에 전달하지 않습니다. 위 명령은 무토큰 격리 환경입니다. FE-013의 인증 확인에서는 일회용 토큰을 백엔드와 프론트 서버 환경에 동일하게 설정하고 브라우저 비노출을 확인합니다.

직접 연결 호환성을 확인할 때만 `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001`로 프론트를 재시작합니다. 이 설정은 일반 Todo의 프록시를 우회하며 서버 토큰을 보내지 않습니다. 무토큰 테스트 백엔드와 CORS 허용 주소가 필요합니다. 종료 후 공개 주소 재정의를 비우고 기본 프록시로 복원합니다. QA 종료 후 기본 환경에서 `npm run check`를 실행해 산출물을 확인합니다. 실행 사실과 미실행 수동 항목은 `docs/VERIFICATION.md`에 구분합니다.

## 일반 Todo 프록시 검증

- FE-013: 목록·생성·상세·수정·삭제·휴지통·복구의 7개 동작, 서버 토큰 전달과 브라우저 비노출, 토큰 없는 로컬 환경, 선택적 직접 연결을 구분합니다.
- FE-004: 반복 `status`, 날짜·페이지 쿼리, `include_completed=false`를 보존합니다. 휴지통에는 `limit`, `offset`만 전달합니다.
- FE-005·006: DELETE와 복구 POST에 JSON 본문·Content-Type을 강제하지 않습니다.
- FE-008·009: 브라우저 연결 실패뿐 아니라 프록시가 돌려주는 JSON `502`와 쓰기 `5xx`도 확인합니다. 생성·수정·삭제·복구는 재요청 전에 저장된 현재 상태를 조회하도록 안내하고 자동 재전송하지 않습니다.
- 프록시 테스트는 허용 경로·메서드·숫자 ID, 다른 출처 쓰기 차단, 요청·응답 헤더 분리, 캐시 비활성화, 내부 오류 비노출을 확인합니다. 모의 테스트 결과를 실제 원격 DB 저장 확인으로 대신하지 않습니다.

## 칸반 검증 구분

- `FE-KB-*`는 공유 칸반 시나리오입니다. 클라이언트 런타임 계약, 전체 페이지 조회, 등록·상태 이동, 실패 보존과 중복 요청 차단을 단위·컴포넌트 테스트로 검사합니다.
- Next.js 프록시 테스트는 서버 토큰 전달, 고정 경로, 교차 사이트 쓰기 거부, 캐시 비활성화, 내부 오류 비노출을 확인합니다.
- 백엔드의 `tests/test_kanban_api.py`는 `TEST_KANBAN_DATABASE_URL`에 지정한 **격리 PostgreSQL**을 초기화합니다. 실제 Supabase 접속 문자열을 테스트 변수에 넣지 않습니다.
- 실제 UI 검증에는 격리 PostgreSQL을 사용하는 8001번 API와 `TTODO_BASE_URL=http://127.0.0.1:8001`로 설정한 3001번 프론트를 사용합니다. 기존 일반 Todo용 SQLite와 구분합니다.
- 실제 팀 공유 검증은 별도 단계입니다. 팀 보드에 실제 업무를 등록하고 다른 브라우저에서 조회하며, 상태 변경 후 새로고침으로 저장을 확인합니다. 연결 정보가 없거나 권한이 없으면 미완료로 기록합니다.

## 원격 배포 접근 제어 — 적용 확인, 수동 검증 잔여

2026-10-26 프론트·백엔드의 Vercel READY와 프론트 **All Deployments + Vercel Authentication** 적용을 확인했습니다. Vercel API 재조회에서 `ssoProtection.deploymentType=all`이었고, 비인증 HTTP의 `/kanban`·`/api/v1/tasks`·`/api/kanban/tasks`는 모두 `vercel.com/sso-api`로 302 전환했습니다. 소유자 계정으로 로그인한 Chrome에서 앱 로드도 확인했습니다. 프록시의 서버 토큰 비공개·출처 검사는 방문자 인증을 대신하지 않습니다.

백엔드는 Python 3.13에서 `/openapi.json` 200, 무토큰 API 401을 확인했습니다. 사용자 SQL 실행 뒤 새 칸반 DB 연결의 인증·최소 UPDATE 권한을 확인하고 Production에 반영했습니다. 인증된 백엔드와 Vercel CLI로 인증한 프론트 프록시의 칸반 GET은 200입니다. CLI 등록 요청이 5초 제한으로 종료된 경우에는 재등록하지 않고 GET으로 업무 #13의 저장을 확인했습니다. 같은 업무의 프론트 프록시 PATCH로 진행 중 → 완료 → 진행 중 이동도 각 200·요청 상태 일치를 확인했습니다. 일반 Todo는 별도 `DATABASE_URL` 미설정으로 503입니다. 연결 후 브라우저 UI·두 브라우저 공유·실제 드래그·영상은 아직 확인하지 않았습니다. HTTP 302를 비인증 브라우저의 production·preview 전체 수동 시나리오 통과로 대신하지 않습니다.

최신 자동 검사는 프론트 **185개**, 백엔드 **52개**, CLI **51개** 통과입니다. 배포 주소, 과거 격리 QA와 현재 확인 범위는 [VERIFICATION.md](VERIFICATION.md)에 구분합니다.

## 설정 근거

- [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint)
- [TypeScript ESLint configurations](https://typescript-eslint.io/users/configs/)
- [Vitest matcher 확장](https://vitest.dev/guide/extending-matchers)
- [lint-staged 옵션](https://github.com/lint-staged/lint-staged#command-line-flags)
- [Husky 시작](https://typicode.github.io/husky/get-started.html)
