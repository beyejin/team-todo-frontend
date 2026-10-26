/** 기존 공유 칸반 보드의 세 상태입니다. */
export type KanbanStatus = "assigned" | "in_progress" | "completed";

/** UUID 기반 공유 이슈와 보드 배치 정보입니다. */
export interface KanbanTask {
  id: string;
  issue_number: number;
  title: string;
  description: string | null;
  status: KanbanStatus;
  board_id: string;
  column_id: string;
  position: number;
  assignees: string[];
  labels: string[];
  created_at: string;
  updated_at: string;
}

/** 공유 보드의 페이지 응답입니다. */
export interface KanbanPage {
  items: KanbanTask[];
  total: number;
  limit: number;
  offset: number;
}

/** 담당자는 보드 멤버의 GitHub 사용자명이며 라벨은 프로젝트 이름입니다. */
export interface KanbanInput {
  title: string;
  description?: string | null;
  status?: KanbanStatus;
  assignees?: string[];
  labels?: string[];
}

/** 내부 응답을 노출하지 않는 화면용 오류입니다. */
export class KanbanError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "KanbanError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)
  );
}

function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNames(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item: unknown) => typeof item === "string")
  );
}

function isTask(value: unknown): value is KanbanTask {
  return (
    isRecord(value) &&
    isUuid(value.id) &&
    isUuid(value.board_id) &&
    isUuid(value.column_id) &&
    typeof value.issue_number === "number" &&
    Number.isSafeInteger(value.issue_number) &&
    value.issue_number > 0 &&
    typeof value.title === "string" &&
    (value.description === null || typeof value.description === "string") &&
    (value.status === "assigned" ||
      value.status === "in_progress" ||
      value.status === "completed") &&
    typeof value.position === "number" &&
    Number.isFinite(value.position) &&
    isNames(value.assignees) &&
    isNames(value.labels) &&
    isDate(value.created_at) &&
    isDate(value.updated_at)
  );
}

function isPage(value: unknown): value is KanbanPage {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isTask) &&
    typeof value.total === "number" &&
    Number.isSafeInteger(value.total) &&
    value.total >= 0 &&
    typeof value.limit === "number" &&
    Number.isSafeInteger(value.limit) &&
    value.limit >= 1 &&
    value.limit <= 100 &&
    typeof value.offset === "number" &&
    Number.isSafeInteger(value.offset) &&
    value.offset >= 0 &&
    value.items.length <= value.limit &&
    value.items.length <= value.total
  );
}

const fieldMessages: Record<string, string> = {
  title: "공백이 아닌 제목을 입력해 주세요.",
  description: "설명을 확인해 주세요.",
  status: "할 일, 진행 중, 완료 중에서 선택해 주세요.",
  assignees: "공유 보드에 등록된 GitHub 사용자명을 확인해 주세요.",
  labels: "라벨 이름을 확인해 주세요.",
};

function validationErrors(payload: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isRecord(payload) || !Array.isArray(payload.detail)) return errors;
  const issues: unknown[] = payload.detail;
  for (const issue of issues) {
    if (!isRecord(issue) || !Array.isArray(issue.loc) || issue.loc[0] !== "body")
      continue;
    const field: unknown = issue.loc[1];
    if (typeof field === "string" && Object.hasOwn(fieldMessages, field)) {
      const message = fieldMessages[field];
      if (message) errors[field] = message;
    }
  }
  return errors;
}

function errorMessage(status: number): string {
  if (status === 401 || status === 403)
    return "공유 칸반에 접근할 수 없습니다. 서버의 팀 인증과 보드 멤버 설정을 확인해 주세요.";
  if (status === 404) return "공유 작업을 찾을 수 없습니다. 보드를 새로고침해 주세요.";
  if (status === 409)
    return "이동할 상태의 보드 열을 찾을 수 없습니다. 서버의 보드 열 설정을 확인해 주세요.";
  if (status === 422 || status === 400)
    return "입력 내용을 확인해 주세요. 담당자는 보드에 등록된 GitHub 사용자명이어야 합니다.";
  if (status === 503)
    return "공유 칸반에 연결할 수 없습니다. 서버의 연결 설정을 확인한 뒤 다시 시도해 주세요.";
  return "공유 칸반 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function uncertainMessage(method: string): string {
  if (method === "POST")
    return "등록 결과를 확인하지 못했습니다. 다시 등록하기 전에 보드를 새로고침해 저장 여부를 확인해 주세요.";
  if (method === "PATCH")
    return "이동 결과를 확인하지 못했습니다. 보드를 새로고침해 현재 상태를 확인해 주세요.";
  return "공유 칸반 응답을 확인하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.";
}

async function request<T>(
  path: string,
  method: string,
  valid: (value: unknown) => value is T,
  body?: KanbanInput | { status: KanbanStatus },
  signal?: AbortSignal,
): Promise<T> {
  const options: RequestInit = { method, cache: "no-store" };
  if (signal) options.signal = signal;
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(`/api/kanban/tasks${path}`, options);
  } catch (error) {
    if (signal?.aborted || (isRecord(error) && error.name === "AbortError"))
      throw error;
    throw new KanbanError(0, uncertainMessage(method));
  }
  const failureMessage =
    response.status >= 500 && (method === "POST" || method === "PATCH")
      ? uncertainMessage(method)
      : errorMessage(response.status);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (signal?.aborted || (isRecord(error) && error.name === "AbortError"))
      throw error;
    throw new KanbanError(
      response.status,
      response.ok ? uncertainMessage(method) : failureMessage,
    );
  }
  if (!response.ok)
    throw new KanbanError(
      response.status,
      failureMessage,
      response.status === 422 ? validationErrors(payload) : {},
    );
  if (!valid(payload)) throw new KanbanError(response.status, uncertainMessage(method));
  return payload;
}

/** 페이지별 목록을 동일 출처의 서버 프록시로 조회합니다. */
export function listKanbanTasks(
  page: { limit?: number; offset?: number } = {},
  signal?: AbortSignal,
): Promise<KanbanPage> {
  const query = new URLSearchParams({
    limit: String(page.limit ?? 100),
    offset: String(page.offset ?? 0),
  });
  return request(`?${query.toString()}`, "GET", isPage, undefined, signal);
}

/** 모든 페이지가 확인된 경우에만 완전한 보드 목록을 반환합니다. */
export async function loadKanbanBoard(signal?: AbortSignal): Promise<KanbanTask[]> {
  const items: KanbanTask[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;
  do {
    const page = await listKanbanTasks({ limit: 100, offset: items.length }, signal);
    expectedTotal ??= page.total;
    if (
      page.total !== expectedTotal ||
      page.offset !== items.length ||
      (page.items.length === 0 && items.length < page.total)
    ) {
      throw new KanbanError(
        0,
        "조회 중 보드 목록이 변경되었습니다. 새로고침해 전체 목록을 다시 확인해 주세요.",
      );
    }
    for (const item of page.items) {
      if (ids.has(item.id))
        throw new KanbanError(
          0,
          "조회 중 카드 위치가 변경되었습니다. 보드를 새로고침해 주세요.",
        );
      ids.add(item.id);
      items.push(item);
    }
  } while (items.length < expectedTotal);
  return items;
}

/** UUID로 공유 작업 한 개를 조회합니다. */
export function getKanbanTask(id: string, signal?: AbortSignal): Promise<KanbanTask> {
  return request(`/${encodeURIComponent(id)}`, "GET", isTask, undefined, signal);
}

/** 공유 보드에 한 번만 등록하며 자동 재시도하지 않습니다. */
export function createKanbanTask(input: KanbanInput): Promise<KanbanTask> {
  return request("", "POST", isTask, input);
}

/** 기존 제목·담당자·라벨을 보내지 않고 상태만 변경합니다. */
export function moveKanbanTask(id: string, status: KanbanStatus): Promise<KanbanTask> {
  return request(`/${encodeURIComponent(id)}`, "PATCH", isTask, { status });
}
