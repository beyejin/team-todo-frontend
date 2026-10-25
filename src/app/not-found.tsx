import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import Link from "next/link";

/** 잘못된 경로에서도 할 일 목록으로 돌아갈 수 있습니다. */
export default function NotFound() {
  return (
    <VStack gap={4} hAlign="start" className="workspace">
      <Heading level={1}>페이지를 찾을 수 없습니다</Heading>
      <Text>주소를 확인하거나 할 일 목록으로 돌아가 주세요.</Text>
      <Button label="할 일 목록으로" href="/" as={Link} variant="primary" />
    </VStack>
  );
}
