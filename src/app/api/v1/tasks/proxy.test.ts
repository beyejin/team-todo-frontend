import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, POST } from "./route";
import { GET as getTask, PATCH, DELETE } from "./[taskId]/route";
import { GET as getDeleted } from "./deleted/route";
import { POST as restore } from "./[taskId]/restore/route";
import { proxyTasks } from "./proxy";

const fetchMock = vi.fn<typeof fetch>();
const origin = "https://todo.example";
const task = {
  id: 17,
  title: "프록시 연결 확인",
  status: "assigned",
  description: null,
  priority: "medium",
  due_at: null,
  assignees: ["민수"],
  tags: ["api"],
  labels: [],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
  deleted_at: null,
};
const context = { params: Promise.resolve({ taskId: "17" }) };

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("TTODO_BASE_URL", "https://backend.example");
  vi.stubEnv("TTODO_API_TOKEN", "server-secret");
});
afterEach(() => vi.unstubAllEnvs());

describe("FE-004/009/013 일반 Todo 서버 프록시", () => {
  it("반복 상태·날짜·false·페이지를 보존하고 허용되지 않은 쿼리와 요청 헤더를 제거한다", async () => {
    const page = { items: [task], total: 1, limit: 20, offset: 0 };
    fetchMock.mockResolvedValue(
      Response.json(page, {
        headers: { Authorization: "server-secret", "Set-Cookie": "private=value" },
      }),
    );
    const query = new URLSearchParams({
      assignee: "민수",
      priority: "high",
      due_from: "2026-10-26T09:00:00+09:00",
      due_to: "2026-10-27T00:00:00Z",
      tag: "api",
      label: "검증",
      include_completed: "false",
      limit: "20",
      offset: "0",
      url: "https://untrusted.example",
      token: "client-secret",
    });
    query.append("status", "assigned");
    query.append("status", "in_progress");
    const response = await GET(
      new Request(`${origin}/api/v1/tasks?${query.toString()}`, {
        headers: { Authorization: "Bearer client-secret", Cookie: "private=value" },
      }),
    );
    expect(await response.json()).toEqual(page);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("authorization")).toBeNull();
    expect(response.headers.get("set-cookie")).toBeNull();
    const call = fetchMock.mock.calls[0];
    const target = call?.[0];
    if (!(target instanceof URL)) throw new Error("서버 요청 주소 없음");
    expect(target.origin).toBe("https://backend.example");
    expect(target.pathname).toBe("/api/v1/tasks");
    expect(target.searchParams.getAll("status")).toEqual(["assigned", "in_progress"]);
    expect(Object.fromEntries(target.searchParams)).toMatchObject({
      assignee: "민수",
      due_from: "2026-10-26T09:00:00+09:00",
      include_completed: "false",
      limit: "20",
      offset: "0",
    });
    expect(target.searchParams.has("url")).toBe(false);
    expect(target.searchParams.has("token")).toBe(false);
    const headers = new Headers(call?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer server-secret");
    expect(headers.get("cookie")).toBeNull();
    expect(call?.[1]).toMatchObject({
      method: "GET",
      cache: "no-store",
      redirect: "error",
    });
  });

  it("등록과 부분 수정의 JSON과 201·200 Task 응답을 유지한다", async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json(task, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ ...task, tags: [] }));
    const input = { title: task.title, assignees: task.assignees };
    const created = await POST(
      new Request(`${origin}/api/v1/tasks`, {
        method: "POST",
        headers: { Origin: origin, "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(input),
      }),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual(task);
    const patch = { description: null, due_at: null, tags: [] };
    const updated = await PATCH(
      new Request(`${origin}/api/v1/tasks/17`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }),
      context,
    );
    expect(updated.status).toBe(200);
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(input));
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBe(JSON.stringify(patch));
  });

  it("상세·삭제·복구는 고정 경로를 쓰며 삭제와 복구에 JSON 본문을 요구하지 않는다", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(Response.json(task)));
    expect(
      (
        await getTask(
          new Request(`${origin}/api/v1/tasks/17?url=https://untrusted.example`),
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await DELETE(
          new Request(`${origin}/api/v1/tasks/17`, { method: "DELETE" }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await restore(
          new Request(`${origin}/api/v1/tasks/17/restore`, { method: "POST" }),
          context,
        )
      ).status,
    ).toBe(200);
    expect(
      fetchMock.mock.calls.map((call) =>
        call[0] instanceof URL ? call[0].href : call[0],
      ),
    ).toEqual([
      "https://backend.example/api/v1/tasks/17",
      "https://backend.example/api/v1/tasks/17",
      "https://backend.example/api/v1/tasks/17/restore",
    ]);
    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.body).toBeUndefined();
      expect(new Headers(call[1]?.headers).get("content-type")).toBeNull();
    }
  });

  it("휴지통은 limit·offset만 전달한다", async () => {
    fetchMock.mockResolvedValue(
      Response.json({ items: [], total: 0, limit: 20, offset: 20 }),
    );
    await getDeleted(
      new Request(
        `${origin}/api/v1/tasks/deleted?limit=20&offset=20&status=completed&tag=api`,
      ),
    );
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      new URL("https://backend.example/api/v1/tasks/deleted?limit=20&offset=20"),
    );
  });

  it.each([
    "../kanban/tasks",
    "https://untrusted.example",
    "0",
    "-1",
    "1.2",
    "1e2",
    "01",
    "9007199254740992",
  ])("잘못된 ID %s는 서버에 전달하지 않는다", async (taskId) => {
    const response = await getTask(new Request(`${origin}/api/v1/tasks/invalid`), {
      params: Promise.resolve({ taskId }),
    });
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["collection", "deleted", "task", "restore"] as const)(
    "%s 대상의 허용되지 않은 메서드는 차단한다",
    async (kind) => {
      const target =
        kind === "collection" || kind === "deleted" ? { kind } : { kind, id: "17" };
      const response = await proxyTasks(
        new Request(`${origin}/api/v1/tasks`, { method: "PUT" }),
        target,
      );
      expect(response.status).toBe(405);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each([
    { Origin: "https://untrusted.example" },
    { Origin: origin, "Sec-Fetch-Site": "cross-site" },
  ])("다른 출처의 본문 없는 삭제도 거부한다", async (headers) => {
    const response = await DELETE(
      new Request(`${origin}/api/v1/tasks/17`, { method: "DELETE", headers }),
      context,
    );
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("JSON이 아닌 생성과 깨진 수정 본문을 거부한다", async () => {
    expect(
      (
        await POST(
          new Request(`${origin}/api/v1/tasks`, { method: "POST", body: "{}" }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await PATCH(
          new Request(`${origin}/api/v1/tasks/17`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: "{",
          }),
          context,
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "file:///private/data",
    "https://user:password@backend.example",
    "https://backend.example?url=x",
    "https://backend.example#x",
    "invalid",
  ])("잘못된 서버 주소 설정을 요청 전에 거부한다: %s", async (base) => {
    vi.stubEnv("TTODO_BASE_URL", base);
    expect((await GET(new Request(`${origin}/api/v1/tasks`))).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("토큰 없는 로컬 서버도 기존 기본 주소로 사용할 수 있다", async () => {
    vi.stubEnv("TTODO_BASE_URL", undefined);
    vi.stubEnv("TTODO_API_TOKEN", undefined);
    fetchMock.mockResolvedValue(Response.json(task));
    await getTask(new Request(`${origin}/api/v1/tasks/17`), context);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(
      new URL("http://127.0.0.1:8000/api/v1/tasks/17"),
    );
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get("authorization"),
    ).toBeNull();
  });

  it("422 필드 위치를 유지하고 401/404도 클라이언트에 전달한다", async () => {
    const validation = {
      detail: [{ loc: ["body", "title"], type: "value_error", msg: "blank" }],
    };
    fetchMock
      .mockResolvedValueOnce(Response.json(validation, { status: 422 }))
      .mockResolvedValueOnce(Response.json({ detail: "unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(Response.json({ detail: "not found" }, { status: 404 }));
    const request = () => new Request(`${origin}/api/v1/tasks`);
    const invalid = await GET(request());
    expect(invalid.status).toBe(422);
    expect(await invalid.json()).toEqual(validation);
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request())).status).toBe(404);
  });

  it("내부 오류·비JSON·응답유실을 안전한 5xx로 전달한다", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("postgres://secret", { status: 503 }))
      .mockResolvedValueOnce(new Response("private HTML"))
      .mockRejectedValueOnce(new Error("private server-secret"));
    const request = () => new Request(`${origin}/api/v1/tasks`);
    for (const status of [503, 502, 502]) {
      const response = await GET(request());
      expect(response.status).toBe(status);
      const text = await response.text();
      expect(text).not.toContain("secret");
      expect(text).not.toContain("private");
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
