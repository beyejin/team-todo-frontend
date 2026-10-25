# 디자인 원본과 테마 대응

2026-10-26 수업 예제의 `docs/DESIGN-productivity.md`, `docs/DESIGN-warm.md`를 원문 그대로 보존했습니다.

- [Productivity 원본](https://github.com/Gachon-Cocone-School/team-todo-front-codex/blob/main/docs/DESIGN-productivity.md)
- [Warm 원본](https://github.com/Gachon-Cocone-School/team-todo-front-codex/blob/main/docs/DESIGN-warm.md)

원문 안에서 YAML과 설명 본문의 값이 충돌하면 YAML을 우선합니다. 공통 구조·접근성·반응형 동작은 Astryx 컴포넌트를 사용합니다.

| 역할             | Productivity      | Warm              | Astryx 토큰                  |
| ---------------- | ----------------- | ----------------- | ---------------------------- |
| 강조색           | `#3525cd`         | `#903f00`         | `--color-accent`             |
| 화면 바탕        | `#f8f9ff`         | `#fff8f5`         | `--color-background-body`    |
| 표면             | `#ffffff`         | `#ffffff`         | `--color-background-surface` |
| 보조 표면        | `#eff4ff`         | `#fcf2eb`         | `--color-background-muted`   |
| 기본 글자        | `#0b1c30`         | `#1f1b17`         | `--color-text-primary`       |
| 보조 글자        | `#464555`         | `#564338`         | `--color-text-secondary`     |
| 경계             | `#c7c4d8`         | `#ddc1b3`         | `--color-border`             |
| 본문 글꼴        | Inter             | Plus Jakarta Sans | typography.body              |
| 제목 글꼴        | Plus Jakarta Sans | Epilogue          | typography.heading           |
| 기본 컨트롤 높이 | 36px              | 40px              | `--size-element-md`          |
| 제목 굵기        | 700               | 600               | `--text-heading-1-weight`    |

Warm은 중간 간격을 넓혀 여유를 줍니다. 한국어는 Apple SD Gothic Neo, Noto Sans KR, 시스템 sans-serif로 대체합니다. 라틴 글꼴은 Fontsource variable 패키지로 앱에 포함해 외부 Google Fonts 요청에 의존하지 않습니다.

테마 원본은 `src/themes/*.theme.ts`이고 아래 명령으로 CSS·런타임 정의를 생성합니다. 생성물은 직접 수정하지 않습니다.

```sh
npx astryx theme build src/themes/productivity.theme.ts --out src/themes/generated/productivity.css
npx astryx theme build src/themes/warm.theme.ts --out src/themes/generated/warm.css
```

[Fontsource variable fonts](https://fontsource.org/docs/getting-started/variable)의 패키지 이름·CSS family를 따릅니다. `Variable` 접미사는 실제 제공되는 폰트 family 이름이며 원본 글꼴의 다른 디자인이 아닙니다.
