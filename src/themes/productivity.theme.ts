import { defineTheme } from "@astryxdesign/core/theme";

export default defineTheme({
  name: "productivity",
  color: { accent: "#315b60", neutralStyle: "cool" },
  typography: {
    body: {
      family: "Inter Variable",
      fallbacks: '"Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
    },
    heading: {
      family: "Plus Jakarta Sans Variable",
      fallbacks: '"Apple SD Gothic Neo", sans-serif',
    },
  },
  tokens: {
    "--color-background-body": "#f7f8f9",
    "--color-background-surface": "#ffffff",
    "--color-background-card": "#ffffff",
    "--color-background-popover": "#ffffff",
    "--color-background-muted": "#eef1f2",
    "--color-text-primary": "#202b31",
    "--color-text-secondary": "#58646c",
    "--color-accent": "#315b60",
    "--color-border": "#d8dfe2",
    "--radius-element": "6px",
    "--radius-container": "10px",
    "--radius-page": "12px",
    "--text-heading-1-size": "28px",
    "--text-heading-1-weight": "650",
    "--size-element-md": "36px",
  },
});
