"use client";

import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, deleteTask, getTask, type Task } from "@/lib/tasks";

const statuses = {
  assigned: "할당",
  in_progress: "진행 중",
  completed: "완료",
};
const priorities = { low: "낮음", medium: "보통", high: "높음" };

function localDate(value: string | null): string {
  return value === null ? "미지정" : new Date(value).toLocaleString("ko-KR");
}

/** 서버에 저장된 전체 내용을 보여주고 확인 후 휴지통으로 이동합니다. */
export function TaskDetail({ taskId }: { taskId: number }) {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    void getTask(taskId, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setTask(loaded);
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof ApiError
            ? failure.message
            : "할 일을 불러오지 못했습니다. 다시 시도해 주세요.",
        );
      });
    return () => {
      controller.abort();
    };
  }, [taskId, attempt]);

  function changeConfirmation(open: boolean): void {
    if (deletingRef.current) return;
    if (open) setDeleteError("");
    setConfirmOpen(open);
  }

  async function remove(): Promise<void> {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteTask(taskId);
      router.push("/");
    } catch (failure) {
      setDeleteError(
        failure instanceof ApiError
          ? failure.message
          : "삭제하지 못했습니다. 목록에서 상태를 확인한 뒤 다시 시도해 주세요.",
      );
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  if (!task) {
    return (
      <VStack gap={4} className="list-feedback" role={error ? "alert" : "status"}>
        <Text>{error || "할 일을 불러오고 있습니다."}</Text>
        <HStack gap={2} hAlign="center" wrap="wrap">
          {error && (
            <Button
              label="다시 시도"
              onClick={() => {
                setError("");
                setAttempt((current) => current + 1);
              }}
            />
          )}
          <Button label="목록으로" href="/" as={Link} variant="ghost" />
        </HStack>
      </VStack>
    );
  }

  return (
    <VStack gap={6}>
      <VStack as="section" gap={5} className="detail-section">
        <HStack gap={3} hAlign="between" vAlign="center" wrap="wrap">
          <HStack gap={2} vAlign="center">
            <StatusDot
              variant={task.status === "completed" ? "success" : "neutral"}
              label={statuses[task.status]}
            />
            <Text type="label">{statuses[task.status]}</Text>
            <Text type="supporting">#{task.id}</Text>
          </HStack>
          <HStack gap={2} wrap="wrap">
            <Button
              label="수정"
              variant="primary"
              href={`/tasks/${String(task.id)}/edit`}
              as={Link}
              isDisabled={deleting}
            />
            <Button
              label="삭제"
              variant="ghost"
              isDisabled={deleting}
              onClick={() => {
                changeConfirmation(true);
              }}
            />
          </HStack>
        </HStack>
        <Heading level={2} className="detail-description">
          {task.title}
        </Heading>
        <Text as="p" className="detail-description">
          {task.description || "등록된 설명이 없습니다."}
        </Text>
        <MetadataList label={{ position: "top" }} columns="multi">
          <MetadataListItem label="우선순위">
            {priorities[task.priority]}
          </MetadataListItem>
          <MetadataListItem label="마감일">{localDate(task.due_at)}</MetadataListItem>
          <MetadataListItem label="담당자">
            {task.assignees.join(", ") || "미지정"}
          </MetadataListItem>
          <MetadataListItem label="태그">
            {task.tags.join(", ") || "없음"}
          </MetadataListItem>
          <MetadataListItem label="라벨">
            {task.labels.join(", ") || "없음"}
          </MetadataListItem>
          <MetadataListItem label="생성 시각">
            {localDate(task.created_at)}
          </MetadataListItem>
          <MetadataListItem label="수정 시각">
            {localDate(task.updated_at)}
          </MetadataListItem>
        </MetadataList>
      </VStack>
      <HStack>
        <Button
          label="목록으로"
          href="/"
          as={Link}
          variant="ghost"
          isDisabled={deleting}
        />
      </HStack>
      <Dialog
        isOpen={confirmOpen}
        onOpenChange={changeConfirmation}
        purpose={deleting ? "required" : "info"}
      >
        <VStack gap={5}>
          <DialogHeader title="할 일을 삭제할까요?" />
          <Text as="p" className="detail-description">
            {task.title}
          </Text>
          <Text as="p">휴지통으로 이동하며, 나중에 복구할 수 있습니다.</Text>
          {deleteError && (
            <Text as="p" role="alert" className="form-error">
              {deleteError}
            </Text>
          )}
          <HStack gap={2} hAlign="end" wrap="wrap">
            <Button
              label="취소"
              isDisabled={deleting}
              onClick={() => {
                changeConfirmation(false);
              }}
            />
            <Button
              label="휴지통으로 이동"
              variant="destructive"
              isLoading={deleting}
              onClick={() => {
                void remove();
              }}
            />
          </HStack>
        </VStack>
      </Dialog>
    </VStack>
  );
}
