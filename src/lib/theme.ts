export type ThemeName = "productivity" | "warm";
export const THEME_COOKIE = "team-todo-theme";

/** Only supported cookie values may select a theme. */
export function parseTheme(value: string | undefined): ThemeName {
  return value === "warm" ? "warm" : "productivity";
}
