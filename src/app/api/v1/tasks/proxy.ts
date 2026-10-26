import "server-only";

type TaskTarget =
  { kind: "collection" | "deleted" } | { kind: "task" | "restore"; id: string };

const listQueries = new Set([
  "status",
  "assignee",
  "priority",
  "due_from",
  "due_to",
  "tag",
  "label",
  "include_completed",
  "limit",
  "offset",
]);
const pageQueries = new Set(["limit", "offset"]);

function failure(status: number, detail: string): Response {
  return Response.json(
    { detail },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** 고정된 Todo 경로만 서버의 주소와 토큰으로 연결합니다. */
export async function proxyTasks(
  request: Request,
  destination: TaskTarget,
): Promise<Response> {
  const methods =
    destination.kind === "collection"
      ? ["GET", "POST"]
      : destination.kind === "task"
        ? ["GET", "PATCH", "DELETE"]
        : destination.kind === "restore"
          ? ["POST"]
          : ["GET"];
  if (!methods.includes(request.method))
    return failure(405, "지원하지 않는 요청입니다.");

  let path = "/api/v1/tasks";
  if ("id" in destination) {
    if (
      !/^[1-9]\d*$/.test(destination.id) ||
      !Number.isSafeInteger(Number(destination.id))
    ) {
      return failure(400, "올바른 할 일 ID가 필요합니다.");
    }
    path += `/${destination.id}${destination.kind === "restore" ? "/restore" : ""}`;
  } else if (destination.kind === "deleted") path += "/deleted";

  const incoming = new URL(request.url);
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (
      (origin !== null && origin !== incoming.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site"
    ) {
      return failure(403, "같은 사이트에서만 할 일을 변경할 수 있습니다.");
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
      return failure(503, "Todo 서버 주소 설정을 확인해 주세요.");
    }
    target = new URL(`${base.href.replace(/\/$/, "")}${path}`);
  } catch {
    return failure(503, "Todo 서버 주소 설정을 확인해 주세요.");
  }
  if (
    request.method === "GET" &&
    (destination.kind === "collection" || destination.kind === "deleted")
  ) {
    const allowed = destination.kind === "collection" ? listQueries : pageQueries;
    for (const [key, value] of incoming.searchParams) {
      if (allowed.has(key)) target.searchParams.append(key, value);
    }
  }

  let body: string | undefined;
  if (
    (destination.kind === "collection" && request.method === "POST") ||
    request.method === "PATCH"
  ) {
    const contentType = request.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      .toLowerCase();
    if (contentType !== "application/json")
      return failure(415, "JSON 형식으로 요청해 주세요.");
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
    if (response.status >= 500)
      return failure(response.status, "Todo 서버에서 요청 결과를 확인하지 못했습니다.");
    if (!response.headers.get("content-type")?.includes("application/json"))
      return failure(502, "Todo 서버 응답을 읽을 수 없습니다.");
    const data: unknown = await response.json();
    return Response.json(data, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return failure(
      502,
      "Todo 서버에 연결할 수 없습니다. 요청 결과를 다시 확인해 주세요.",
    );
  }
}
