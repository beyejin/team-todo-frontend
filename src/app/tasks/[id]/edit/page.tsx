import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { TaskEditor } from "@/components/task-editor";

/** 최신 서버 값을 확인한 뒤 할 일을 수정합니다. */
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (!/^\d+$/u.test(id) || !Number.isSafeInteger(taskId) || taskId < 1) notFound();

  return (
    <VStack gap={6} className="workspace editor-page">
      <VStack gap={2} className="page-heading">
        <Text type="supporting">EDIT TASK</Text>
        <Heading level={1}>할 일 수정</Heading>
        <Text color="secondary">필요한 내용을 바꾸고 변경사항을 저장하세요.</Text>
      </VStack>
      <TaskEditor key={taskId} taskId={taskId} />
    </VStack>
  );
}
