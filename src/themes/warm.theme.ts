import { defineTheme } from "@astryxdesign/core/theme";

export default defineTheme({
  name: "warm",
  color: { accent: "#7b6044", neutralStyle: "warm" },
  typography: {
    body: {
      family: "Plus Jakarta Sans Variable",
      fallbacks: '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
    },
    heading: {
      family: "Epilogue Variable",
      fallbacks: '"Apple SD Gothic Neo", sans-serif',
    },
  },
  tokens: {
    "--color-background-body": "#f7f3eb",
    "--color-background-surface": "#fffdf8",
    "--color-background-card": "#fffdf8",
    "--color-background-popover": "#fffdf8",
    "--color-background-muted": "#eee8dd",
    "--color-text-primary": "#302b25",
    "--color-text-secondary": "#6b6258",
    "--color-accent": "#7b6044",
    "--color-border": "#ded5c7",
    "--radius-element": "8px",
    "--radius-container": "12px",
    "--radius-page": "16px",
    "--text-heading-1-size": "28px",
    "--text-heading-1-weight": "600",
    "--spacing-4": "20px",
    "--spacing-6": "32px",
    "--size-element-md": "40px",
  },
});
