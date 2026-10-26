import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KanbanTask } from "@/lib/kanban";
import { NavigationGuardProvider } from "./navigation-guard";
import { KanbanBoard } from "./kanban-board";

const fetchMock = vi.fn<typeof fetch>();
const task: KanbanTask = {
  id: "00000000-0000-0000-0000-000000000017",
  issue_number: 17,
  title: "공유 작업 검증",
  description: "팀원이 함께 확인합니다.",
  status: "assigned",
  board_id: "00000000-0000-0000-0000-000000000004",
  column_id: "00000000-0000-0000-0000-000000000005",
  position: 1,
  assignees: ["team-member"],
  labels: ["Testing"],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
};
function page(items: KanbanTask[]): Response {
  return Response.json({ items, total: items.length, limit: 100, offset: 0 });
}
function renderBoard() {
  return render(
    <NavigationGuardProvider>
      <KanbanBoard />
    </NavigationGuardProvider>,
  );
}
function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error("대기 요청 없음");
  };
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("FE-KB-001/003 공유 보드 조회", () => {
  it("로딩 뒤 세 상태 컬럼과 실제 카드 정보를 보여준다", async () => {
    fetchMock.mockResolvedValue(page([task]));
    renderBoard();
    expect(screen.getByText("공유 보드 전체를 불러오고 있어요…")).toHaveAttribute(
      "role",
      "status",
    );
    const todo = await screen.findByRole("region", { name: "할 일" });
    expect(within(todo).getByRole("article", { name: task.title })).toBeInTheDocument();
    expect(within(todo).getByText("담당 · team-member")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "진행 중" })).toHaveTextContent(
      "진행 중 작업이 없습니다.",
    );
    expect(screen.getByRole("region", { name: "완료" })).toHaveTextContent(
      "완료 작업이 없습니다.",
    );
    expect(screen.getByText("전체 작업 1개")).toBeInTheDocument();
  });

  it("조회 실패를 빈 보드로 숨기지 않고 재시도로 회복한다", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("private traceback", { status: 503 }))
      .mockResolvedValueOnce(page([]));
    const user = userEvent.setup();
    renderBoard();
    expect(
      await within(screen.getByRole("main")).findByRole("alert"),
    ).toHaveTextContent("공유 칸반에 연결할 수 없습니다");
    expect(screen.queryByText("할 일 작업이 없습니다.")).not.toBeInTheDocument();
    expect(screen.queryByText("private traceback")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByText("전체 작업 0개");
  });

  it("새로고침에서 서버의 다른 브라우저 변경을 읽는다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([task]))
      .mockResolvedValueOnce(page([{ ...task, status: "completed" }]));
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "보드 새로고침" }));
    await waitFor(() => {
      expect(
        within(screen.getByRole("region", { name: "완료" })).getByRole("article"),
      ).toBeInTheDocument();
    });
  });

  it("새로고침 실패 시 마지막 조회임을 표시하고 카드를 보존한다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([task]))
      .mockRejectedValueOnce(new TypeError("network"));
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole("article");
    await user.click(screen.getByRole("button", { name: "보드 새로고침" }));
    expect(
      await within(screen.getByRole("main")).findByRole("alert"),
    ).toHaveTextContent("마지막으로 조회한 작업");
    expect(screen.getByRole("article", { name: task.title })).toBeInTheDocument();
  });

  it("화면 이탈은 조회를 취소하고 늦은 응답을 버린다", async () => {
    const waiting = deferred<Response>();
    fetchMock.mockReturnValue(waiting.promise);
    const view = renderBoard();
    const signal = fetchMock.mock.calls[0]?.[1]?.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      waiting.resolve(page([task]));
      await waiting.promise;
    });
    expect(screen.queryByText(task.title)).not.toBeInTheDocument();
  });
});

describe("FE-KB-002/006 등록", () => {
  it("제목을 검증하고 선택값을 정리해 실제 응답 카드를 표시한다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(Response.json(task, { status: 201 }));
    const user = userEvent.setup();
    renderBoard();
    await screen.findByText("전체 작업 0개");
    await user.click(screen.getByText("공유 작업 등록"));
    await user.click(screen.getByRole("button", { name: "할 일에 등록" }));
    expect(screen.getByRole("textbox", { name: /^작업 제목/ })).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.type(screen.getByRole("textbox", { name: /^작업 제목/ }), task.title);
    await user.type(screen.getByLabelText("작업 설명"), task.description ?? "");
    await user.type(
      screen.getByLabelText("담당 GitHub 사용자명"),
      "team-member, team-member, ",
    );
    await user.type(screen.getByLabelText("작업 라벨"), "Testing, Testing");
    await user.click(screen.getByRole("button", { name: "할 일에 등록" }));
    const card = await screen.findByRole("article", { name: task.title });
    expect(card).toHaveFocus();
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({
        title: task.title,
        description: task.description,
        status: "assigned",
        assignees: ["team-member"],
        labels: ["Testing"],
      }),
    );
    expect(screen.getByRole("textbox", { name: /^작업 제목/ })).toHaveValue("");
    expect(screen.getByText(/작업을 할 일에 등록했습니다/)).toHaveAttribute(
      "role",
      "status",
    );
  });

  it("등록 실패 시 모든 입력을 유지하고 응답 유실을 안내한다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([]))
      .mockRejectedValueOnce(new TypeError("lost response"));
    const user = userEvent.setup();
    renderBoard();
    await screen.findByText("전체 작업 0개");
    await user.click(screen.getByText("공유 작업 등록"));
    await user.type(screen.getByRole("textbox", { name: /^작업 제목/ }), task.title);
    await user.type(screen.getByLabelText("작업 설명"), "보존할 설명");
    await user.click(screen.getByRole("button", { name: "할 일에 등록" }));
    expect(
      await within(screen.getByRole("main")).findByRole("alert"),
    ).toHaveTextContent("다시 등록하기 전에 보드를 새로고침");
    expect(screen.getByRole("textbox", { name: /^작업 제목/ })).toHaveValue(task.title);
    expect(screen.getByLabelText("작업 설명")).toHaveValue("보존할 설명");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("빠른 중복 제출은 한 번만 저장한다", async () => {
    const saving = deferred<Response>();
    fetchMock.mockResolvedValueOnce(page([])).mockReturnValueOnce(saving.promise);
    const user = userEvent.setup();
    renderBoard();
    await screen.findByText("전체 작업 0개");
    await user.click(screen.getByText("공유 작업 등록"));
    await user.type(screen.getByRole("textbox", { name: /^작업 제목/ }), task.title);
    const form = screen.getByRole("form", { name: "공유 작업 등록" });
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(
      fetchMock.mock.calls.filter((call) => call[1]?.method === "POST"),
    ).toHaveLength(1);
    await act(async () => {
      saving.resolve(Response.json(task));
      await saving.promise;
    });
    await screen.findByRole("article");
  });
});

describe("FE-KB-004/005/006/007 카드 이동", () => {
  it("키보드 버튼으로 이동하고 성공 뒤 카드에 포커스를 돌린다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([task]))
      .mockResolvedValueOnce(Response.json({ ...task, status: "in_progress" }));
    const user = userEvent.setup();
    renderBoard();
    await screen.findByRole("article");
    screen.getByRole("button", { name: `${task.title}: 진행 중으로 이동` }).focus();
    await user.keyboard("{Enter}");
    await waitFor(() => {
      expect(
        within(screen.getByRole("region", { name: "진행 중" })).getByRole("article"),
      ).toHaveFocus();
    });
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({ status: "in_progress" }),
    );
  });

  it("이동 중 원래 카드를 유지하고 실패해도 숨기지 않는다", async () => {
    const moving = deferred<Response>();
    fetchMock.mockResolvedValueOnce(page([task])).mockReturnValueOnce(moving.promise);
    renderBoard();
    await screen.findByRole("article");
    const button = screen.getByRole("button", {
      name: `${task.title}: 완료로 이동`,
    });
    act(() => {
      fireEvent.click(button);
      fireEvent.click(button);
    });
    expect(
      within(screen.getByRole("region", { name: "할 일" })).getByRole("article"),
    ).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.filter((call) => call[1]?.method === "PATCH"),
    ).toHaveLength(1);
    await act(async () => {
      moving.resolve(Response.json({ detail: "private" }, { status: 404 }));
      await moving.promise;
    });
    expect(
      await within(screen.getByRole("main")).findByRole("alert"),
    ).toHaveTextContent("찾을 수 없습니다");
    expect(
      within(screen.getByRole("region", { name: "할 일" })).getByRole("article"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "완료" })).queryByRole("article"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: task.title })).toHaveFocus();
  });

  it("native drag and drop으로 지정한 상태만 PATCH한다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([task]))
      .mockResolvedValueOnce(Response.json({ ...task, status: "completed" }));
    renderBoard();
    const card = await screen.findByRole("article");
    const data = new Map<string, string>();
    const dataTransfer = {
      setData: (type: string, value: string) => {
        data.set(type, value);
      },
      getData: (type: string) => data.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.dragStart(card, { dataTransfer });
    const done = screen.getByRole("region", { name: "완료" });
    fireEvent.dragOver(done, { dataTransfer });
    fireEvent.drop(done, { dataTransfer });
    await waitFor(() => {
      expect(within(done).getByRole("article")).toBeInTheDocument();
    });
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(
      JSON.stringify({ status: "completed" }),
    );
  });

  it("동일 열 드롭은 상태 변경 요청을 보내지 않는다", async () => {
    fetchMock.mockResolvedValue(page([task]));
    renderBoard();
    await screen.findByRole("article");
    fireEvent.drop(screen.getByRole("region", { name: "할 일" }), {
      dataTransfer: { getData: () => task.id },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
