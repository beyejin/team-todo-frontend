import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET, POST } from "./tasks/route";
import { PATCH } from "./tasks/[taskId]/route";

const id = "00000000-0000-0000-0000-000000000001";

afterEach(() => vi.unstubAllEnvs());

describe("FE-KB 공유 칸반 서버 프록시", () => {
  it("고정된 칸반 경로와 페이지 쿼리만 서버 토큰으로 조회한다", async () => {
    vi.stubEnv("TTODO_BASE_URL", "https://team.example");
    vi.stubEnv("TTODO_API_TOKEN", "server-secret");
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ items: [] }));
    vi.stubGlobal("fetch", fetcher);
    const response = await GET(
      new Request(
        "http://localhost:3000/api/kanban/tasks?limit=100&offset=20&url=https://untrusted.example",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const call = fetcher.mock.calls[0];
    expect(call?.[0] instanceof URL ? call[0].href : call?.[0]).toBe(
      "https://team.example/api/v1/kanban/tasks?limit=100&offset=20",
    );
    expect(new Headers(call?.[1]?.headers).get("authorization")).toBe(
      "Bearer server-secret",
    );
    expect(call?.[1]).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(await response.text()).not.toContain("server-secret");
  });

  it("등록과 상태변경의 본문 및 백엔드 상태코드를 유지한다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ id }, { status: 201 }))
      .mockResolvedValueOnce(Response.json({ id, status: "completed" }));
    vi.stubGlobal("fetch", fetcher);
    const created = await POST(
      new Request("http://localhost:3000/api/kanban/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ title: "팀 업무" }),
      }),
    );
    expect(created.status).toBe(201);
    const changed = await PATCH(
      new Request(`http://localhost:3000/api/kanban/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ taskId: id }) },
    );
    expect(await changed.json()).toEqual({ id, status: "completed" });
    expect(fetcher.mock.calls[1]?.[1]?.body).toBe('{"status":"completed"}');
  });

  it("다른 사이트의 쓰기 요청과 경로 주입을 서버 호출 전에 막는다", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    const crossSite = await POST(
      new Request("http://localhost:3000/api/kanban/tasks", {
        method: "POST",
        headers: {
          Origin: "https://untrusted.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
    );
    expect(crossSite.status).toBe(403);
    const path = await PATCH(
      new Request("http://localhost:3000/api/kanban/tasks/test", { method: "PATCH" }),
      { params: Promise.resolve({ taskId: "../../tasks" }) },
    );
    expect(path.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("인증 및 입력 오류는 유지하고 내부 오류·비JSON·네트워크 오류는 숨긴다", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ detail: "유효한 API 토큰이 필요합니다." }, { status: 401 }),
      )
      .mockResolvedValueOnce(
        Response.json({ detail: "팀 멤버를 찾을 수 없습니다." }, { status: 422 }),
      )
      .mockResolvedValueOnce(new Response("postgres://secret", { status: 503 }))
      .mockResolvedValueOnce(new Response("<html>Bad gateway</html>"))
      .mockRejectedValueOnce(new Error("secret connection failure"));
    vi.stubGlobal("fetch", fetcher);
    const request = (): Request =>
      new Request("http://localhost:3000/api/kanban/tasks");
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request())).status).toBe(422);
    const internal = await GET(request());
    expect(internal.status).toBe(503);
    expect(await internal.text()).not.toContain("postgres");
    expect((await GET(request())).status).toBe(502);
    const network = await GET(request());
    expect(network.status).toBe(502);
    expect(await network.text()).not.toContain("secret");
  });

  it("비JSON 쓰기와 깨진 JSON은 전송하지 않는다", async () => {
    const fetcher = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await POST(
          new Request("http://localhost:3000/api/kanban/tasks", {
            method: "POST",
            body: "{}",
          }),
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await POST(
          new Request("http://localhost:3000/api/kanban/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
