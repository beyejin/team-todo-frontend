import { describe, expect, it } from "vitest";

import {
  applyFilterDraft,
  filtersToDraft,
  filtersToQuery,
  hasFilters,
  lastPageOffset,
  parseFilters,
} from "./filters";

describe("FE-004 목록 조건과 URL", () => {
  it("복수 상태·정확한 이름·false·페이지 값을 다시 읽는다", () => {
    const { filters, error } = parseFilters(
      "status=assigned&status=in_progress&assignee=민수&tag=frontend&label=이번+주&include_completed=false&limit=2&offset=4",
    );
    expect(error).toBe("");
    expect(filters).toEqual({
      status: ["assigned", "in_progress"],
      assignee: "민수",
      tag: "frontend",
      label: "이번 주",
      include_completed: false,
      limit: 2,
      offset: 4,
    });
    expect(parseFilters(filtersToQuery(filters)).filters).toEqual(filters);
  });

  it("필터 적용은 offset을 초기화하고 시간 경계를 UTC 순간으로 보존한다", () => {
    const original = parseFilters("offset=40").filters;
    const draft = {
      ...filtersToDraft(original),
      due_from: "2026-11-02T09:00",
      due_to: "2026-11-02T18:00",
      tag: " api ",
    };
    const filters = applyFilterDraft(draft, original);
    expect(filters).toEqual({
      include_completed: true,
      limit: 20,
      offset: 0,
      tag: "api",
      due_from: new Date(draft.due_from).toISOString(),
      due_to: new Date(draft.due_to).toISOString(),
    });
    expect(filtersToDraft(filters).due_from).toBe(draft.due_from);
  });

  it.each([
    "status=blocked",
    "priority=urgent",
    "limit=101",
    "offset=-1",
    "offset=1.5",
    "include_completed=maybe",
    "due_from=not-a-date",
    "due_from=2026-11-02T09:00",
    "due_from=2026-11-03T00:00:00Z&due_to=2026-11-02T00:00:00Z",
  ])("잘못된 URL %s는 요청 전에 오류가 된다", (query) => {
    expect(parseFilters(query).error).not.toBe("");
  });

  it.each([
    { due_from: "2026-02-30T09:00", due_to: "" },
    { due_from: "2026-11-03T09:00", due_to: "2026-11-02T09:00" },
  ])("잘못된 날짜 입력은 URL로 적용하지 않는다: %j", (dates) => {
    const draft = { ...filtersToDraft(parseFilters("").filters), ...dates };
    expect(() => applyFilterDraft(draft, parseFilters("").filters)).toThrow();
  });

  it("휴지통은 활성 목록 조건을 전송하지 않는다", () => {
    const { filters, error } = parseFilters(
      "status=blocked&tag=api&include_completed=false&limit=10&offset=20",
      true,
    );
    expect(error).toBe("");
    expect(filtersToQuery(filters, true)).toBe("limit=10&offset=20");
  });

  it("다른 필터만 바꾸면 기존 날짜 경계의 초와 밀리초를 보존한다", () => {
    const original = parseFilters(
      "due_from=2026-11-02T00:00:30.125Z&due_to=2026-11-02T01:00:59.875Z",
    ).filters;
    const draft = { ...filtersToDraft(original), tag: "새 태그" };
    const applied = applyFilterDraft(draft, original);
    expect(applied.due_from).toBe(original.due_from);
    expect(applied.due_to).toBe(original.due_to);
    expect(applied.tag).toBe("새 태그");
  });

  it("보존된 원본의 시간대 표기가 달라도 실제 시각으로 범위를 비교한다", () => {
    const query = new URLSearchParams({
      due_from: "2026-11-02T09:00:30+09:00",
      due_to: "2026-11-02T01:00:00Z",
    });
    const original = parseFilters(query.toString()).filters;
    expect(() => applyFilterDraft(filtersToDraft(original), original)).not.toThrow();
    const applied = applyFilterDraft(filtersToDraft(original), original);
    expect(applied.due_from).toBe(original.due_from);
    expect(applied.due_to).toBe(original.due_to);
  });

  it("기본 페이지 설정만으로 필터 결과 없음이라고 표시하지 않는다", () => {
    expect(hasFilters(parseFilters("limit=50&offset=50").filters)).toBe(false);
    expect(hasFilters(parseFilters("include_completed=false").filters)).toBe(true);
  });

  it.each([
    [0, 0],
    [20, 0],
    [21, 20],
    [40, 20],
  ])("총 %i개일 때 마지막 offset은 %i이다", (total, offset) => {
    expect(lastPageOffset(total, 20)).toBe(offset);
  });
});
