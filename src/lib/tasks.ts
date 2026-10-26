/** 로컬 Todo API가 사용하는 상태입니다. */
export type TaskStatus = "assigned" | "in_progress" | "completed";

/** 로컬 Todo API가 사용하는 우선순위입니다. */
export type TaskPriority = "low" | "medium" | "high";

/** 서버가 반환하는 할 일과 연결된 이름 목록입니다. */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  assignees: string[];
  tags: string[];
  labels: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** 현재 필터의 전체 개수와 한 페이지의 항목입니다. */
export interface TaskPage {
  items: Task[];
  total: number;
  limit: number;
  offset: number;
}

/** 생성 시 제목만 필수이며 나머지는 서버 기본값을 사용할 수 있습니다. */
export interface TaskInput {
  title: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_at?: string | null;
  assignees?: string[];
  tags?: string[];
  labels?: string[];
}

/** 생략한 값은 유지하고, 배열은 전체 교체합니다. */
export type TaskPatch = Partial<TaskInput>;

/** 활성 목록에 적용할 서버 필터입니다. */
export interface TaskFilters {
  status?: TaskStatus[];
  assignee?: string;
  priority?: TaskPriority;
  due_from?: string;
  due_to?: string;
  tag?: string;
  label?: string;
  include_completed?: boolean;
  limit?: number;
  offset?: number;
}

/** 화면에 안전하게 표시할 메시지와 필드별 검증 오류입니다. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const validationMessages = {
  title: "공백이 아닌 제목을 입력해 주세요.",
  description: "설명을 문자로 입력해 주세요.",
  status: "할당, 진행 중, 완료 중에서 상태를 선택해 주세요.",
  priority: "낮음, 보통, 높음 중에서 우선순위를 선택해 주세요.",
  due_at: "마감일의 날짜와 시간대를 확인해 주세요.",
  assignees: "담당자 이름을 확인해 주세요.",
  tags: "태그를 확인해 주세요.",
  labels: "라벨을 확인해 주세요.",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function isNames(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item: unknown) => typeof item === "string")
  );
}

function isTask(value: unknown): value is Task {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    typeof value.title === "string" &&
    (value.description === null || typeof value.description === "string") &&
    (value.status === "assigned" ||
      value.status === "in_progress" ||
      value.status === "completed") &&
    (value.priority === "low" ||
      value.priority === "medium" ||
      value.priority === "high") &&
    (value.due_at === null || isTimestamp(value.due_at)) &&
    isNames(value.assignees) &&
    isNames(value.tags) &&
    isNames(value.labels) &&
    isTimestamp(value.created_at) &&
    isTimestamp(value.updated_at) &&
    (value.deleted_at === null || isTimestamp(value.deleted_at))
  );
}

function isTaskPage(value: unknown): value is TaskPage {
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
    value.offset >= 0
  );
}

function fieldErrors(payload: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isRecord(payload) || !Array.isArray(payload.detail)) return errors;

  const issues: unknown[] = payload.detail;
  for (const issue of issues) {
    if (!isRecord(issue) || !Array.isArray(issue.loc) || issue.loc[0] !== "body") {
      continue;
    }
    const field: unknown = issue.loc[1];
    if (typeof field === "string" && Object.hasOwn(validationMessages, field)) {
      errors[field] = validationMessages[field as keyof typeof validationMessages];
    }
  }
  return errors;
}

function errorMessage(status: number): string {
  if (status === 400) return "필터와 날짜 범위를 확인해 주세요.";
  if (status === 401) {
    return "백엔드 인증을 확인하지 못했습니다. 서버의 API 토큰과 연결 설정을 확인해 주세요.";
  }
  if (status === 404)
    return "할 일을 찾을 수 없습니다. 삭제되었거나 존재하지 않는 항목입니다.";
  if (status === 422) return "입력 내용과 형식을 확인해 주세요.";
  return "서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function responseFailure(method: string, isCreation: boolean): string {
  if (isCreation)
    return "저장 결과를 확인하지 못했습니다. 다시 등록하기 전에 목록에서 저장 여부를 확인해 주세요.";
  if (method !== "GET")
    return "변경 결과를 확인하지 못했습니다. 다시 요청하기 전에 목록이나 상세를 새로고침해 현재 상태를 확인해 주세요.";
  return "서버 응답을 확인하지 못했습니다. 백엔드 실행 상태와 연결 주소를 확인한 뒤 다시 시도해 주세요.";
}

async function request<T>(
  path: string,
  method: string,
  isValid: (value: unknown) => value is T,
  body?: TaskInput | TaskPatch,
  signal?: AbortSignal,
): Promise<T> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");
  const isCreation = method === "POST" && path === "/api/v1/tasks";
  const options: RequestInit = { method, cache: "no-store" };
  if (signal) options.signal = signal;
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json" };
    options.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, options);
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    throw new ApiError(0, responseFailure(method, isCreation));
  }

  const failureMessage =
    response.status >= 500 && method !== "GET"
      ? responseFailure(method, isCreation)
      : errorMessage(response.status);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      throw error;
    }
    throw new ApiError(
      response.status,
      response.ok ? responseFailure(method, isCreation) : failureMessage,
    );
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      failureMessage,
      response.status === 422 ? fieldErrors(payload) : {},
    );
  }
  if (!isValid(payload))
    throw new ApiError(response.status, responseFailure(method, isCreation));
  return payload;
}

function listPath(path: string, filters: TaskFilters): string {
  const { status, ...values } = filters;
  const query = new URLSearchParams();
  for (const value of status ?? []) query.append("status", value);
  for (const [key, value] of Object.entries(values)) {
    if (value !== "") query.set(key, String(value));
  }
  return query.size ? `${path}?${query.toString()}` : path;
}

/** 모든 필터에 맞는 활성 할 일 목록을 조회합니다. */
export function listTasks(
  filters: TaskFilters,
  signal?: AbortSignal,
): Promise<TaskPage> {
  return request(
    listPath("/api/v1/tasks", filters),
    "GET",
    isTaskPage,
    undefined,
    signal,
  );
}

/** 활성 할 일의 상세를 조회합니다. */
export function getTask(id: number, signal?: AbortSignal): Promise<Task> {
  return request(`/api/v1/tasks/${String(id)}`, "GET", isTask, undefined, signal);
}

/** 할 일을 한 번 생성하며 실패한 요청을 자동 재전송하지 않습니다. */
export function createTask(input: TaskInput): Promise<Task> {
  return request("/api/v1/tasks", "POST", isTask, input);
}

/** 전달한 필드만 수정합니다. */
export function updateTask(id: number, patch: TaskPatch): Promise<Task> {
  return request(`/api/v1/tasks/${String(id)}`, "PATCH", isTask, patch);
}

/** 할 일을 휴지통으로 이동하고 삭제 시각이 포함된 항목을 반환합니다. */
export function deleteTask(id: number): Promise<Task> {
  return request(`/api/v1/tasks/${String(id)}`, "DELETE", isTask);
}

/** 휴지통 목록은 페이지 값만 받습니다. */
export function listDeletedTasks(
  page: { limit?: number; offset?: number },
  signal?: AbortSignal,
): Promise<TaskPage> {
  return request(
    listPath("/api/v1/tasks/deleted", page),
    "GET",
    isTaskPage,
    undefined,
    signal,
  );
}

/** 삭제된 할 일을 복구하고 서버의 전체 항목을 반환합니다. */
export function restoreTask(id: number): Promise<Task> {
  return request(`/api/v1/tasks/${String(id)}/restore`, "POST", isTask);
}
