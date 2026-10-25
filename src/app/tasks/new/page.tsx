import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { TaskForm } from "@/components/task-form";

/** Create a task with the same validated editor used for updates. */
export default function NewTaskPage() {
  return (
    <VStack className="workspace editor-page" gap={8}>
      <VStack gap={2} className="page-heading">
        <Text type="supporting">새로운 시작</Text>
        <Heading level={1}>새 할 일</Heading>
        <Text color="secondary">
          제목부터 적어 보세요. 나머지는 천천히 채워도 괜찮아요.
        </Text>
      </VStack>
      <TaskForm />
    </VStack>
  );
}
