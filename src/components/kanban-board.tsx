"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react";
import { useNavigationGuard } from "@/components/navigation-guard";
import {
  createKanbanTask,
  KanbanError,
  loadKanbanBoard,
  moveKanbanTask,
  type KanbanStatus,
  type KanbanTask,
} from "@/lib/kanban";
import "./kanban.css";

const columns: { status: KanbanStatus; label: string; destination: string }[] = [
  { status: "assigned", label: "할 일", destination: "할 일로" },
  { status: "in_progress", label: "진행 중", destination: "진행 중으로" },
  { status: "completed", label: "완료", destination: "완료로" },
];
const emptyDraft = { title: "", description: "", assignees: "", labels: "" };
const dragType = "application/x-team-kanban-task";

function names(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
}

function messageOf(error: unknown): string {
  return error instanceof KanbanError
    ? error.message
    : "공유 칸반 요청을 완료하지 못했습니다. 보드를 새로고침해 주세요.";
}

/** 공유 보드의 실제 배치를 표시하고 서버 확인 후 카드를 이동합니다. */
export function KanbanBoard() {
  const [tasks, setTasks] = useState<KanbanTask[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const mutationRef = useRef(false);
  const loadingRef = useRef(true);
  const focusCardRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const busy = pending !== null;
  useNavigationGuard(Object.values(draft).some((value) => value !== "") || busy);

  useEffect(() => {
    const controller = new AbortController();
    void loadKanbanBoard(controller.signal).then(
      (items) => {
        if (controller.signal.aborted) return;
        setTasks(items);
        setLoadError("");
        setLoading(false);
        loadingRef.current = false;
      },
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setLoadError(messageOf(error));
        setLoading(false);
        loadingRef.current = false;
      },
    );
    return () => {
      controller.abort();
    };
  }, [version]);

  useEffect(() => {
    if (!focusCardRef.current) return;
    document.getElementById(`kanban-card-${focusCardRef.current}`)?.focus();
    focusCardRef.current = null;
  }, [tasks]);

  useEffect(() => {
    if (Object.keys(errors).length)
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  function refresh(): void {
    if (mutationRef.current || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError("");
    setActionError("");
    setMessage("");
    setVersion((value) => value + 1);
  }

  async function create(): Promise<void> {
    if (mutationRef.current || loadingRef.current || tasks === null) return;
    setMessage("");
    setActionError("");
    if (!draft.title.trim()) {
      setErrors({ title: "공백이 아닌 제목을 입력해 주세요." });
      return;
    }
    mutationRef.current = true;
    setPending("create");
    setErrors({});
    try {
      const task = await createKanbanTask({
        title: draft.title.trim(),
        description: draft.description || null,
        status: "assigned",
        assignees: names(draft.assignees),
        labels: names(draft.labels),
      });
      focusCardRef.current = task.id;
      setTasks((current) => [
        ...(current ?? []).filter((item) => item.id !== task.id),
        task,
      ]);
      setDraft(emptyDraft);
      setMessage(`“${task.title}” 작업을 할 일에 등록했습니다.`);
    } catch (error) {
      setActionError(messageOf(error));
      if (error instanceof KanbanError) setErrors(error.fieldErrors);
    } finally {
      mutationRef.current = false;
      setPending(null);
    }
  }

  async function move(task: KanbanTask, status: KanbanStatus): Promise<void> {
    if (mutationRef.current || loadingRef.current || task.status === status) return;
    mutationRef.current = true;
    setPending(task.id);
    setDragged(null);
    setMessage("");
    setActionError("");
    try {
      const saved = await moveKanbanTask(task.id, status);
      focusCardRef.current = task.id;
      setTasks(
        (current) =>
          current?.map((item) => (item.id === task.id ? saved : item)) ?? null,
      );
      const destination = columns.find(
        (column) => column.status === saved.status,
      )?.destination;
      setMessage(
        `“${saved.title}” 작업을 ${destination ?? saved.status} 이동했습니다.`,
      );
    } catch (error) {
      setActionError(messageOf(error));
      document.getElementById(`kanban-card-${task.id}`)?.focus();
    } finally {
      mutationRef.current = false;
      setPending(null);
    }
  }

  function drop(event: DragEvent<HTMLElement>, status: KanbanStatus): void {
    event.preventDefault();
    const id = event.dataTransfer.getData(dragType);
    setDragged(null);
    const task = tasks?.find((item) => item.id === id);
    if (task) void move(task, status);
  }

  function fieldError(field: keyof typeof emptyDraft) {
    const error = errors[field];
    return error ? { status: { type: "error" as const, message: error } } : {};
  }

  function change(field: keyof typeof emptyDraft, value: string): void {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([key]) => key !== field)),
    );
  }

  return (
    <VStack as="main" className="workspace kanban-workspace" gap={6}>
      <HStack
        className="page-heading"
        hAlign="between"
        vAlign="start"
        gap={4}
        wrap="wrap"
      >
        <VStack gap={2}>
          <Heading level={1}>팀 칸반</Heading>
          <Text type="supporting">팀 업무를 등록하고 진행 상태를 관리합니다.</Text>
        </VStack>
        <Button
          label="보드 새로고침"
          variant="ghost"
          icon={<ArrowClockwiseIcon size={18} aria-hidden />}
          onClick={refresh}
          isDisabled={busy}
          isLoading={loading}
        />
      </HStack>

      <details className="kanban-create">
        <summary>
          <PlusIcon size={20} aria-hidden />
          <Text type="label">공유 작업 등록</Text>
        </summary>
        <form
          ref={formRef}
          aria-label="공유 작업 등록"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <VStack gap={4} paddingBlockStart={5}>
            <TextInput
              label="작업 제목"
              htmlName="title"
              value={draft.title}
              onChange={(value) => {
                change("title", value);
              }}
              isRequired
              isDisabled={busy}
              statusVariant="detached"
              {...fieldError("title")}
            />
            <TextArea
              label="작업 설명"
              htmlName="description"
              value={draft.description}
              onChange={(value) => {
                change("description", value);
              }}
              rows={3}
              isDisabled={busy}
              statusVariant="detached"
              {...fieldError("description")}
            />
            <HStack className="kanban-form-fields" gap={4}>
              <TextInput
                label="담당 GitHub 사용자명"
                htmlName="assignees"
                value={draft.assignees}
                onChange={(value) => {
                  change("assignees", value);
                }}
                description="보드에 등록된 사용자명을 쉼표로 구분하세요. 비워도 됩니다."
                isDisabled={busy}
                statusVariant="detached"
                {...fieldError("assignees")}
              />
              <TextInput
                label="작업 라벨"
                htmlName="labels"
                value={draft.labels}
                onChange={(value) => {
                  change("labels", value);
                }}
                description="쉼표로 구분하세요. 새 이름은 프로젝트 라벨로 등록됩니다."
                isDisabled={busy}
                statusVariant="detached"
                {...fieldError("labels")}
              />
            </HStack>
            <HStack hAlign="end">
              <Button
                type="submit"
                label="할 일에 등록"
                variant="primary"
                isLoading={pending === "create"}
                isDisabled={loading || (busy && pending !== "create") || tasks === null}
              />
            </HStack>
          </VStack>
        </form>
      </details>

      <VStack gap={3}>
        <Text type="supporting" id="kanban-help">
          카드를 다른 열로 끌거나 카드의 이동 버튼을 사용하세요. 같은 열 안의 순서
          변경은 지원하지 않습니다.
        </Text>
        {message && <Text role="status">{message}</Text>}
        {actionError && (
          <Text role="alert" className="form-error">
            {actionError}
          </Text>
        )}
        {loading && <Text role="status">공유 보드 전체를 불러오고 있어요…</Text>}
        {loadError && (
          <VStack gap={3} className="form-error">
            <Text role="alert">
              {loadError}
              {tasks !== null && " 아래에는 마지막으로 조회한 작업이 표시됩니다."}
            </Text>
            <Button label="다시 시도" onClick={refresh} isDisabled={busy || loading} />
          </VStack>
        )}
        {tasks !== null && (
          <Text type="label">
            {loading || loadError ? "마지막 조회" : "전체"} 작업 {tasks.length}개
          </Text>
        )}
      </VStack>

      {tasks !== null && (
        <HStack
          className="kanban-columns"
          gap={4}
          vAlign="start"
          aria-label="공유 칸반 보드"
          aria-busy={loading || busy}
        >
          {columns.map((column) => {
            const items = tasks
              .filter((task) => task.status === column.status)
              .sort(
                (left, right) =>
                  left.position - right.position ||
                  left.issue_number - right.issue_number,
              );
            return (
              <VStack
                as="section"
                key={column.status}
                className="kanban-column"
                data-status={column.status}
                data-drag-active={dragged !== null}
                gap={3}
                padding={3}
                aria-labelledby={`kanban-${column.status}`}
                onDragOver={(event: DragEvent<HTMLElement>) => {
                  if (dragged !== null && !busy && !loading) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }
                }}
                onDrop={(event: DragEvent<HTMLElement>) => {
                  drop(event, column.status);
                }}
              >
                <HStack
                  className="kanban-column-heading"
                  hAlign="between"
                  vAlign="center"
                  gap={3}
                >
                  <Heading level={2} id={`kanban-${column.status}`}>
                    {column.label}
                  </Heading>
                  <Badge label={items.length} />
                </HStack>
                {items.length === 0 && (
                  <Text type="supporting" className="kanban-empty">
                    {column.label} 작업이 없습니다.
                  </Text>
                )}
                {items.map((task) => (
                  <Card
                    key={task.id}
                    id={`kanban-card-${task.id}`}
                    role="article"
                    aria-labelledby={`kanban-title-${task.id}`}
                    aria-describedby="kanban-help"
                    tabIndex={-1}
                    padding={4}
                    elevation="none"
                    className="kanban-card"
                    draggable={!busy && !loading}
                    onDragStart={(event) => {
                      if (mutationRef.current || loadingRef.current) {
                        event.preventDefault();
                        return;
                      }
                      event.dataTransfer.setData(dragType, task.id);
                      event.dataTransfer.effectAllowed = "move";
                      setDragged(task.id);
                    }}
                    onDragEnd={() => {
                      setDragged(null);
                    }}
                  >
                    <VStack gap={3}>
                      <Text type="supporting">#{task.issue_number}</Text>
                      <Heading level={3} id={`kanban-title-${task.id}`}>
                        {task.title}
                      </Heading>
                      {task.description && (
                        <Text as="p" type="supporting" className="kanban-description">
                          {task.description}
                        </Text>
                      )}
                      <VStack gap={1}>
                        <Text type="supporting">
                          담당 · {task.assignees.join(", ") || "미지정"}
                        </Text>
                        {task.labels.length > 0 && (
                          <Text type="supporting">라벨 · {task.labels.join(", ")}</Text>
                        )}
                      </VStack>
                      {pending === task.id && (
                        <Text role="status">카드를 이동하고 있어요…</Text>
                      )}
                      <HStack className="kanban-move-actions" gap={2} wrap="wrap">
                        {columns
                          .filter((target) => target.status !== task.status)
                          .map((target) => (
                            <Button
                              key={target.status}
                              label={`${target.destination} 이동`}
                              aria-label={`${task.title}: ${target.destination} 이동`}
                              size="sm"
                              variant="ghost"
                              isDisabled={busy || loading}
                              onClick={() => {
                                void move(task, target.status);
                              }}
                            />
                          ))}
                      </HStack>
                    </VStack>
                  </Card>
                ))}
              </VStack>
            );
          })}
        </HStack>
      )}
    </VStack>
  );
}
