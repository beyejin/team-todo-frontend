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
import { ApiError, deleteTask, getTask, type Task } from "@/lib/tasks";
import { TaskDetail } from "./task-detail";
import { TaskEditor } from "./task-editor";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/navigation-guard", () => ({
  useNavigationGuard: () => ({ confirmLeave: () => true, allowNavigation: vi.fn() }),
}));
vi.mock("@/lib/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks")>();
  return { ...actual, getTask: vi.fn(), deleteTask: vi.fn() };
});

const task: Task = {
  id: 23,
  title: "조별 발표 준비",
  description: "자료를 모으고\n발표 순서를 정합니다.",
  status: "in_progress",
  priority: "high",
  due_at: "2026-11-02T00:00:00Z",
  assignees: ["예진", "민수"],
  tags: ["수업", "조별과제"],
  labels: ["발표"],
  created_at: "2026-10-25T01:00:00Z",
  updated_at: "2026-10-26T03:00:00Z",
  deleted_at: null,
};

beforeEach(() => {
  vi.mocked(getTask).mockReset().mockResolvedValue(task);
  vi.mocked(deleteTask).mockReset();
});

describe("할 일 상세", () => {
  it("FE-002: 조회 중 상태와 저장된 전체 필드를 보여준다", async () => {
    const request = Promise.withResolvers<Task>();
    vi.mocked(getTask).mockReturnValue(request.promise);
    render(<TaskDetail taskId={23} />);
    expect(screen.getByText("할 일을 불러오고 있습니다.")).toBeVisible();
    await act(async () => {
      request.resolve(task);
      await request.promise;
    });
    expect(screen.getByRole("heading", { name: task.title })).toBeInTheDocument();
    for (const value of [
      "#23",
      "진행 중",
      "높음",
      "예진, 민수",
      "수업, 조별과제",
      "발표",
    ]) {
      expect(screen.getByText(value)).toBeVisible();
    }
    expect(screen.getByText(/자료를 모으고/u)).toHaveTextContent(
      "발표 순서를 정합니다.",
    );
    for (const value of [task.due_at, task.created_at, task.updated_at]) {
      if (value)
        expect(screen.getByText(new Date(value).toLocaleString("ko-KR"))).toBeVisible();
    }
    expect(screen.getByRole("link", { name: "수정" })).toHaveAttribute(
      "href",
      "/tasks/23/edit",
    );
  });

  it("FE-009: 404를 정상 상세로 표시하지 않고 명시적 재시도 후 복구한다", async () => {
    const user = userEvent.setup();
    vi.mocked(getTask).mockRejectedValueOnce(
      new ApiError(404, "없거나 삭제된 할 일입니다."),
    );
    render(<TaskDetail taskId={23} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("없거나 삭제된");
    expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "목록으로" })).toHaveAttribute("href", "/");
    expect(getTask).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("heading", { name: task.title }),
    ).toBeInTheDocument();
    expect(getTask).toHaveBeenCalledTimes(2);
  });

  it.each(["취소", "Escape"])(
    "FE-005·011: %s로 닫으면 삭제하지 않고 포커스를 복원한다",
    async (action) => {
      const user = userEvent.setup();
      render(<TaskDetail taskId={23} />);
      const trigger = await screen.findByRole("button", { name: "삭제" });
      await user.click(trigger);
      const dialog = screen.getByRole("dialog", { name: "할 일을 삭제할까요?" });
      expect(within(dialog).getByText(/나중에 복구/u)).toBeVisible();
      if (action === "취소")
        await user.click(within(dialog).getByRole("button", { name: "취소" }));
      else await user.keyboard("{Escape}");
      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      expect(trigger).toHaveFocus();
      expect(deleteTask).not.toHaveBeenCalled();
    },
  );

  it("FE-005·008: 삭제 확정 요청을 잠그고 성공 응답 뒤에만 목록으로 이동한다", async () => {
    const user = userEvent.setup();
    const request = Promise.withResolvers<Task>();
    vi.mocked(deleteTask).mockReturnValue(request.promise);
    render(<TaskDetail taskId={23} />);
    await user.click(await screen.findByRole("button", { name: "삭제" }));
    const confirm = screen.getByRole("button", { name: "휴지통으로 이동" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(deleteTask).toHaveBeenCalledExactlyOnceWith(23);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("alertdialog", { name: "할 일을 삭제할까요?" }),
    ).toBeVisible();
    await act(async () => {
      request.resolve({ ...task, deleted_at: "2026-10-26T05:00:00Z" });
      await request.promise;
    });
    expect(push).toHaveBeenCalledExactlyOnceWith("/");
  });

  it("FE-005·008: 삭제 실패 시 상세와 대화상자 오류를 유지하고 자동 재시도하지 않는다", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteTask).mockRejectedValue(
      new ApiError(0, "연결할 수 없습니다. 삭제 상태를 확인해 주세요."),
    );
    render(<TaskDetail taskId={23} />);
    await user.click(await screen.findByRole("button", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "휴지통으로 이동" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("삭제 상태를 확인");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("heading", { name: task.title })).toBeInTheDocument();
    expect(deleteTask).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "취소" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "휴지통으로 이동" })).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
  });

  it("FE-009: 이전 화면의 늦은 응답이 다른 할 일 내용을 덮어쓰지 않는다", async () => {
    const oldRequest = Promise.withResolvers<Task>();
    vi.mocked(getTask).mockReturnValueOnce(oldRequest.promise);
    const view = render(<TaskDetail key={23} taskId={23} />);
    const latest = { ...task, id: 24, title: "새로 연 할 일" };
    vi.mocked(getTask).mockResolvedValue(latest);
    view.rerender(<TaskDetail key={24} taskId={24} />);
    expect(
      await screen.findByRole("heading", { name: latest.title }),
    ).toBeInTheDocument();
    await act(async () => {
      oldRequest.resolve(task);
      await oldRequest.promise;
    });
    expect(screen.getByRole("heading", { name: latest.title })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: task.title })).not.toBeInTheDocument();
  });
});

describe("수정 화면 진입", () => {
  it("FE-003: 서버에서 조회한 값을 수정 폼에 채운다", async () => {
    const user = userEvent.setup();
    render(<TaskEditor taskId={23} />);
    expect(screen.getByText("수정할 할 일을 불러오고 있습니다.")).toBeVisible();
    expect(await screen.findByLabelText(/제목/u)).toHaveValue(task.title);
    expect(screen.getByLabelText("설명")).toHaveValue(task.description);
    expect(screen.getByLabelText("담당자")).toHaveValue("예진, 민수");
    expect(screen.getByRole("button", { name: "변경사항 저장" })).toBeDisabled();
    await user.type(screen.getByLabelText(/제목/u), " 수정");
    expect(screen.getByRole("button", { name: "변경사항 저장" })).toBeEnabled();
  });

  it("FE-009: 조회 실패 때 빈 생성 폼을 열지 않고 다시 조회할 수 있다", async () => {
    const user = userEvent.setup();
    vi.mocked(getTask).mockRejectedValueOnce(
      new ApiError(404, "할 일을 찾을 수 없습니다."),
    );
    render(<TaskEditor taskId={23} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("찾을 수 없습니다");
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByLabelText(/제목/u)).toHaveValue(task.title);
  });
});
