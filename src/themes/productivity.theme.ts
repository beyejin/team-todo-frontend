import { defineTheme } from "@astryxdesign/core/theme";

export default defineTheme({
  name: "productivity",
  color: { accent: "#3525cd", neutralStyle: "cool" },
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
    "--color-background-body": "#f8f9ff",
    "--color-background-surface": "#ffffff",
    "--color-background-muted": "#eff4ff",
    "--color-text-primary": "#0b1c30",
    "--color-text-secondary": "#464555",
    "--color-accent": "#3525cd",
    "--color-border": "#c7c4d8",
    "--radius-element": "8px",
    "--radius-container": "16px",
    "--radius-page": "24px",
    "--text-heading-1-size": "32px",
    "--text-heading-1-weight": "700",
    "--size-element-md": "36px",
  },
});
