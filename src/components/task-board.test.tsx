import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Task } from "@/lib/tasks";
import { TaskBoard } from "./task-board";

const navigation = vi.hoisted(() => ({
  query: "",
  listeners: new Set<() => void>(),
  push: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
  replace: vi.fn<(href: string, options?: { scroll?: boolean }) => void>(),
}));

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const router = { push: navigation.push, replace: navigation.replace };
  return {
    useRouter: () => router,
    useSearchParams: () => {
      const query = useSyncExternalStore(
        (listener) => {
          navigation.listeners.add(listener);
          return () => {
            navigation.listeners.delete(listener);
          };
        },
        () => navigation.query,
        () => navigation.query,
      );
      return new URLSearchParams(query);
    },
  };
});

const fetchMock = vi.fn<typeof fetch>();
const task: Task = {
  id: 1,
  title: "화면 흐름 검증",
  description: "복구할 내용",
  status: "assigned",
  priority: "high",
  due_at: "2026-11-02T00:00:00Z",
  assignees: ["민수"],
  tags: ["api"],
  labels: ["검증"],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
  deleted_at: null,
};

function response(items: Task[], total = items.length, offset = 0): Response {
  return Response.json({ items, total, limit: 20, offset });
}

function requestUrl(input: RequestInfo | URL): URL {
  return new URL(input instanceof Request ? input.url : input);
}

function moveTo(href: string): void {
  navigation.query = new URL(href, "http://localhost:3000").search.slice(1);
  for (const listener of navigation.listeners) listener();
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => {
    throw new Error("대기 중인 요청이 없습니다.");
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  navigation.query = "";
  navigation.listeners.clear();
  navigation.push.mockImplementation(moveTo);
  navigation.replace.mockImplementation(moveTo);
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8000");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("FE-004 목록과 URL", () => {
  it("실제 응답의 순서와 전체 개수를 표시한다", async () => {
    const newer = { ...task, id: 2, title: "최근 할 일" };
    fetchMock.mockResolvedValue(response([newer, task], 2));
    render(<TaskBoard />);

    expect(screen.getByText("할 일을 불러오고 있어요…")).toHaveAttribute(
      "role",
      "status",
    );
    const table = await screen.findByRole("table", { name: "할 일 목록" });
    expect(
      within(table)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["최근 할 일", task.title]);
    expect(screen.getByText("전체 할 일 2개")).toBeInTheDocument();
    expect(within(table).getAllByText("높음")).toHaveLength(2);
  });

  it("필터를 적용하면 첫 페이지로 이동하고 뒤로 가기 상태를 복원한다", async () => {
    navigation.query = "tag=api&offset=20";
    fetchMock.mockImplementation((input) => {
      const offset = Number(requestUrl(input).searchParams.get("offset") ?? "0");
      return Promise.resolve(response([task], 41, offset));
    });
    const user = userEvent.setup();
    render(<TaskBoard />);
    await screen.findByRole("table");

    await user.type(screen.getByLabelText("담당자"), "민수");
    await user.click(screen.getByRole("checkbox", { name: "할당" }));
    await user.click(screen.getByRole("button", { name: "필터 적용" }));

    await waitFor(() => {
      expect(navigation.push).toHaveBeenCalled();
    });
    const applied = new URLSearchParams(navigation.query);
    expect(applied.getAll("status")).toEqual(["assigned"]);
    expect(applied.get("assignee")).toBe("민수");
    expect(applied.get("tag")).toBe("api");
    expect(applied.get("offset")).toBeNull();
    await screen.findByRole("table");

    act(() => {
      moveTo("/?tag=api&offset=20");
    });
    await screen.findByRole("table");
    expect(screen.getByLabelText("담당자")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "할당" })).not.toBeChecked();
    expect(screen.getByText(/2 \/ 3페이지/)).toBeInTheDocument();
  });

  it("역전된 날짜 범위는 주소나 서버 요청을 바꾸지 않는다", async () => {
    fetchMock.mockResolvedValue(response([]));
    const user = userEvent.setup();
    render(<TaskBoard />);
    await screen.findByRole("heading", { name: "첫 번째 할 일을 만들어 보세요" });
    await user.click(screen.getByText("목록 필터"));
    fireEvent.change(screen.getByLabelText("마감 시작"), {
      target: { value: "2026-11-03T09:00" },
    });
    fireEvent.change(screen.getByLabelText("마감 끝"), {
      target: { value: "2026-11-02T09:00" },
    });

    await user.click(screen.getByRole("button", { name: "필터 적용" }));

    expect(screen.getByRole("alert")).toHaveTextContent("늦을 수 없습니다");
    expect(navigation.push).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("초기 빈 목록과 필터 결과 없음을 구분한다", async () => {
    navigation.query = "tag=없는태그";
    fetchMock.mockImplementation(() => Promise.resolve(response([])));
    const user = userEvent.setup();
    render(<TaskBoard />);
    await screen.findByRole("heading", { name: "조건에 맞는 할 일이 없어요" });

    await user.click(screen.getByRole("button", { name: "모든 할 일 보기" }));

    await screen.findByRole("heading", { name: "첫 번째 할 일을 만들어 보세요" });
  });

  it("부분 날짜 입력의 빈 value를 조건 해제로 저장하지 않는다", async () => {
    fetchMock.mockResolvedValue(response([]));
    const user = userEvent.setup();
    render(<TaskBoard />);
    await screen.findByRole("heading", { name: "첫 번째 할 일을 만들어 보세요" });
    await user.click(screen.getByText("목록 필터"));
    const start = screen.getByLabelText("마감 시작");
    Object.defineProperty(start, "validity", {
      configurable: true,
      value: { badInput: true },
    });

    await user.click(screen.getByRole("button", { name: "필터 적용" }));

    expect(screen.getByRole("alert")).toHaveTextContent("올바른 날짜와 시간");
    expect(start).toHaveAttribute("aria-invalid", "true");
    expect(start).toHaveAccessibleDescription(
      "마감 범위에 올바른 날짜와 시간을 입력해 주세요.",
    );
    expect(navigation.push).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("FE-009 비동기 요청과 오류", () => {
  it("이전 조건의 늦은 응답이 새 목록을 덮지 못한다", async () => {
    navigation.query = "status=assigned";
    const oldRequest = deferred<Response>();
    const currentTask = {
      ...task,
      id: 2,
      title: "지금 조건",
      status: "in_progress" as const,
    };
    fetchMock
      .mockReturnValueOnce(oldRequest.promise)
      .mockResolvedValueOnce(response([currentTask]));
    render(<TaskBoard />);

    act(() => {
      moveTo("/?status=in_progress");
    });
    const table = await screen.findByRole("table");
    expect(within(table).getByRole("link", { name: "지금 조건" })).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    await act(async () => {
      oldRequest.resolve(response([task]));
      await oldRequest.promise;
    });

    expect(
      within(table).queryByRole("link", { name: task.title }),
    ).not.toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "지금 조건" })).toBeInTheDocument();
  });

  it("비JSON 서버 실패를 안전하게 안내하고 재시도로 회복한다", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("private SQL traceback", { status: 500 }))
      .mockResolvedValueOnce(response([]));
    const user = userEvent.setup();
    render(<TaskBoard />);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("서버에서 요청을 처리하지 못했습니다");
    expect(screen.queryByText("private SQL traceback")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await screen.findByRole("heading", { name: "첫 번째 할 일을 만들어 보세요" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("잘못된 URL 필터는 요청하지 않고 초기화할 수 있다", async () => {
    navigation.query = "status=blocked";
    fetchMock.mockResolvedValue(response([]));
    const user = userEvent.setup();
    render(<TaskBoard />);
    expect(screen.getByRole("alert")).toHaveTextContent("상태 필터");
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "주소 조건 초기화" }));

    await screen.findByRole("heading", { name: "첫 번째 할 일을 만들어 보세요" });
  });
});

describe("FE-006 휴지통 복구", () => {
  const deleted = { ...task, deleted_at: "2026-10-26T01:00:00Z" };

  it("복구 실패에서 항목을 숨기거나 성공으로 표시하지 않는다", async () => {
    fetchMock.mockImplementation((_input, options) =>
      Promise.resolve(
        options?.method === "POST"
          ? Response.json({ detail: "not found" }, { status: 404 })
          : response([deleted]),
      ),
    );
    const user = userEvent.setup();
    render(<TaskBoard trash />);
    const table = await screen.findByRole("table", { name: "휴지통 항목" });
    expect(within(table).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "새 할 일" })).not.toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: `${task.title} 복구` }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("할 일을 찾을 수 없습니다");
    expect(within(table).getByText(task.title)).toBeInTheDocument();
    expect(screen.queryByText(/을 복구했습니다/)).not.toBeInTheDocument();
  });

  it("복구 후 마지막 페이지가 비면 마지막 유효 페이지로 보정한다", async () => {
    navigation.query = "offset=20&tag=무시할조건";
    const remaining = Array.from({ length: 20 }, (_, index) => ({
      ...deleted,
      id: index + 2,
      title: `남은 할 일 ${String(index + 1)}`,
    }));
    fetchMock
      .mockResolvedValueOnce(response([deleted], 21, 20))
      .mockResolvedValueOnce(Response.json(task))
      .mockResolvedValueOnce(response([], 20, 20))
      .mockResolvedValueOnce(response(remaining, 20, 0));
    const user = userEvent.setup();
    render(<TaskBoard trash />);
    const table = await screen.findByRole("table");
    const firstInput = fetchMock.mock.calls[0]?.[0];
    if (!firstInput) throw new Error("휴지통 요청이 없습니다.");
    expect(requestUrl(firstInput).searchParams.has("tag")).toBe(false);

    await user.click(within(table).getByRole("button", { name: `${task.title} 복구` }));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/trash", { scroll: false });
    });
    await screen.findByText("삭제된 할 일 20개");
    expect(screen.getByRole("link", { name: "복구한 할 일 확인" })).toHaveAttribute(
      "href",
      "/tasks/1",
    );
    expect(screen.getByRole("button", { name: "이전 페이지" })).toBeDisabled();
  });

  it("처리 중 빠른 반복 클릭을 하나의 복구 요청으로 제한한다", async () => {
    const pending = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(response([deleted]))
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValueOnce(response([]));
    render(<TaskBoard trash />);
    const table = await screen.findByRole("table");
    const button = within(table).getByRole("button", { name: `${task.title} 복구` });

    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(
      fetchMock.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(1);
    await act(async () => {
      pending.resolve(Response.json(task));
      await pending.promise;
    });

    await screen.findByRole("heading", { name: "휴지통이 비어 있어요" });
  });
});
