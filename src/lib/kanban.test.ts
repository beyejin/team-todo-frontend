import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createKanbanTask,
  getKanbanTask,
  KanbanError,
  listKanbanTasks,
  loadKanbanBoard,
  moveKanbanTask,
  type KanbanTask,
} from "./kanban";

const fetchMock = vi.fn<typeof fetch>();
const task: KanbanTask = {
  id: "00000000-0000-0000-0000-000000000017",
  issue_number: 17,
  title: "팀 공유 작업",
  description: null,
  status: "assigned",
  board_id: "00000000-0000-0000-0000-000000000004",
  column_id: "00000000-0000-0000-0000-000000000005",
  position: 1,
  assignees: ["team-member"],
  labels: ["Testing"],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
};

function page(items: KanbanTask[], total = items.length, offset = 0): Response {
  return Response.json({ items, total, limit: 100, offset });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("FE-KB-001 공유 보드 계약과 전체 조회", () => {
  it("동일 출처로 페이지와 AbortSignal을 전달한다", async () => {
    fetchMock.mockResolvedValue(page([task], 101, 100));
    const controller = new AbortController();
    const result = await listKanbanTasks(
      { limit: 100, offset: 100 },
      controller.signal,
    );
    expect(result.items).toEqual([task]);
    expect(fetchMock).toHaveBeenCalledWith("/api/kanban/tasks?limit=100&offset=100", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  });

  it("100개 다음 페이지까지 읽어 전체 보드를 반환한다", async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({
      ...task,
      id: `00000000-0000-0000-0000-${String(index + 100).padStart(12, "0")}`,
      issue_number: index + 100,
    }));
    fetchMock
      .mockResolvedValueOnce(page(first, 101))
      .mockResolvedValueOnce(page([task], 101, 100));
    const result = await loadKanbanBoard();
    expect(result).toHaveLength(101);
    expect(result[100]).toEqual(task);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/kanban/tasks?limit=100&offset=100");
  });

  it("빈 보드도 한 번의 조회로 끝낸다", async () => {
    fetchMock.mockResolvedValue(page([]));
    await expect(loadKanbanBoard()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("중간 페이지 실패를 완전한 목록으로 반환하지 않는다", async () => {
    fetchMock
      .mockResolvedValueOnce(page([task], 2))
      .mockResolvedValueOnce(new Response("private SQL", { status: 503 }));
    await expect(loadKanbanBoard()).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["count", "duplicate", "empty", "offset"])(
    "조회 중 불일치 %s를 누락 없는 성공으로 오인하지 않는다",
    async (kind) => {
      fetchMock.mockResolvedValueOnce(page([task], 2));
      const next = { ...task, id: "00000000-0000-0000-0000-000000000018" };
      fetchMock.mockResolvedValueOnce(
        page(
          kind === "empty" ? [] : [kind === "duplicate" ? task : next],
          kind === "count" ? 3 : 2,
          kind === "offset" ? 0 : 1,
        ),
      );
      await expect(loadKanbanBoard()).rejects.toBeInstanceOf(KanbanError);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("UUID 상세와 상태 변경 요청의 계약을 유지한다", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(task)));
    await expect(getKanbanTask(task.id)).resolves.toEqual(task);
    await moveKanbanTask(task.id, "completed");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/kanban/tasks/${task.id}`);
    expect(fetchMock.mock.calls[1]).toEqual([
      `/api/kanban/tasks/${task.id}`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      },
    ]);
  });

  it.each([
    { id: 17 },
    { status: "todo" },
    { assignees: [17] },
    { board_id: "wrong" },
    { position: "1" },
    { issue_number: 0 },
    { created_at: "yesterday" },
    { description: 1 },
  ])("잘못된 성공 응답을 화면 데이터로 사용하지 않는다: %j", async (invalid) => {
    fetchMock.mockResolvedValue(Response.json({ ...task, ...invalid }));
    await expect(getKanbanTask(task.id)).rejects.toBeInstanceOf(KanbanError);
  });
});

describe("FE-KB-002/006/009 생성과 안전한 오류", () => {
  it("선택 입력을 JSON으로 한 번 보내고 서버 데이터를 반환한다", async () => {
    fetchMock.mockResolvedValue(Response.json(task, { status: 201 }));
    const input = {
      title: task.title,
      description: null,
      assignees: task.assignees,
      labels: task.labels,
    };
    await expect(createKanbanTask(input)).resolves.toEqual(task);
    expect(fetchMock).toHaveBeenCalledWith("/api/kanban/tasks", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  });

  it("422의 알려진 필드만 안전한 메시지로 연결한다", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          detail: [
            { loc: ["body", "title"], msg: "private" },
            { loc: ["body", "assignees", 0], msg: "private" },
            { loc: ["body", "unknown"], msg: "private" },
          ],
        },
        { status: 422 },
      ),
    );
    await expect(createKanbanTask({ title: "" })).rejects.toMatchObject({
      fieldErrors: {
        title: "공백이 아닌 제목을 입력해 주세요.",
        assignees: "공유 보드에 등록된 GitHub 사용자명을 확인해 주세요.",
      },
    });
  });

  it.each([401, 403, 404, 409, 422, 500, 503])(
    "%i 오류 원문과 비밀값은 노출하지 않는다",
    async (status) => {
      fetchMock.mockResolvedValue(new Response("private secret token", { status }));
      const result = await getKanbanTask(task.id).catch((error: unknown) => error);
      expect(result).toBeInstanceOf(KanbanError);
      if (!(result instanceof KanbanError)) throw new Error("오류 타입 누락");
      expect(result.status).toBe(status);
      expect(result.message).not.toContain("private");
      expect(result.message).not.toContain("secret");
    },
  );

  it.each(["network", "non-json", "invalid-json"])(
    "등록 결과 유실 %s는 새로고침을 안내하고 재전송하지 않는다",
    async (kind) => {
      if (kind === "network")
        fetchMock.mockRejectedValue(new TypeError("private network"));
      else
        fetchMock.mockResolvedValue(
          kind === "non-json" ? new Response("private") : Response.json({ ok: true }),
        );
      await expect(createKanbanTask({ title: task.title })).rejects.toThrow(
        "다시 등록하기 전에 보드를 새로고침",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("이동 응답 유실은 현재 상태 확인을 안내하고 재전송하지 않는다", async () => {
    fetchMock.mockRejectedValue(new TypeError("failed"));
    await expect(moveKanbanTask(task.id, "completed")).rejects.toThrow(
      "현재 상태를 확인",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([500, 502, 503])(
    "등록 %i 응답은 저장 여부 확인을 안내한다",
    async (status) => {
      fetchMock.mockResolvedValue(
        Response.json({ detail: "upstream lost" }, { status }),
      );
      await expect(createKanbanTask({ title: task.title })).rejects.toThrow(
        "다시 등록하기 전에 보드를 새로고침",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["json", "html"])(
    "이동 502 %s 응답은 현재 상태 확인을 안내한다",
    async (kind) => {
      fetchMock.mockResolvedValue(
        kind === "json"
          ? Response.json({ detail: "timeout" }, { status: 502 })
          : new Response("upstream error", { status: 502 }),
      );
      await expect(moveKanbanTask(task.id, "completed")).rejects.toThrow(
        "보드를 새로고침해 현재 상태를 확인",
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it("AbortError는 사용자 오류로 변환하지 않는다", async () => {
    const error = new DOMException("aborted", "AbortError");
    fetchMock.mockRejectedValue(error);
    await expect(loadKanbanBoard()).rejects.toBe(error);
  });
});
