import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { notFound } from "next/navigation";
import { TaskDetail } from "@/components/task-detail";

/** URL의 할 일을 조회하는 상세 화면입니다. */
export default async function TaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taskId = Number(id);
  if (!/^\d+$/u.test(id) || !Number.isSafeInteger(taskId) || taskId < 1) notFound();

  return (
    <VStack gap={6} className="workspace detail-page">
      <VStack gap={2} className="page-heading">
        <Text type="supporting">TASK DETAILS</Text>
        <Heading level={1}>할 일 상세</Heading>
      </VStack>
      <TaskDetail key={taskId} taskId={taskId} />
    </VStack>
  );
}
