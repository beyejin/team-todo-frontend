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
import { ApiError, createTask, updateTask, type Task } from "@/lib/tasks";
import { ThemeProvider } from "./theme-provider";
import { TaskForm } from "./task-form";

const { push, confirmLeave, allowNavigation } = vi.hoisted(() => ({
  push: vi.fn(),
  confirmLeave: vi.fn<() => boolean>(),
  allowNavigation: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/navigation-guard", () => ({
  useNavigationGuard: () => ({ confirmLeave, allowNavigation }),
}));
vi.mock("@/lib/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks")>();
  return { ...actual, createTask: vi.fn(), updateTask: vi.fn() };
});

const task: Task = {
  id: 12,
  title: "발표 준비",
  description: "자료 모으기",
  status: "assigned",
  priority: "medium",
  due_at: "2026-11-02T00:00:00Z",
  assignees: ["예진"],
  tags: ["수업"],
  labels: ["발표"],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
  deleted_at: null,
};

beforeEach(() => {
  vi.mocked(createTask).mockReset();
  vi.mocked(updateTask).mockReset();
  confirmLeave.mockReturnValue(true);
});

function renderForm(props: { task?: Task } = {}) {
  return render(
    <ThemeProvider initialTheme="productivity">
      <TaskForm {...props} />
    </ThemeProvider>,
  );
}

describe("할 일 폼", () => {
  it("FE-002·011: 빈 제목을 전송하지 않고 연결된 오류와 포커스를 제공한다", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.type(screen.getByLabelText(/제목/u), "   ");
    await user.click(screen.getByRole("button", { name: "할 일 만들기" }));
    const title = screen.getByLabelText(/제목/u);
    expect(title).toHaveAccessibleName(/제목.*필수/u);
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAccessibleDescription(/공백이 아닌 제목/u);
    expect(title).toHaveFocus();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("FE-002: 모든 문자열 필드와 마감일을 정규화해 생성하고 상세로 이동한다", async () => {
    const user = userEvent.setup();
    vi.mocked(createTask).mockResolvedValue(task);
    renderForm();
    await user.type(screen.getByLabelText(/제목/u), "  발표 준비  ");
    await user.type(screen.getByLabelText("설명"), "자료 모으기");
    await user.type(screen.getByLabelText("담당자"), "예진, 민수,, 예진");
    await user.type(screen.getByLabelText("태그"), "수업, 수업");
    await user.type(screen.getByLabelText("라벨"), "발표");
    fireEvent.change(screen.getByLabelText("마감일"), {
      target: { value: "2026-11-02T09:00" },
    });
    await user.click(screen.getByRole("combobox", { name: "상태" }));
    await user.click(screen.getByRole("option", { name: "진행 중" }));
    await user.click(screen.getByRole("combobox", { name: "우선순위" }));
    await user.click(screen.getByRole("option", { name: "높음" }));
    await user.click(screen.getByRole("button", { name: "할 일 만들기" }));
    expect(createTask).toHaveBeenCalledWith({
      title: "발표 준비",
      description: "자료 모으기",
      status: "in_progress",
      priority: "high",
      due_at: new Date(2026, 10, 2, 9, 0).toISOString(),
      assignees: ["예진", "민수"],
      tags: ["수업"],
      labels: ["발표"],
    });
    expect(allowNavigation).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith("/tasks/12");
  });

  it("FE-008: 저장 중 연속 submit을 한 번의 요청으로 제한한다", async () => {
    const user = userEvent.setup();
    let finish: ((saved: Task) => void) | undefined;
    vi.mocked(createTask).mockReturnValue(
      new Promise<Task>((resolve) => {
        finish = resolve;
      }),
    );
    renderForm();
    await user.type(screen.getByLabelText(/제목/u), "한 번만 저장");
    const form = screen.getByRole("form", { name: "할 일 생성" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(createTask).toHaveBeenCalledOnce();
    expect(screen.getByLabelText(/제목/u)).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    await act(async () => {
      finish?.(task);
      await Promise.resolve();
    });
    expect(push).toHaveBeenCalledWith("/tasks/12");
  });

  it("FE-008: 네트워크 실패 후 입력을 보존하고 자동으로 재전송하지 않는다", async () => {
    const user = userEvent.setup();
    vi.mocked(createTask).mockRejectedValue(
      new ApiError(0, "목록에서 저장 여부를 확인해 주세요."),
    );
    renderForm();
    await user.type(screen.getByLabelText(/제목/u), "보존할 제목");
    await user.type(screen.getByLabelText("설명"), "보존할 내용");
    await user.click(screen.getByRole("button", { name: "할 일 만들기" }));
    expect(
      await within(screen.getByRole("form")).findByRole("alert"),
    ).toHaveTextContent("목록에서 저장 여부");
    expect(screen.getByLabelText(/제목/u)).toHaveValue("보존할 제목");
    expect(screen.getByLabelText("설명")).toHaveValue("보존할 내용");
    expect(screen.getByLabelText(/제목/u)).toBeEnabled();
    expect(createTask).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });

  it("FE-003·012: 제목만 변경하면 PATCH에서 마감일과 나머지 필드를 생략한다", async () => {
    const user = userEvent.setup();
    vi.mocked(updateTask).mockResolvedValue({ ...task, title: "새 제목" });
    renderForm({ task });
    await user.clear(screen.getByLabelText(/제목/u));
    await user.type(screen.getByLabelText(/제목/u), "새 제목");
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));
    expect(updateTask).toHaveBeenCalledWith(12, { title: "새 제목" });
    expect(push).toHaveBeenCalledWith("/tasks/12");
  });

  it("FE-008·011: 서버 필드 오류를 입력에 연결하고 수정 후 다시 저장한다", async () => {
    const user = userEvent.setup();
    vi.mocked(updateTask)
      .mockRejectedValueOnce(
        new ApiError(422, "입력을 확인해 주세요.", {
          title: "제목 형식을 확인해 주세요.",
        }),
      )
      .mockResolvedValueOnce({ ...task, title: "수정한 제목" });
    renderForm({ task });
    const title = screen.getByLabelText(/제목/u);
    await user.clear(title);
    await user.type(title, "다른 제목");
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));
    await waitFor(() => {
      expect(title).toHaveAccessibleDescription("제목 형식을 확인해 주세요.");
    });
    expect(title).toHaveValue("다른 제목");
    expect(title).toHaveFocus();
    await user.clear(title);
    await user.type(title, "수정한 제목");
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));
    expect(updateTask).toHaveBeenLastCalledWith(12, { title: "수정한 제목" });
    expect(push).toHaveBeenCalledWith("/tasks/12");
  });

  it("FE-003·008: 취소에서 이탈 확인을 존중하고 저장 요청은 보내지 않는다", async () => {
    const user = userEvent.setup();
    confirmLeave.mockReturnValue(false);
    renderForm({ task });
    await user.type(screen.getByLabelText(/제목/u), " 수정 중");
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(confirmLeave).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
    confirmLeave.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(push).toHaveBeenCalledWith("/tasks/12");
  });
});
