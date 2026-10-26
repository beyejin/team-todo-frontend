import "server-only";

function failure(status: number, detail: string): Response {
  return Response.json(
    { detail },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** 공유 토큰은 서버에서만 붙이고 허용된 칸반 경로만 전달합니다. */
export async function proxyKanban(
  request: Request,
  taskId?: string,
): Promise<Response> {
  if (
    taskId !== undefined &&
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(taskId)
  ) {
    return failure(400, "올바른 칸반 작업 ID가 필요합니다.");
  }
  const incoming = new URL(request.url);
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (
      (origin !== null && origin !== incoming.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return failure(403, "같은 사이트에서만 보드를 변경할 수 있습니다.");
    }
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return failure(415, "JSON 형식으로 요청해 주세요.");
    }
  }

  let target: URL;
  try {
    const base = new URL(process.env.TTODO_BASE_URL ?? "http://127.0.0.1:8000");
    if (
      !["http:", "https:"].includes(base.protocol) ||
      base.username ||
      base.password ||
      base.search ||
      base.hash
    ) {
      return failure(503, "공유 칸반 서버 주소 설정을 확인해 주세요.");
    }
    target = new URL(
      `${base.href.replace(/\/$/, "")}/api/v1/kanban/tasks${taskId === undefined ? "" : `/${taskId}`}`,
    );
  } catch {
    return failure(503, "공유 칸반 서버 주소 설정을 확인해 주세요.");
  }
  for (const key of ["limit", "offset"]) {
    const value = incoming.searchParams.get(key);
    if (value !== null && taskId === undefined) target.searchParams.set(key, value);
  }
  let body: string | undefined;
  if (request.method !== "GET") {
    try {
      const payload: unknown = await request.json();
      body = JSON.stringify(payload);
    } catch {
      return failure(400, "JSON 요청을 읽을 수 없습니다.");
    }
  }
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  const token = process.env.TTODO_API_TOKEN;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      ...(body === undefined ? {} : { body }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status >= 500) {
      return failure(
        response.status,
        "공유 칸반 서버 또는 데이터베이스 연결 설정을 확인해 주세요.",
      );
    }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      return failure(502, "공유 칸반 서버 응답을 읽을 수 없습니다.");
    }
    const data: unknown = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return failure(
      502,
      "공유 칸반 서버에 연결할 수 없습니다. 서버 상태를 확인해 주세요.",
    );
  }
}
