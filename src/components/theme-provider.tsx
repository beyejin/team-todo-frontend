"use client";

import { Theme } from "@astryxdesign/core/theme";
import { InternationalizationProvider } from "@astryxdesign/core/i18n";
import koKR from "@astryxdesign/core/locales/ko-KR.generated.js";
import { createContext, useContext, useState, type ReactNode } from "react";
import { THEME_COOKIE, type ThemeName } from "@/lib/theme";
import { productivityTheme as productivity } from "@/themes/generated/productivity";
import { warmTheme as warm } from "@/themes/generated/warm";

const ThemeContext = createContext<{
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
} | null>(null);
export const themes = { productivity, warm };

/** Keep the server-selected theme on the first client render. */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: ThemeName;
  children: ReactNode;
}) {
  const [theme, updateTheme] = useState(initialTheme);
  function setTheme(value: ThemeName) {
    updateTheme(value);
    try {
      document.cookie = `${THEME_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch {
      // Browser storage restrictions must not prevent the current view changing.
    }
  }
  return (
    <ThemeContext value={{ theme, setTheme }}>
      <InternationalizationProvider locale="ko-KR" messages={{ "ko-KR": koKR }}>
        <Theme theme={themes[theme]} mode="light">
          {children}
        </Theme>
      </InternationalizationProvider>
    </ThemeContext>
  );
}

/** Read the app's selected theme. */
export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeProvider가 필요합니다.");
  return context;
}
