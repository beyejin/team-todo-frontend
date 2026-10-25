import type { Task, TaskInput, TaskPatch, TaskPriority, TaskStatus } from "./tasks";

/** 폼의 문자열 입력을 API 데이터와 분리해 저장합니다. */
export interface TaskDraft {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string;
  assignees: string;
  tags: string;
  labels: string;
}

/** UTC 응답을 브라우저 현지 시각의 분 단위 입력값으로 바꿉니다. */
export function toLocalDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (part: number): string => String(part).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 신규 기본값 또는 기존 할 일을 편집할 입력값을 만듭니다. */
export function taskToDraft(task?: Task): TaskDraft {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "assigned",
    priority: task?.priority ?? "medium",
    due_at: toLocalDateTime(task?.due_at ?? null),
    assignees: task?.assignees.join(", ") ?? "",
    tags: task?.tags.join(", ") ?? "",
    labels: task?.labels.join(", ") ?? "",
  };
}

/** 쉼표로 나눈 이름에서 공백, 빈 항목과 중복을 제거합니다. */
export function normalizeNames(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

/** 필수 제목과 현지 시각의 유효성을 확인합니다. */
export function validateDraft(draft: TaskDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.title.trim()) errors.title = "공백이 아닌 제목을 입력해 주세요.";
  if (draft.due_at) {
    const date = new Date(draft.due_at);
    if (
      Number.isNaN(date.getTime()) ||
      toLocalDateTime(date.toISOString()) !== draft.due_at
    ) {
      errors.due_at = "올바른 마감 날짜와 시간을 입력해 주세요.";
    }
  }
  return errors;
}

/** 검증을 통과한 입력을 생성 요청으로 변환합니다. */
export function draftToInput(draft: TaskDraft): Required<TaskInput> {
  return {
    title: draft.title.trim(),
    description: draft.description || null,
    status: draft.status,
    priority: draft.priority,
    due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
    assignees: normalizeNames(draft.assignees),
    tags: normalizeNames(draft.tags),
    labels: normalizeNames(draft.labels),
  };
}

/** 변경 필드만 보내며 손대지 않은 마감일의 초·밀리초를 보존합니다. */
export function draftToPatch(task: Task, draft: TaskDraft): TaskPatch {
  const input = draftToInput(draft);
  const patch: TaskPatch = {};
  if (input.title !== task.title) patch.title = input.title;
  if (draft.description !== (task.description ?? ""))
    patch.description = input.description;
  if (input.status !== task.status) patch.status = input.status;
  if (input.priority !== task.priority) patch.priority = input.priority;
  if (draft.due_at !== toLocalDateTime(task.due_at)) patch.due_at = input.due_at;
  for (const field of ["assignees", "tags", "labels"] as const) {
    if (draft[field] === task[field].join(", ")) continue;
    const values = input[field];
    if (JSON.stringify(values) !== JSON.stringify(task[field])) patch[field] = values;
  }
  return patch;
}
