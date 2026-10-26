# 디자인 원본과 테마 대응

2026-10-26 수업 예제의 `docs/DESIGN-productivity.md`, `docs/DESIGN-warm.md`를 원문 그대로 보존했습니다.

- [Productivity 원본](https://github.com/Gachon-Cocone-School/team-todo-front-codex/blob/main/docs/DESIGN-productivity.md)
- [Warm 원본](https://github.com/Gachon-Cocone-School/team-todo-front-codex/blob/main/docs/DESIGN-warm.md)

원문 안에서 YAML과 설명 본문의 값이 충돌하면 YAML을 우선합니다. 다만 2026-10-26 사용자의 디자인 수정 요청에 따라 실제 앱의 팔레트·제목 크기·모서리와 화면 밀도는 아래 값으로 조정했습니다. Productivity의 조밀한 작업 화면, Warm의 따뜻한 표면과 여유 있는 간격이라는 원래 방향은 유지하고 원본 문서는 수정하지 않습니다. 공통 구조·접근성·반응형 동작은 Astryx 컴포넌트를 사용합니다.

| 역할             | Productivity      | Warm              | Astryx 토큰                  |
| ---------------- | ----------------- | ----------------- | ---------------------------- |
| 강조색           | `#315b60`         | `#7b6044`         | `--color-accent`             |
| 화면 바탕        | `#f7f8f9`         | `#f7f3eb`         | `--color-background-body`    |
| 표면             | `#ffffff`         | `#fffdf8`         | `--color-background-surface` |
| 카드 표면        | `#ffffff`         | `#fffdf8`         | `--color-background-card`    |
| 팝오버 표면      | `#ffffff`         | `#fffdf8`         | `--color-background-popover` |
| 보조 표면        | `#eef1f2`         | `#eee8dd`         | `--color-background-muted`   |
| 기본 글자        | `#202b31`         | `#302b25`         | `--color-text-primary`       |
| 보조 글자        | `#58646c`         | `#6b6258`         | `--color-text-secondary`     |
| 경계             | `#d8dfe2`         | `#ded5c7`         | `--color-border`             |
| 본문 글꼴        | Inter             | Plus Jakarta Sans | typography.body              |
| 제목 글꼴        | Plus Jakarta Sans | Epilogue          | typography.heading           |
| 기본 컨트롤 높이 | 36px              | 40px              | `--size-element-md`          |
| 제목 크기        | 28px              | 28px              | `--text-heading-1-size`      |
| 제목 굵기        | 650               | 600               | `--text-heading-1-weight`    |
| 컨트롤 모서리    | 6px               | 8px               | `--radius-element`           |
| 컨테이너 모서리  | 10px              | 12px              | `--radius-container`         |
| 페이지 모서리    | 12px              | 16px              | `--radius-page`              |

Productivity는 회색 바탕과 짙은 청록색, Warm은 크림 바탕과 차분한 갈색을 사용합니다. 카드와 팝오버는 기본 표면과 같은 색을 사용해 CLI가 만든 강조색 계열의 바탕을 줄였습니다. 큰 제목과 둥근 외곽선을 줄여 실제 작업 내용에 집중하도록 조정했습니다. Warm의 중간 간격(`--spacing-4: 20px`, `--spacing-6: 32px`)은 유지합니다. 한국어는 Apple SD Gothic Neo, Noto Sans KR, 시스템 sans-serif로 대체합니다. 라틴 글꼴은 Fontsource variable 패키지로 앱에 포함해 외부 Google Fonts 요청에 의존하지 않습니다.

테마 원본은 `src/themes/*.theme.ts`이고 아래 명령으로 CSS·런타임 정의를 생성합니다. 생성물은 직접 수정하지 않습니다.

```sh
npx astryx theme build src/themes/productivity.theme.ts --out src/themes/generated/productivity.css
npx astryx theme build src/themes/warm.theme.ts --out src/themes/generated/warm.css
```

[Fontsource variable fonts](https://fontsource.org/docs/getting-started/variable)의 패키지 이름·CSS family를 따릅니다. `Variable` 접미사는 실제 제공되는 폰트 family 이름이며 원본 글꼴의 다른 디자인이 아닙니다.
