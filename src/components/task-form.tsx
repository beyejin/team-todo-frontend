"use client";

import { Button } from "@astryxdesign/core/Button";
import { Field } from "@astryxdesign/core/Field";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { VStack } from "@astryxdesign/core/VStack";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useNavigationGuard } from "@/components/navigation-guard";
import {
  draftToInput,
  draftToPatch,
  taskToDraft,
  validateDraft,
  type TaskDraft,
} from "@/lib/draft";
import { ApiError, createTask, updateTask, type Task } from "@/lib/tasks";

/** 생성과 수정에서 같은 입력·검증·저장 흐름을 사용합니다. */
export function TaskForm({ task }: { task?: Task }) {
  const router = useRouter();
  const [initialDraft] = useState(() => taskToDraft(task));
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const focusErrorRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dueRef = useRef<HTMLInputElement>(null);
  const dueId = useId();
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const { confirmLeave, allowNavigation } = useNavigationGuard(dirty);

  useEffect(() => {
    if (focusErrorRef.current) {
      focusErrorRef.current = false;
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [errors]);

  function change<K extends keyof TaskDraft>(field: K, value: TaskDraft[K]): void {
    setDraft((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: "" }));
  }

  function errorProps(field: keyof TaskDraft) {
    const error = errors[field];
    return error ? { status: { type: "error" as const, message: error } } : {};
  }

  async function save(): Promise<void> {
    if (savingRef.current) return;
    const nextErrors = validateDraft(draft);
    if (dueRef.current?.validity.badInput) {
      nextErrors.due_at = "올바른 마감 날짜와 시간을 입력해 주세요.";
    }
    focusErrorRef.current = Object.keys(nextErrors).length > 0;
    setErrors(nextErrors);
    setMessage("");
    if (Object.keys(nextErrors).length) return;

    savingRef.current = true;
    setSaving(true);
    try {
      const patch = task ? draftToPatch(task, draft) : null;
      const saved =
        task && patch
          ? Object.keys(patch).length
            ? await updateTask(task.id, patch)
            : task
          : await createTask(draftToInput(draft));
      allowNavigation();
      router.push(`/tasks/${String(saved.id)}`);
    } catch (error) {
      setMessage(
        error instanceof ApiError
          ? error.message
          : "저장하지 못했습니다. 입력값은 유지됩니다. 목록에서 저장 여부를 확인한 후 다시 시도해 주세요.",
      );
      if (error instanceof ApiError) {
        focusErrorRef.current = Object.keys(error.fieldErrors).length > 0;
        setErrors(error.fieldErrors);
      }
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <form
      ref={formRef}
      className="task-form"
      aria-label={task ? "할 일 수정" : "할 일 생성"}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <VStack gap={6}>
        <VStack as="section" gap={5} className="form-section">
          <Heading level={2}>할 일 내용</Heading>
          <TextInput
            label="제목"
            value={draft.title}
            onChange={(value) => {
              change("title", value);
            }}
            htmlName="title"
            placeholder="어떤 일을 함께 할까요?"
            isRequired
            isDisabled={saving}
            statusVariant="detached"
            {...errorProps("title")}
          />
          <TextArea
            label="설명"
            value={draft.description}
            onChange={(value) => {
              change("description", value);
            }}
            htmlName="description"
            placeholder="필요한 내용이나 참고할 정보를 적어 주세요."
            rows={5}
            isDisabled={saving}
            statusVariant="detached"
            {...errorProps("description")}
          />
        </VStack>

        <VStack as="section" gap={5} className="form-section">
          <Heading level={2}>진행과 일정</Heading>
          <Grid columns={{ minWidth: 240, max: 2 }} gap={5}>
            <Selector
              label="상태"
              htmlName="status"
              value={draft.status}
              options={[
                { value: "assigned", label: "할당" },
                { value: "in_progress", label: "진행 중" },
                { value: "completed", label: "완료" },
              ]}
              onChange={(value) => {
                if (
                  value === "assigned" ||
                  value === "in_progress" ||
                  value === "completed"
                )
                  change("status", value);
              }}
              presentation="adaptive"
              isDisabled={saving}
              statusVariant="detached"
              {...errorProps("status")}
            />
            <Selector
              label="우선순위"
              htmlName="priority"
              value={draft.priority}
              options={[
                { value: "low", label: "낮음" },
                { value: "medium", label: "보통" },
                { value: "high", label: "높음" },
              ]}
              onChange={(value) => {
                if (value === "low" || value === "medium" || value === "high")
                  change("priority", value);
              }}
              presentation="adaptive"
              isDisabled={saving}
              statusVariant="detached"
              {...errorProps("priority")}
            />
          </Grid>
          <Field
            label="마감일"
            inputID={dueId}
            description="현재 기기의 시간대를 사용합니다. 비워 두면 마감일 없이 저장합니다."
            descriptionID={`${dueId}-description`}
            isDisabled={saving}
            statusVariant="detached"
            {...(errors.due_at
              ? {
                  status: {
                    type: "error" as const,
                    message: errors.due_at,
                    messageID: `${dueId}-error`,
                  },
                }
              : {})}
          >
            <input
              ref={dueRef}
              id={dueId}
              name="due_at"
              className="native-input"
              type="datetime-local"
              value={draft.due_at}
              onChange={(event) => {
                change("due_at", event.target.value);
              }}
              disabled={saving}
              aria-invalid={Boolean(errors.due_at)}
              aria-describedby={`${dueId}-description${errors.due_at ? ` ${dueId}-error` : ""}`}
            />
          </Field>
        </VStack>

        <VStack as="section" gap={5} className="form-section">
          <Heading level={2}>담당자와 분류</Heading>
          {(
            [
              ["assignees", "담당자", "담당자 A, 담당자 B"],
              ["tags", "태그", "수업, 팀 프로젝트"],
              ["labels", "라벨", "발표, 검토"],
            ] as const
          ).map(([field, label, placeholder]) => (
            <TextInput
              key={field}
              label={label}
              htmlName={field}
              value={draft[field]}
              onChange={(value) => {
                change(field, value);
              }}
              placeholder={placeholder}
              description="여러 값은 쉼표로 구분해 주세요. 빈 값과 중복은 저장할 때 정리합니다."
              isDisabled={saving}
              statusVariant="detached"
              {...errorProps(field)}
            />
          ))}
        </VStack>

        {message && (
          <p role="alert" className="form-error">
            {message}
          </p>
        )}
        <HStack gap={3} hAlign="end" wrap="wrap" className="form-actions">
          <Button
            label="취소"
            variant="secondary"
            isDisabled={saving}
            onClick={() => {
              if (confirmLeave()) router.push(task ? `/tasks/${String(task.id)}` : "/");
            }}
          />
          <Button
            label={task ? "변경사항 저장" : "할 일 만들기"}
            type="submit"
            isLoading={saving}
            isDisabled={Boolean(task) && !dirty}
          />
        </HStack>
      </VStack>
    </form>
  );
}
