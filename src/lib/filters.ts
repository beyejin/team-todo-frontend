import { toLocalDateTime } from "./draft";
import type { TaskFilters, TaskPriority, TaskStatus } from "./tasks";

export const taskStatuses: TaskStatus[] = ["assigned", "in_progress", "completed"];
export const taskPriorities: TaskPriority[] = ["low", "medium", "high"];

/** URL과 API에서 공유하는 확정된 목록 조건입니다. */
export interface ListFilters extends TaskFilters {
  include_completed: boolean;
  limit: number;
  offset: number;
}

/** 적용 전 입력값은 날짜의 현지 시각을 유지합니다. */
export interface FilterDraft {
  status: TaskStatus[];
  assignee: string;
  priority: TaskPriority | "";
  due_from: string;
  due_to: string;
  tag: string;
  label: string;
  include_completed: boolean;
}

function isStatus(value: string): value is TaskStatus {
  return taskStatuses.some((status) => status === value);
}

function isPriority(value: string): value is TaskPriority {
  return taskPriorities.some((priority) => priority === value);
}

/** 잘못된 주소 조건을 서버 요청으로 보내기 전에 구분합니다. */
export function parseFilters(
  query: string,
  trash = false,
): { filters: ListFilters; error: string } {
  const params = new URLSearchParams(query);
  const filters: ListFilters = { include_completed: true, limit: 20, offset: 0 };
  for (const key of ["limit", "offset"] as const) {
    const raw = params.get(key);
    if (raw === null) continue;
    const value = Number(raw);
    if (
      !/^\d+$/.test(raw) ||
      !Number.isSafeInteger(value) ||
      (key === "limit" ? value < 1 || value > 100 : value < 0)
    ) {
      return {
        filters,
        error: "페이지 주소가 올바르지 않습니다. 필터를 초기화해 주세요.",
      };
    }
    filters[key] = value;
  }
  if (trash) return { filters, error: "" };

  const statuses = params.getAll("status");
  if (!statuses.every(isStatus))
    return { filters, error: "주소의 상태 필터를 확인해 주세요." };
  if (statuses.length) filters.status = [...new Set(statuses)];
  const priority = params.get("priority");
  if (priority) {
    if (!isPriority(priority))
      return { filters, error: "주소의 우선순위 필터를 확인해 주세요." };
    filters.priority = priority;
  }
  for (const key of ["assignee", "tag", "label"] as const) {
    const value = params.get(key)?.trim();
    if (value) filters[key] = value;
  }
  const completed = params.get("include_completed");
  if (completed !== null && completed !== "true" && completed !== "false") {
    return { filters, error: "주소의 완료 포함 조건을 확인해 주세요." };
  }
  filters.include_completed = completed !== "false";
  for (const key of ["due_from", "due_to"] as const) {
    const value = params.get(key);
    if (!value) continue;
    if (
      !/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ||
      Number.isNaN(new Date(value).getTime())
    ) {
      return { filters, error: "마감일 필터에는 올바른 날짜와 시간대가 필요합니다." };
    }
    filters[key] = value;
  }
  if (
    filters.due_from &&
    filters.due_to &&
    new Date(filters.due_from) > new Date(filters.due_to)
  ) {
    return { filters, error: "마감 시작 시각은 끝 시각보다 늦을 수 없습니다." };
  }
  return { filters, error: "" };
}

/** 새로고침과 뒤로 가기에서 날짜를 포함한 폼 값을 복원합니다. */
export function filtersToDraft(filters: ListFilters): FilterDraft {
  return {
    status: filters.status ?? [],
    assignee: filters.assignee ?? "",
    priority: filters.priority ?? "",
    due_from: toLocalDateTime(filters.due_from ?? null),
    due_to: toLocalDateTime(filters.due_to ?? null),
    tag: filters.tag ?? "",
    label: filters.label ?? "",
    include_completed: filters.include_completed,
  };
}

/** 적용한 조건은 첫 페이지에서 시작하며 날짜 경계는 확장하지 않습니다. */
export function applyFilterDraft(
  draft: FilterDraft,
  original: ListFilters,
): ListFilters {
  const filters: ListFilters = {
    include_completed: draft.include_completed,
    limit: original.limit,
    offset: 0,
  };
  if (draft.status.length) filters.status = draft.status;
  if (draft.priority) filters.priority = draft.priority;
  for (const key of ["assignee", "tag", "label"] as const) {
    const value = draft[key].trim();
    if (value) filters[key] = value;
  }
  for (const key of ["due_from", "due_to"] as const) {
    const value = draft[key];
    if (!value) continue;
    const previous = original[key];
    if (previous && value === toLocalDateTime(previous)) {
      filters[key] = previous;
      continue;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime()) || toLocalDateTime(date.toISOString()) !== value) {
      throw new Error("마감 범위에 올바른 날짜와 시간을 입력해 주세요.");
    }
    filters[key] = date.toISOString();
  }
  if (
    filters.due_from &&
    filters.due_to &&
    new Date(filters.due_from) > new Date(filters.due_to)
  ) {
    throw new Error("마감 시작 시각은 끝 시각보다 늦을 수 없습니다.");
  }
  return filters;
}

/** 상태는 반복 쿼리로 만들고 휴지통에는 페이지 값만 남깁니다. */
export function filtersToQuery(filters: ListFilters, trash = false): string {
  const query = new URLSearchParams();
  if (!trash) {
    for (const status of filters.status ?? []) query.append("status", status);
    for (const key of [
      "assignee",
      "priority",
      "due_from",
      "due_to",
      "tag",
      "label",
    ] as const) {
      const value = filters[key];
      if (value) query.set(key, value);
    }
    if (!filters.include_completed) query.set("include_completed", "false");
  }
  if (filters.limit !== 20) query.set("limit", String(filters.limit));
  if (filters.offset) query.set("offset", String(filters.offset));
  return query.toString();
}

/** 빈 작업공간과 필터 결과 없음을 구분합니다. */
export function hasFilters(filters: ListFilters): boolean {
  return Boolean(
    filters.status?.length ||
    filters.assignee ||
    filters.priority ||
    filters.due_from ||
    filters.due_to ||
    filters.tag ||
    filters.label ||
    !filters.include_completed,
  );
}

/** 삭제나 복구로 페이지가 줄었을 때 마지막 유효 위치를 계산합니다. */
export function lastPageOffset(total: number, limit: number): number {
  return Math.max(0, Math.ceil(total / limit) - 1) * limit;
}
