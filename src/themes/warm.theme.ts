import { defineTheme } from "@astryxdesign/core/theme";

export default defineTheme({
  name: "warm",
  color: { accent: "#903f00", neutralStyle: "warm" },
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
    "--color-background-body": "#fff8f5",
    "--color-background-surface": "#ffffff",
    "--color-background-muted": "#fcf2eb",
    "--color-text-primary": "#1f1b17",
    "--color-text-secondary": "#564338",
    "--color-accent": "#903f00",
    "--color-border": "#ddc1b3",
    "--radius-element": "8px",
    "--radius-container": "16px",
    "--radius-page": "24px",
    "--text-heading-1-size": "32px",
    "--text-heading-1-weight": "600",
    "--spacing-4": "20px",
    "--spacing-6": "32px",
    "--size-element-md": "40px",
  },
});
