import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSettings } from "@/components/theme-settings";
import { parseTheme } from "@/lib/theme";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TC-FE-007 테마 설정", () => {
  it("유효하지 않은 쿠키는 기본 테마를 사용한다", () => {
    expect(parseTheme(undefined)).toBe("productivity");
    expect(parseTheme("invalid")).toBe("productivity");
    expect(parseTheme("warm")).toBe("warm");
  });
  it("선택을 즉시 적용하고 쿠키에 저장하며 다음 방문에 복원한다", () => {
    const view = render(
      <ThemeProvider initialTheme="productivity">
        <ThemeSettings />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Warm · 편안한 흐름" }));
    expect(screen.getByRole("radio", { name: "Warm · 편안한 흐름" })).toBeChecked();
    expect(document.cookie).toContain("team-todo-theme=warm");
    view.unmount();
    render(
      <ThemeProvider initialTheme="warm">
        <ThemeSettings />
      </ThemeProvider>,
    );
    expect(screen.getByRole("radio", { name: "Warm · 편안한 흐름" })).toBeChecked();
  });
  it("브라우저가 쿠키 저장을 차단해도 현재 화면은 전환한다", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {
      throw new Error("blocked");
    });
    render(
      <ThemeProvider initialTheme="productivity">
        <ThemeSettings />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Warm · 편안한 흐름" }));
    expect(screen.getByRole("status")).toHaveTextContent("현재 테마: Warm");
  });
});
