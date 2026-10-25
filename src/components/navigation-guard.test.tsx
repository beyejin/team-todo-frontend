import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NavigationGuardProvider, useNavigationGuard } from "./navigation-guard";

function Editor({ onNavigate }: { onNavigate: () => void }) {
  const [value, setValue] = useState("");
  const { allowNavigation } = useNavigationGuard(Boolean(value));
  return (
    <>
      <label htmlFor="draft">제목</label>
      <input
        id="draft"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      <a
        href="/settings"
        onClick={(event) => {
          event.preventDefault();
          onNavigate();
        }}
      >
        설정
      </a>
      <button type="button" onClick={allowNavigation}>
        저장 성공
      </button>
    </>
  );
}

function renderEditor() {
  const onNavigate = vi.fn();
  const result = render(
    <NavigationGuardProvider>
      <Editor onNavigate={onNavigate} />
    </NavigationGuardProvider>,
  );
  return { ...result, onNavigate };
}

beforeEach(() => {
  window.history.replaceState({ __NA: true, tree: ["existing"] }, "", "/tasks/new");
});

describe("저장하지 않은 입력 이탈 방지", () => {
  it("FE-008: 변경 없는 화면은 탐색과 새로고침을 막지 않는다", () => {
    const confirm = vi.spyOn(window, "confirm");
    const { onNavigate } = renderEditor();
    fireEvent.click(screen.getByRole("link", { name: "설정" }));
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(confirm).not.toHaveBeenCalled();
    expect(unload.defaultPrevented).toBe(false);
  });

  it("FE-008: 미저장 입력은 새로고침 경고를 요청하고 저장 후에는 해제한다", () => {
    renderEditor();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "남길 입력" } });
    const blocked = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "저장 성공" }));
    const allowed = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
  });

  it("FE-008: 링크 이탈을 취소하면 라우터를 호출하지 않고 입력을 보존한다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const { onNavigate } = renderEditor();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "남길 입력" } });
    fireEvent.click(screen.getByRole("link", { name: "설정" }));
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("제목")).toHaveValue("남길 입력");
  });

  it("FE-008: 링크 이탈을 승인하면 진행하고 추가 경고를 만들지 않는다", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { onNavigate } = renderEditor();
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "수정" } });
    fireEvent.click(screen.getByRole("link", { name: "설정" }));
    const unload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(unload);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledOnce();
    expect(unload.defaultPrevented).toBe(false);
  });

  it("FE-008: 뒤로 가기 취소는 Next 상태와 입력을 보존하고 원래 history로 복귀한다", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    renderEditor();
    const previous: unknown = window.history.state;
    window.history.pushState({ __NA: true, tree: ["edit"] }, "", "/tasks/12/edit");
    const current: unknown = window.history.state;
    expect(current).toMatchObject({ __NA: true, tree: ["edit"] });
    fireEvent.change(screen.getByLabelText("제목"), {
      target: { value: "보존할 수정" },
    });
    const nextRouter = vi.fn();
    window.addEventListener("popstate", nextRouter);
    window.dispatchEvent(new PopStateEvent("popstate", { state: previous }));
    expect(go).toHaveBeenCalledWith(1);
    expect(nextRouter).not.toHaveBeenCalled();
    expect(screen.getByLabelText("제목")).toHaveValue("보존할 수정");
    window.dispatchEvent(new PopStateEvent("popstate", { state: current }));
    expect(confirm).toHaveBeenCalledOnce();
    expect(nextRouter).not.toHaveBeenCalled();
    window.removeEventListener("popstate", nextRouter);
  });

  it("FE-008: 앞으로 가기 취소도 반대 방향으로 복귀한다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    renderEditor();
    const previous: unknown = window.history.state;
    window.history.pushState({ __NA: true }, "", "/tasks/12/edit");
    const next: unknown = window.history.state;
    window.dispatchEvent(new PopStateEvent("popstate", { state: previous }));
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "남길 입력" } });
    window.dispatchEvent(new PopStateEvent("popstate", { state: next }));
    expect(go).toHaveBeenCalledWith(-1);
  });

  it("FE-008: Navigation API가 있으면 history를 바꾸지 않고 실제 entry index로 복귀한다", () => {
    const navigation = Object.assign(new EventTarget(), { currentEntry: { index: 4 } });
    vi.stubGlobal("navigation", navigation);
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const go = vi.spyOn(window.history, "go").mockImplementation(() => undefined);
    const replace = vi.spyOn(window.history, "replaceState");
    renderEditor();
    expect(replace).not.toHaveBeenCalled();
    navigation.currentEntry.index = 5;
    const pushed = new Event("currententrychange");
    Object.defineProperty(pushed, "navigationType", { value: "push" });
    navigation.dispatchEvent(pushed);
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "남길 입력" } });
    navigation.currentEntry.index = 4;
    window.dispatchEvent(new PopStateEvent("popstate", { state: { __NA: true } }));
    expect(go).toHaveBeenCalledWith(1);
    expect(screen.getByLabelText("제목")).toHaveValue("남길 입력");
  });
});
