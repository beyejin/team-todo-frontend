import { describe, expect, it } from "vitest";
import {
  draftToInput,
  draftToPatch,
  normalizeNames,
  taskToDraft,
  toLocalDateTime,
  validateDraft,
} from "./draft";
import type { Task } from "./tasks";

const task: Task = {
  id: 12,
  title: "발표 준비",
  description: "자료 모으기",
  status: "in_progress",
  priority: "high",
  due_at: "2026-11-02T00:00:35.123Z",
  assignees: ["예진", "민수"],
  tags: ["수업"],
  labels: ["발표"],
  created_at: "2026-10-26T00:00:00Z",
  updated_at: "2026-10-26T00:00:00Z",
  deleted_at: null,
};

describe("할 일 입력 변환", () => {
  it("FE-002: 제목 공백을 제거하고 빈 선택값과 기본값을 전송한다", () => {
    expect(draftToInput({ ...taskToDraft(), title: "  새 할 일  " })).toEqual({
      title: "새 할 일",
      description: null,
      status: "assigned",
      priority: "medium",
      due_at: null,
      assignees: [],
      tags: [],
      labels: [],
    });
    expect(normalizeNames(" 예진, 민수,,예진, ")).toEqual(["예진", "민수"]);
  });

  it("FE-002: 공백 제목과 존재하지 않는 날짜를 거부한다", () => {
    expect(validateDraft({ ...taskToDraft(), title: "  " })).toHaveProperty("title");
    expect(
      validateDraft({ ...taskToDraft(), title: "일", due_at: "잘못된 날짜" }),
    ).toHaveProperty("due_at");
    expect(
      validateDraft({ ...taskToDraft(), title: "일", due_at: "2026-02-31T09:00" }),
    ).toHaveProperty("due_at");
  });

  it("FE-003·012: 제목만 바꾸면 날짜 정밀도와 다른 필드를 건드리지 않는다", () => {
    expect(draftToPatch(task, { ...taskToDraft(task), title: "수정한 제목" })).toEqual({
      title: "수정한 제목",
    });
    expect(draftToPatch(task, taskToDraft(task))).toEqual({});
  });

  it("FE-003: 설명·마감일을 null로, 지운 배열을 빈 배열로 수정한다", () => {
    expect(
      draftToPatch(task, {
        ...taskToDraft(task),
        description: "",
        due_at: "",
        assignees: "새 담당자",
        tags: "",
        labels: "",
        status: "assigned",
      }),
    ).toEqual({
      description: null,
      due_at: null,
      assignees: ["새 담당자"],
      tags: [],
      labels: [],
      status: "assigned",
    });
  });

  it("FE-003: 배열 공백과 중복만 바뀌면 PATCH에 포함하지 않는다", () => {
    expect(
      draftToPatch(task, { ...taskToDraft(task), assignees: "예진, 민수, 예진, " }),
    ).toEqual({});
  });

  it("FE-003: 기존 빈 설명과 쉼표를 포함한 이름도 손대지 않으면 보존한다", () => {
    const original = { ...task, description: "", assignees: ["Kim, Alex"] };
    expect(
      draftToPatch(original, { ...taskToDraft(original), title: "새 제목" }),
    ).toEqual({ title: "새 제목" });
  });

  it("FE-012: 현지 날짜와 UTC는 같은 순간이며 재편집 시각이 유지된다", () => {
    const localDate = "2026-11-02T09:00";
    const input = draftToInput({
      ...taskToDraft(),
      title: "날짜 확인",
      due_at: localDate,
    });
    expect(input.due_at).toBe(new Date(2026, 10, 2, 9, 0).toISOString());
    expect(toLocalDateTime(input.due_at ?? null)).toBe(localDate);
    const boundary = "2026-11-02T00:30";
    expect(
      draftToInput({ ...taskToDraft(), title: "경계", due_at: boundary }).due_at,
    ).toBe(new Date(2026, 10, 2, 0, 30).toISOString());
  });
});
