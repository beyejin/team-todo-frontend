"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const indexKey = "__teamTodoHistoryIndex";
const leaveMessage = "저장하지 않은 변경사항이 있습니다. 저장하지 않고 나가시겠어요?";

function historyRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? { ...value } : {};
}

function historyIndex(value: unknown): number | null {
  const index = historyRecord(value)[indexKey];
  return typeof index === "number" ? index : null;
}

function browserIndex(): number | null {
  if (!("navigation" in window)) return null;
  return window.navigation.currentEntry?.index ?? null;
}

function createGuard() {
  let dirty = false;
  let allowed = false;
  return {
    setDirty: (value: boolean): void => {
      dirty = value;
      if (!value) allowed = false;
    },
    shouldBlock: (): boolean => {
      return dirty && !allowed;
    },
    confirmLeave: (): boolean => {
      if (!dirty || allowed) return true;
      if (!window.confirm(leaveMessage)) return false;
      allowed = true;
      return true;
    },
    allowNavigation: (): void => {
      allowed = true;
    },
  };
}

const GuardContext = createContext<ReturnType<typeof createGuard> | null>(null);

/** Next의 history 상태를 보존하며 앱 탐색과 브라우저 이탈을 보호합니다. */
export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [guard] = useState(createGuard);

  useEffect(() => {
    const history = window.history;
    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);
    const navigation = "navigation" in window ? window.navigation : null;
    let currentIndex = browserIndex() ?? historyIndex(history.state) ?? 0;
    let restoring = false;
    let active = true;

    const push: History["pushState"] = (data: unknown, unused, url) => {
      if (!active) {
        originalPush(data, unused, url);
        return;
      }
      currentIndex += 1;
      originalPush.call(
        history,
        { ...historyRecord(data), [indexKey]: currentIndex },
        unused,
        url,
      );
    };
    const replace: History["replaceState"] = (data: unknown, unused, url) => {
      if (!active) {
        originalReplace(data, unused, url);
        return;
      }
      originalReplace.call(
        history,
        { ...historyRecord(data), [indexKey]: currentIndex },
        unused,
        url,
      );
    };
    if (!navigation) {
      originalReplace(
        { ...historyRecord(history.state), [indexKey]: currentIndex },
        "",
      );
      history.pushState = push;
      history.replaceState = replace;
    }

    function onEntryChange(event: NavigationCurrentEntryChangeEvent): void {
      // 탐색을 가로채지 않고 index만 읽어 Next의 history 래퍼와 충돌하지 않습니다.
      if (event.navigationType === "push" || event.navigationType === "replace") {
        currentIndex = browserIndex() ?? currentIndex;
      }
    }

    function onPopState(event: PopStateEvent): void {
      if (restoring) {
        restoring = false;
        event.stopImmediatePropagation();
        return;
      }
      const targetIndex = browserIndex() ?? historyIndex(event.state);
      if (targetIndex === currentIndex) return;
      if (guard.shouldBlock() && !guard.confirmLeave()) {
        // Next가 경로를 반영하기 전에 취소합니다. 복귀 popstate도 Next에 전달하지 않습니다.
        event.stopImmediatePropagation();
        restoring = true;
        history.go(targetIndex === null ? 1 : currentIndex - targetIndex);
        return;
      }
      currentIndex = targetIndex ?? currentIndex - 1;
    }

    function onClick(event: MouseEvent): void {
      if (
        !guard.shouldBlock() ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      )
        return;
      const target = new URL(anchor.href, window.location.href);
      if (
        target.origin === window.location.origin &&
        target.pathname === window.location.pathname &&
        target.search === window.location.search
      )
        return;
      if (!guard.confirmLeave()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    function onBeforeUnload(event: BeforeUnloadEvent): void {
      if (guard.shouldBlock()) event.preventDefault();
    }

    window.addEventListener("popstate", onPopState, true);
    navigation?.addEventListener("currententrychange", onEntryChange);
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      active = false;
      window.removeEventListener("popstate", onPopState, true);
      navigation?.removeEventListener("currententrychange", onEntryChange);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (history.pushState === push) history.pushState = originalPush;
      if (history.replaceState === replace) history.replaceState = originalReplace;
    };
  }, [guard]);

  return <GuardContext.Provider value={guard}>{children}</GuardContext.Provider>;
}

/** 폼의 변경 상태를 등록하고 명시적 취소와 저장 성공을 구분합니다. */
export function useNavigationGuard(dirty: boolean): {
  confirmLeave: () => boolean;
  allowNavigation: () => void;
} {
  const guard = useContext(GuardContext);
  if (!guard) throw new Error("NavigationGuardProvider 안에서 사용해 주세요.");
  useEffect(() => {
    guard.setDirty(dirty);
    return () => {
      guard.setDirty(false);
    };
  }, [dirty, guard]);
  return { confirmLeave: guard.confirmLeave, allowNavigation: guard.allowNavigation };
}
