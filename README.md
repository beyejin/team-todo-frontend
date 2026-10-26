# 팀 Todo 프론트엔드

Next.js와 React로 일반 Todo와 팀 공유 칸반을 사용하는 프론트엔드입니다. `/kanban`에서
할 일·진행 중·완료 컬럼을 보고 업무를 등록하거나 드래그·상태 버튼으로 옮깁니다.
기존 Todo의 수정·휴지통·복구와 Productivity/Warm 테마는 그대로 제공합니다. 기능 범위와 완료 기준은
[plan.md](docs/plan.md), 사용자가 브라우저에서 확인할 시나리오는
[TEST_CASE.md](docs/TEST_CASE.md)를 따릅니다.

## 준비와 실행

- Node.js 24 이상, npm
- 별도 `team-todo-backend` 서버: `http://127.0.0.1:8000`
- 로컬 무인증 사용 시 백엔드에 `TTODO_API_TOKEN`을 설정하지 않습니다.

```console
npm ci
cp .env.example .env.local
npm run dev
```

개발 화면은 `http://127.0.0.1:3000`에서 엽니다. 개발 서버는 로컬 주소에만 바인딩합니다.
백엔드와 같은 컴퓨터의 브라우저에서 사용하는 구성이며 외부 배포를 완료한 상태를 뜻하지 않습니다.

별도 터미널에서 백엔드를 실행합니다.

```console
cd ../team-todo-backend
uv sync --locked
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

`.env.local`의 `NEXT_PUBLIC_API_BASE_URL`은 브라우저에 공개되는 API 주소입니다.
비밀번호나 토큰을 넣지 않습니다. 값을 바꾸면 개발 서버를 재시작하고, 운영용 빌드는 다시 만듭니다.
브라우저가 백엔드에 직접 요청하므로 프론트 주소가 달라지면 백엔드 CORS 허용 주소도 맞춰야 합니다.

## 팀 공유 칸반 연결

```text
브라우저 /kanban → Next.js /api/kanban/tasks → FastAPI /api/v1/kanban/tasks → Supabase
```

일반 Todo와 공유 칸반은 서로 다른 저장소입니다. 칸반은 기존 팀 보드의 `issues`, `board_items`를 사용합니다.
로컬 저장소나 가짜 데이터로 공유 저장 성공을 대신하지 않습니다.

| 위치                | 환경 변수                                    | 용도                                           |
| ------------------- | -------------------------------------------- | ---------------------------------------------- |
| 프론트 `.env.local` | `NEXT_PUBLIC_API_BASE_URL`                   | 일반 Todo 브라우저용 API 주소                  |
| 프론트 `.env.local` | `TTODO_BASE_URL`                             | 칸반 백엔드 주소, 기본 `http://127.0.0.1:8000` |
| 프론트 `.env.local` | `TTODO_API_TOKEN`                            | 백엔드가 인증을 요구할 때 서버에서만 전달      |
| 백엔드 환경 변수    | `KANBAN_DATABASE_URL`                        | 기존 Supabase PostgreSQL 접속 문자열           |
| 백엔드 환경 변수    | `KANBAN_BOARD_ID`, `KANBAN_ACTOR_PROFILE_ID` | 실제 보드와 workspace 멤버 UUID                |

백엔드에 접속 정보를 안전하게 설정한 뒤 실행합니다. `.env`에 저장했다면 `uv run --env-file .env uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`로 로드할 수 있습니다.
DB 비밀번호·토큰은 커밋하거나 `NEXT_PUBLIC_` 변수에 넣지 않습니다. 프론트에는 DB 비밀번호가 필요 없습니다.
프록시는 허용된 칸반 경로만 전달하고 조회를 캐시하지 않습니다. 토큰 없는 로컬 개발과 토큰이 있는 공유 백엔드를 모두 지원합니다.

현재 UI는 등록·조회·상태 변경을 제공합니다. 내용 수정·삭제·복구·컬럼 내부 순서 편집은 제공하지 않습니다.
상태 이동에는 백엔드 `feat/supabase-connection` 브랜치의 `PATCH /api/v1/kanban/tasks/{UUID}`와 DB 계정의 최소 수정 권한이 필요합니다.
필요 변경은 [KANBAN_API_CHANGES.md](docs/KANBAN_API_CHANGES.md)에 정리했습니다.
로그인 없이 실행하는 로컬 수업 데모 구성입니다. 프론트 서버를 공개 배포할 때는 사용자 접근 제어를 별도로 적용해야 합니다.

실제 연결·검사 완료 여부는 [VERIFICATION.md](docs/VERIFICATION.md), 3분 발표 흐름은
[presentation.md](docs/presentation.md)를 확인합니다. 화면 구현 완료와 실제 공유 보드 연결 완료를 구분합니다.

## 자동 검사와 수동 확인

```console
npm run check
```

`scripts/verify.sh`가 ESLint, Prettier 검사, TypeScript 검사, Vitest, 프로덕션 빌드를 순서대로
실행합니다. 하나라도 실패하면 이후 단계를 진행하지 않습니다. Vitest 테스트 파일이 없으면 실패합니다.

| 명령                   | 역할                                                                         |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run lint`         | Next.js Core Web Vitals와 TypeScript 타입 기반 strict 규칙 검사. 경고도 실패 |
| `npm run format:check` | 파일을 바꾸지 않고 Prettier 형식 검사                                        |
| `npm run format`       | 포맷 적용. 변경 diff를 검토한 뒤 필요한 파일을 스테이징                      |
| `npm run typecheck`    | Next.js 경로 타입 생성 후 strict TypeScript 검사                             |
| `npm run test`         | Vitest 단위·컴포넌트 테스트를 한 번 실행                                     |
| `npm run test:watch`   | 개발 중 관련 테스트 재실행                                                   |
| `npm run build`        | 프로덕션 빌드                                                                |
| `npm run start`        | 빌드 결과를 로컬에서 실행                                                    |

Playwright E2E는 사용하지 않습니다. JSDOM 테스트의 `matchMedia`·`ResizeObserver`, 모달·스크롤
메서드 대역은 실제 레이아웃, 포커스 가두기나 모바일 동작을 검증하지 않습니다. 두 테마, 375px·1440px 화면, 키보드 조작과
실제 API 저장 결과는 테스트 문서의 수동 시나리오로 별도 확인합니다.

## 커밋 전 검사

Git 저장소에서 `npm ci`를 실행하면 `prepare` 스크립트의 Husky가 훅을 설치합니다.
일반 커밋은 lint-staged를 통해 스테이징된 상태에서 전체 검사를 실행합니다. 파일 삭제만 포함된
커밋도 검사하며, Prettier 검사는 `scripts/verify.sh` 안에서 실행합니다.
추적 파일의 스테이징하지 않은 변경은 검사 중 임시로 숨기므로, 커밋할 오류를 작업 트리에서만
고친 상태로 통과하지 않게 합니다. 검사 중 추적 파일이 바뀌면 커밋을 실패시키며 자동 포맷하지 않습니다.

새 파일은 커밋 대상에 직접 포함해야 합니다. untracked 파일까지 격리하는 설정은 아니며,
로컬 훅을 우회할 수 없는 서버 측 필수 검사나 원격 CI를 설정했다는 뜻도 아닙니다.

## 디자인과 작업 기준

- Astryx의 공식 CLI로 컴포넌트·레이아웃·테마 API를 확인한 뒤 사용합니다.
- 생성한 테마 출력은 `src/themes/generated/`에 두며 직접 편집하지 않습니다. 원본 테마 코드는 검사합니다.
- 공통 규칙과 개발 루프는 [AGENTS.md](AGENTS.md), 세부 검증 설명은 [HARNESS.md](docs/HARNESS.md)를 따릅니다.

설정 근거: [Next.js ESLint](https://nextjs.org/docs/app/api-reference/config/eslint),
[타입 기반 lint](https://typescript-eslint.io/getting-started/typed-linting/),
[Next.js Vitest](https://nextjs.org/docs/app/guides/testing/vitest).
