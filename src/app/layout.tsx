import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";
import "@/themes/generated/productivity.css";
import "@/themes/generated/warm.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "@fontsource-variable/epilogue";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationGuardProvider } from "@/components/navigation-guard";
import { WorkspaceShell } from "@/components/app-shell";
import { parseTheme, THEME_COOKIE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Team Todo · 함께하는 할 일",
  description: "팀의 할 일을 만들고, 나누고, 완료하세요.",
};

/** Read the theme on the server to avoid a different first paint. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const store = await cookies();
  return (
    <html lang="ko">
      <body>
        <ThemeProvider initialTheme={parseTheme(store.get(THEME_COOKIE)?.value)}>
          <NavigationGuardProvider>
            <WorkspaceShell>{children}</WorkspaceShell>
          </NavigationGuardProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
