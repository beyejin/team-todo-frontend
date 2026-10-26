"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type SubmitEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Field } from "@astryxdesign/core/Field";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import {
  ArrowCounterClockwiseIcon,
  FunnelSimpleIcon,
  ListChecksIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";

import {
  applyFilterDraft,
  filtersToDraft,
  filtersToQuery,
  hasFilters,
  lastPageOffset,
  parseFilters,
  taskPriorities,
  taskStatuses,
  type ListFilters,
} from "@/lib/filters";
import {
  ApiError,
  listDeletedTasks,
  listTasks,
  restoreTask,
  type Task,
  type TaskPage,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

const statusLabels: Record<TaskStatus, string> = {
  assigned: "할당",
  in_progress: "진행 중",
  completed: "완료",
};
const priorityLabels: Record<TaskPriority, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

function FilterForm({
  filters,
  onApply,
}: {
  filters: ListFilters;
  onApply: (next: ListFilters) => void;
}) {
  const [draft, setDraft] = useState(() => filtersToDraft(filters));
  const [error, setError] = useState("");
  const id = useId();

  function apply(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const dateInputs = event.currentTarget.querySelectorAll<HTMLInputElement>(
      'input[type="datetime-local"]',
    );
    if ([...dateInputs].some((input) => input.validity.badInput)) {
      setError("마감 범위에 올바른 날짜와 시간을 입력해 주세요.");
      return;
    }
    try {
      const next = applyFilterDraft(draft, filters);
      setError("");
      onApply(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "필터를 확인해 주세요.");
    }
  }

  return (
    <details className="filter-panel" open={hasFilters(filters)}>
      <summary>
        <FunnelSimpleIcon size={20} aria-hidden />
        <Text type="label">목록 필터</Text>
      </summary>
      <form onSubmit={apply} noValidate>
        <VStack gap={4} padding={4}>
          <fieldset className="filter-statuses">
            <legend>상태 · 여러 개 선택</legend>
            <HStack gap={4} wrap="wrap">
              {taskStatuses.map((status) => (
                <CheckboxInput
                  key={status}
                  label={statusLabels[status]}
                  value={draft.status.includes(status)}
                  onChange={(checked) => {
                    setDraft({
                      ...draft,
                      status: checked
                        ? [...draft.status, status]
                        : draft.status.filter((value) => value !== status),
                    });
                  }}
                />
              ))}
            </HStack>
          </fieldset>
          <HStack className="filter-grid" gap={4} wrap="wrap">
            <TextInput
              label="담당자"
              placeholder="이름 정확히 입력"
              value={draft.assignee}
              onChange={(assignee) => {
                setDraft({ ...draft, assignee });
              }}
            />
            <Selector
              label="우선순위"
              value={draft.priority}
              options={[
                { value: "", label: "전체" },
                ...taskPriorities.map((value) => ({
                  value,
                  label: priorityLabels[value],
                })),
              ]}
              onChange={(value) => {
                setDraft({
                  ...draft,
                  priority: taskPriorities.find((priority) => priority === value) ?? "",
                });
              }}
            />
            <TextInput
              label="태그"
              placeholder="태그 정확히 입력"
              value={draft.tag}
              onChange={(tag) => {
                setDraft({ ...draft, tag });
              }}
            />
            <TextInput
              label="라벨"
              placeholder="라벨 정확히 입력"
              value={draft.label}
              onChange={(label) => {
                setDraft({ ...draft, label });
              }}
            />
            <Field label="마감 시작" inputID={`${id}-from`}>
              <input
                className="native-date-input"
                id={`${id}-from`}
                type="datetime-local"
                value={draft.due_from}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => {
                  setDraft({ ...draft, due_from: event.target.value });
                }}
              />
            </Field>
            <Field label="마감 끝" inputID={`${id}-to`}>
              <input
                className="native-date-input"
                id={`${id}-to`}
                type="datetime-local"
                value={draft.due_to}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => {
                  setDraft({ ...draft, due_to: event.target.value });
                }}
              />
            </Field>
          </HStack>
          <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
            <CheckboxInput
              label="완료 항목 포함"
              value={draft.include_completed}
              onChange={(include_completed) => {
                setDraft({ ...draft, include_completed });
              }}
            />
            <HStack gap={2}>
              <Button
                label="필터 초기화"
                variant="ghost"
                onClick={() => {
                  setDraft(filtersToDraft(parseFilters("").filters));
                  setError("");
                  onApply({ include_completed: true, limit: filters.limit, offset: 0 });
                }}
              />
              <Button label="필터 적용" type="submit" variant="primary" />
            </HStack>
          </HStack>
          {error && (
            <Text role="alert" id={`${id}-error`}>
              {error}
            </Text>
          )}
          {draft.status.includes("completed") && !draft.include_completed && (
            <Text type="supporting">
              완료 항목을 제외하면 완료 상태를 선택해도 결과가 없습니다.
            </Text>
          )}
        </VStack>
      </form>
    </details>
  );
}

function TaskStatusLabel({ task }: { task: Task }) {
  return (
    <HStack className="task-status" gap={2} vAlign="center">
      <StatusDot
        label={statusLabels[task.status]}
        variant={
          task.status === "completed"
            ? "success"
            : task.status === "in_progress"
              ? "accent"
              : "neutral"
        }
      />
      <Text type="supporting">{statusLabels[task.status]}</Text>
    </HStack>
  );
}

function dueLabel(due: string | null): string {
  return due
    ? new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(due))
    : "미지정";
}

function TaskMetadata({ task, trash }: { task: Task; trash: boolean }) {
  return (
    <VStack className="task-metadata" gap={1}>
      {trash && task.description && <Text type="supporting">{task.description}</Text>}
      {task.tags.length > 0 && (
        <Text type="supporting">태그 {task.tags.join(" · ")}</Text>
      )}
      {task.labels.length > 0 && (
        <Text type="supporting">라벨 {task.labels.join(" · ")}</Text>
      )}
      {trash && task.deleted_at && (
        <Text type="supporting">삭제 {dueLabel(task.deleted_at)}</Text>
      )}
    </VStack>
  );
}

function TaskRows({
  tasks,
  trash,
  restoring,
  onRestore,
}: {
  tasks: Task[];
  trash: boolean;
  restoring: number | null;
  onRestore: (task: Task) => Promise<void>;
}) {
  function title(task: Task) {
    return trash ? (
      <Text weight="medium">{task.title}</Text>
    ) : (
      <Link className="task-title" href={`/tasks/${String(task.id)}`}>
        {task.title}
      </Link>
    );
  }
  function restoreButton(task: Task) {
    return (
      <Button
        label={`${task.title} 복구`}
        size="sm"
        icon={<ArrowCounterClockwiseIcon size={20} aria-hidden />}
        isLoading={restoring === task.id}
        isDisabled={restoring !== null && restoring !== task.id}
        onClick={() => {
          void onRestore(task);
        }}
      >
        복구
      </Button>
    );
  }

  return (
    <>
      <VStack className="task-table-desktop">
        <Table
          aria-label={trash ? "휴지통 항목" : "할 일 목록"}
          density="balanced"
          dividers="rows"
          hasHover
        >
          <TableHeader>
            <TableRow>
              <TableHeaderCell scope="col">할 일</TableHeaderCell>
              <TableHeaderCell scope="col">상태</TableHeaderCell>
              <TableHeaderCell scope="col">우선순위</TableHeaderCell>
              <TableHeaderCell scope="col">담당자</TableHeaderCell>
              <TableHeaderCell scope="col">마감</TableHeaderCell>
              {trash && <TableHeaderCell scope="col">복구</TableHeaderCell>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow className="task-row" key={task.id}>
                <TableCell>
                  <VStack gap={1}>
                    {title(task)}
                    <TaskMetadata task={task} trash={trash} />
                  </VStack>
                </TableCell>
                <TableCell>
                  <TaskStatusLabel task={task} />
                </TableCell>
                <TableCell>
                  <Text type="supporting">{priorityLabels[task.priority]}</Text>
                </TableCell>
                <TableCell>
                  <Text type="supporting">
                    {task.assignees.join(", ") || "담당자 없음"}
                  </Text>
                </TableCell>
                <TableCell>
                  <Text type="supporting">{dueLabel(task.due_at)}</Text>
                </TableCell>
                {trash && <TableCell>{restoreButton(task)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </VStack>
      <VStack className="task-list-mobile">
        <List
          aria-label={trash ? "모바일 휴지통 항목" : "모바일 할 일 목록"}
          hasDividers
          edge="flush"
        >
          {tasks.map((task) => (
            <ListItem
              key={task.id}
              label={title(task)}
              align="start"
              endContent={trash ? restoreButton(task) : undefined}
              description={
                <VStack gap={2} paddingBlock={2}>
                  <HStack gap={3} wrap="wrap">
                    <TaskStatusLabel task={task} />
                    <Text type="supporting">
                      우선순위 {priorityLabels[task.priority]}
                    </Text>
                  </HStack>
                  <Text type="supporting">
                    {task.assignees.join(", ") || "담당자 없음"} · 마감{" "}
                    {dueLabel(task.due_at)}
                  </Text>
                  <TaskMetadata task={task} trash={trash} />
                </VStack>
              }
            />
          ))}
        </List>
      </VStack>
    </>
  );
}

interface ListResult {
  key: string;
  page: TaskPage | null;
  error: string;
}
interface Feedback {
  kind: "success" | "error";
  message: string;
  restoredId?: number;
}

/** URL 조건에 맞는 실제 작업 또는 휴지통을 조회하고 복구합니다. */
export function TaskBoard({ trash = false }: { trash?: boolean }) {
  const router = useRouter();
  const query = useSearchParams().toString();
  const parsed = useMemo(() => parseFilters(query, trash), [query, trash]);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<ListResult | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const restoreLock = useRef<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const requestKey = `${trash ? "trash" : "tasks"}:${query}:${String(revision)}`;
  const current = result?.key === requestKey ? result : null;
  const page = current?.page;
  const error = parsed.error || current?.error || "";
  const loading = !error && !current;

  const navigate = useCallback(
    (filters: ListFilters, replace = false): void => {
      const nextQuery = filtersToQuery(filters, trash);
      const href = `${trash ? "/trash" : "/"}${nextQuery ? `?${nextQuery}` : ""}`;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, trash],
  );

  useEffect(() => {
    if (parsed.error) return;
    const controller = new AbortController();
    const filters = parsed.filters;
    const request = trash
      ? listDeletedTasks(
          { limit: filters.limit, offset: filters.offset },
          controller.signal,
        )
      : listTasks(filters, controller.signal);
    void request
      .then((response) => {
        if (controller.signal.aborted) return;
        const lastOffset = lastPageOffset(response.total, response.limit);
        if (filters.offset > lastOffset) {
          navigate({ ...filters, offset: lastOffset }, true);
          return;
        }
        setResult({ key: requestKey, page: response, error: "" });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key: requestKey,
            page: null,
            error:
              reason instanceof ApiError
                ? reason.message
                : "목록을 불러오지 못했습니다. 다시 시도해 주세요.",
          });
      });
    return () => {
      controller.abort();
    };
  }, [navigate, parsed, requestKey, trash]);

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);

  async function restore(task: Task): Promise<void> {
    if (restoreLock.current !== null) return;
    restoreLock.current = task.id;
    setRestoring(task.id);
    setFeedback(null);
    try {
      await restoreTask(task.id);
      setFeedback({
        kind: "success",
        message: `“${task.title}”을 복구했습니다.`,
        restoredId: task.id,
      });
      setRevision((value) => value + 1);
    } catch (reason) {
      setFeedback({
        kind: "error",
        message:
          reason instanceof ApiError
            ? reason.message
            : "복구하지 못했습니다. 목록을 다시 확인해 주세요.",
      });
    } finally {
      restoreLock.current = null;
      setRestoring(null);
    }
  }

  return (
    <VStack className="workspace" gap={6}>
      <VStack className="page-heading" gap={2}>
        <HStack hAlign="between" vAlign="center" wrap="wrap" gap={4}>
          <Heading level={1}>{trash ? "휴지통" : "할 일"}</Heading>
          {!trash && (
            <Button
              as={Link}
              href="/tasks/new"
              label="새 할 일"
              variant="primary"
              icon={<PlusIcon size={20} aria-hidden />}
            />
          )}
        </HStack>
        <Text color="secondary">
          {trash
            ? "삭제한 할 일을 확인하고 복구합니다."
            : "담당자와 마감일을 지정하고 업무를 관리합니다."}
        </Text>
      </VStack>
      {!trash && (
        <FilterForm
          key={query}
          filters={parsed.filters}
          onApply={(next) => {
            if (filtersToQuery(next) === query) setRevision((value) => value + 1);
            else navigate(next);
          }}
        />
      )}
      {feedback && (
        <VStack
          className="list-feedback"
          gap={2}
          role={feedback.kind === "error" ? "alert" : "status"}
          tabIndex={-1}
          ref={feedbackRef}
        >
          <Text>{feedback.message}</Text>
          {feedback.restoredId ? (
            <Link href={`/tasks/${String(feedback.restoredId)}`}>
              복구한 할 일 확인
            </Link>
          ) : (
            <Button
              label="목록 다시 확인"
              size="sm"
              onClick={() => {
                setRevision((value) => value + 1);
              }}
            />
          )}
        </VStack>
      )}
      {error ? (
        <VStack className="list-feedback" gap={3}>
          <Text role="alert">{error}</Text>
          <HStack gap={2}>
            <Button
              label="다시 시도"
              onClick={() => {
                setRevision((value) => value + 1);
              }}
            />
            {parsed.error && (
              <Button
                label="주소 조건 초기화"
                variant="ghost"
                onClick={() => {
                  navigate({ include_completed: true, limit: 20, offset: 0 });
                }}
              />
            )}
          </HStack>
        </VStack>
      ) : loading ? (
        <Text role="status">할 일을 불러오고 있어요…</Text>
      ) : (
        page && (
          <>
            <HStack
              className="list-toolbar"
              hAlign="between"
              vAlign="center"
              wrap="wrap"
              gap={3}
            >
              <Text type="label">
                {trash
                  ? "삭제된 할 일"
                  : hasFilters(parsed.filters)
                    ? "조건에 맞는 할 일"
                    : "전체 할 일"}{" "}
                {page.total}개
              </Text>
              <Selector
                label="페이지당 개수"
                size="sm"
                value={String(parsed.filters.limit)}
                options={[...new Set([20, 50, 100, parsed.filters.limit])]
                  .sort((a, b) => a - b)
                  .map((value) => ({
                    value: String(value),
                    label: `${String(value)}개씩`,
                  }))}
                onChange={(value) => {
                  navigate({ ...parsed.filters, limit: Number(value), offset: 0 });
                }}
              />
            </HStack>
            {page.items.length ? (
              <TaskRows
                tasks={page.items}
                trash={trash}
                restoring={restoring}
                onRestore={restore}
              />
            ) : (
              <VStack className="empty-state" gap={4} hAlign="center">
                {trash ? (
                  <TrashIcon size={32} aria-hidden />
                ) : (
                  <ListChecksIcon size={32} aria-hidden />
                )}
                <Heading level={2}>
                  {trash
                    ? "휴지통이 비어 있어요"
                    : hasFilters(parsed.filters)
                      ? "조건에 맞는 할 일이 없어요"
                      : "첫 번째 할 일을 만들어 보세요"}
                </Heading>
                <Text color="secondary">
                  {trash
                    ? "삭제한 할 일은 여기에 보관돼요."
                    : hasFilters(parsed.filters)
                      ? "필터를 바꾸거나 초기화해 보세요."
                      : "새 할 일을 등록해 업무를 관리하세요."}
                </Text>
                {!trash &&
                  (hasFilters(parsed.filters) ? (
                    <Button
                      label="모든 할 일 보기"
                      onClick={() => {
                        navigate({
                          include_completed: true,
                          limit: parsed.filters.limit,
                          offset: 0,
                        });
                      }}
                    />
                  ) : (
                    <Button
                      href="/tasks/new"
                      as={Link}
                      label="할 일 만들기"
                      icon={<PlusIcon size={20} aria-hidden />}
                    />
                  ))}
              </VStack>
            )}
            {page.total > 0 && (
              <HStack
                as="nav"
                aria-label="목록 페이지"
                className="pagination-bar"
                hAlign="between"
                vAlign="center"
                wrap="wrap"
                gap={3}
              >
                <Text type="supporting">
                  {page.offset + 1}–{page.offset + page.items.length} / {page.total}개 ·{" "}
                  {Math.floor(page.offset / page.limit) + 1} /{" "}
                  {Math.ceil(page.total / page.limit)}페이지
                </Text>
                <HStack gap={2}>
                  <Button
                    label="이전 페이지"
                    size="sm"
                    isDisabled={page.offset === 0}
                    onClick={() => {
                      navigate({
                        ...parsed.filters,
                        offset: Math.max(0, page.offset - page.limit),
                      });
                    }}
                  />
                  <Button
                    label="다음 페이지"
                    size="sm"
                    isDisabled={page.offset + page.limit >= page.total}
                    onClick={() => {
                      navigate({ ...parsed.filters, offset: page.offset + page.limit });
                    }}
                  />
                </HStack>
              </HStack>
            )}
          </>
        )
      )}
    </VStack>
  );
}
