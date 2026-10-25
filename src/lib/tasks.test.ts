import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  createTask,
  deleteTask,
  getTask,
  listDeletedTasks,
  listTasks,
  restoreTask,
  updateTask,
  type Task,
  type TaskPage,
} from "./tasks";

const task: Task = {
  id: 17,
  title: "API 연결 확인",
  description: "저장된 내용",
  status: "assigned",
  priority: "medium",
  due_at: "2026-11-02T00:00:00Z",
  assignees: ["민수", "지윤"],
  tags: ["frontend"],
  labels: ["검증"],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
  deleted_at: null,
};
const page: TaskPage = { items: [task], total: 1, limit: 20, offset: 0 };
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Todo API 요청", () => {
  it("복수 상태와 false·0·한글·시간대 필터를 손실 없이 전달한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(page));
    const controller = new AbortController();

    await expect(
      listTasks(
        {
          status: ["assigned", "in_progress"],
          assignee: "민수",
          priority: "high",
          due_from: "2026-11-02T09:00:00+09:00",
          due_to: "2026-11-02T18:00:00+09:00",
          tag: "frontend",
          label: "이번 주",
          include_completed: false,
          limit: 20,
          offset: 0,
        },
        controller.signal,
      ),
    ).resolves.toEqual(page);

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    if (!call) throw new Error("목록 요청이 없습니다.");
    const [input, options] = call;
    const url = new URL(input instanceof Request ? input.url : input);
    expect(url.origin).toBe("http://127.0.0.1:8000");
    expect(url.pathname).toBe("/api/v1/tasks");
    expect(url.searchParams.getAll("status")).toEqual(["assigned", "in_progress"]);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      assignee: "민수",
      priority: "high",
      due_from: "2026-11-02T09:00:00+09:00",
      due_to: "2026-11-02T18:00:00+09:00",
      tag: "frontend",
      label: "이번 주",
      include_completed: "false",
      limit: "20",
      offset: "0",
    });
    expect(options).toMatchObject({ method: "GET", signal: controller.signal });
    expect(options?.body).toBeUndefined();
  });

  it("환경 변수의 주소로 상세를 조회하고 취소 신호를 전달한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:8001/");
    fetchMock.mockResolvedValue(jsonResponse(task));
    const controller = new AbortController();

    await expect(getTask(17, controller.signal)).resolves.toEqual(task);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8001/api/v1/tasks/17", {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  });

  it("제목만으로 JSON 생성 요청을 보낸다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(task, 201));

    await expect(createTask({ title: task.title })).resolves.toEqual(task);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/v1/tasks", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: task.title }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("부분 수정의 null과 빈 배열을 보존하고 생략 필드는 보내지 않는다", async () => {
    const patch = { description: null, due_at: null, tags: [] };
    fetchMock.mockResolvedValue(jsonResponse({ ...task, ...patch }));

    await expect(updateTask(17, patch)).resolves.toMatchObject(patch);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/v1/tasks/17", {
      method: "PATCH",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  });

  it("소프트 삭제의 200 Task 응답을 반환한다", async () => {
    const deleted = { ...task, deleted_at: "2026-10-26T01:00:00Z" };
    fetchMock.mockResolvedValue(jsonResponse(deleted));

    await expect(deleteTask(17)).resolves.toEqual(deleted);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/api/v1/tasks/17", {
      method: "DELETE",
      cache: "no-store",
    });
  });

  it("휴지통의 페이지 값과 취소 신호를 전달한다", async () => {
    const deletedPage = { ...page, offset: 20 };
    fetchMock.mockResolvedValue(jsonResponse(deletedPage));
    const controller = new AbortController();

    await expect(
      listDeletedTasks({ limit: 20, offset: 20 }, controller.signal),
    ).resolves.toEqual(deletedPage);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/tasks/deleted?limit=20&offset=20",
      {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      },
    );
  });

  it("본문 없이 복구를 요청하고 복구된 Task를 반환한다", async () => {
    fetchMock.mockResolvedValue(jsonResponse(task));

    await expect(restoreTask(17)).resolves.toEqual(task);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/v1/tasks/17/restore",
      {
        method: "POST",
        cache: "no-store",
      },
    );
  });
});

describe("Todo API 오류", () => {
  it("422 배열 오류를 알려진 입력 필드에 연결하고 내부 원문을 노출하지 않는다", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          detail: [
            {
              loc: ["body", "title"],
              msg: "internal SQL /private/path",
              type: "value_error",
            },
            {
              loc: ["body", "tags", 0],
              msg: "invalid tag",
              type: "string_type",
            },
            {
              loc: ["body", "unknown"],
              msg: "internal SQL",
              type: "extra_forbidden",
            },
            {
              loc: ["query", "limit"],
              msg: "limit invalid",
              type: "value_error",
            },
          ],
        },
        422,
      ),
    );

    await expect(createTask({ title: " " })).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "입력 내용과 형식을 확인해 주세요.",
      fieldErrors: {
        title: "공백이 아닌 제목을 입력해 주세요.",
        tags: "태그를 확인해 주세요.",
      },
    });
  });

  it.each([
    { detail: "잘못된 입력입니다." },
    { detail: [{ loc: ["body", "unknown"], msg: "private details" }] },
    { detail: [{ loc: ["body", "__proto__"], msg: "private details" }] },
  ])("422 문자열과 알 수 없는 필드는 공통 오류로 처리한다: %j", async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body, 422));

    await expect(createTask({ title: "검증" })).rejects.toMatchObject({
      status: 422,
      message: "입력 내용과 형식을 확인해 주세요.",
      fieldErrors: {},
    });
  });

  it.each([
    [400, "필터와 날짜 범위"],
    [401, "연결 설정"],
    [404, "삭제되었거나 존재하지 않는"],
    [500, "잠시 후 다시 시도"],
    [503, "잠시 후 다시 시도"],
  ])("HTTP %i 응답을 안전한 안내로 바꾼다", async (status, message) => {
    fetchMock.mockResolvedValue(
      jsonResponse({ detail: "SELECT * FROM private_database" }, status),
    );

    const pending = getTask(17);
    await expect(pending).rejects.toMatchObject({
      status,
      fieldErrors: {},
    });
    await expect(pending).rejects.toThrow(message);
  });

  it.each([500, 503])("비JSON %i 응답도 내부 본문 없이 처리한다", async (status) => {
    fetchMock.mockResolvedValue(
      new Response("<html>private server traceback</html>", { status }),
    );

    await expect(listTasks({})).rejects.toMatchObject({
      status,
      message: "서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      fieldErrors: {},
    });
  });

  it("일반 네트워크 실패는 ApiError로 변환하고 재전송하지 않는다", async () => {
    fetchMock.mockRejectedValue(new TypeError("private network detail"));

    await expect(listTasks({})).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("생성 응답 유실 시 목록 확인을 안내하고 자동으로 다시 생성하지 않는다", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    const pending = createTask({ title: "다시 생성 금지" });
    await expect(pending).rejects.toMatchObject({ status: 0 });
    await expect(pending).rejects.toThrow("다시 등록하기 전에 목록에서 저장 여부");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("생성 성공 상태라도 응답 본문을 읽지 못하면 저장 여부를 확인하게 한다", async () => {
    fetchMock.mockResolvedValue(new Response("truncated JSON", { status: 201 }));

    const pending = createTask({ title: "응답 확인" });
    await expect(pending).rejects.toMatchObject({ status: 201 });
    await expect(pending).rejects.toThrow("목록에서 저장 여부");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("이전 목록 요청의 취소는 일반 서버 오류로 변환하지 않는다", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("The operation was aborted", "AbortError");
    fetchMock.mockRejectedValue(abortError);
    controller.abort();

    await expect(listTasks({}, controller.signal)).rejects.toBe(abortError);
  });

  it.each([
    null,
    { ...task, assignees: "민수" },
    { ...task, status: "blocked" },
    { ...task, due_at: "invalid" },
  ])("잘못된 성공 응답을 Task로 단언하지 않는다: %j", async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    await expect(getTask(17)).rejects.toThrow(ApiError);
  });

  it.each([
    { ...page, items: [{}] },
    { ...page, total: -1 },
    { ...page, limit: 0 },
    { ...page, offset: "0" },
  ])("잘못된 페이지 응답을 목록으로 전달하지 않는다: %j", async (body) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    await expect(listTasks({})).rejects.toThrow(ApiError);
  });
});
