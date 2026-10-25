"use client";

import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/HStack";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";
import { useEffect, useState } from "react";
import { TaskForm } from "@/components/task-form";
import { ApiError, getTask, type Task } from "@/lib/tasks";

/** 최신 서버 값을 읽은 뒤 수정 폼을 초기화합니다. */
export function TaskEditor({ taskId }: { taskId: number }) {
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

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
            : "수정할 할 일을 불러오지 못했습니다. 다시 시도해 주세요.",
        );
      });
    return () => {
      controller.abort();
    };
  }, [taskId, attempt]);

  if (task) return <TaskForm key={task.id} task={task} />;

  return (
    <VStack gap={4} className="list-feedback" role={error ? "alert" : "status"}>
      <Text>{error || "수정할 할 일을 불러오고 있습니다."}</Text>
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
