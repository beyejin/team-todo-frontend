"use client";

import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Theme } from "@astryxdesign/core/theme";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { themes, useAppTheme } from "@/components/theme-provider";
import { parseTheme } from "@/lib/theme";

/** Apply the chosen design throughout the current workspace. */
export function ThemeSettings() {
  const { theme, setTheme } = useAppTheme();
  return (
    <VStack className="workspace settings-page" gap={8}>
      <VStack gap={2} className="page-heading">
        <Text type="supporting">워크스페이스 설정</Text>
        <Heading level={1}>나에게 맞는 분위기</Heading>
        <Text color="secondary">편하게 집중할 수 있는 테마를 골라 보세요.</Text>
      </VStack>
      <VStack as="section" gap={6} className="settings-section">
        <RadioList
          label="화면 테마"
          value={theme}
          onChange={(value) => {
            setTheme(parseTheme(value));
          }}
          description="선택한 테마는 바로 적용되며, 다음 방문에도 유지됩니다."
        >
          <RadioListItem
            value="productivity"
            label="Productivity · 또렷한 집중"
            description="시원한 바탕과 보라색 포인트로 할 일에 집중해요."
          />
          <RadioListItem
            value="warm"
            label="Warm · 편안한 흐름"
            description="따뜻한 크림색 바탕에서 여유 있게 정리해요."
          />
        </RadioList>
        <HStack
          gap={5}
          wrap="wrap"
          className="theme-previews"
          aria-label="테마 미리보기"
        >
          {(["productivity", "warm"] as const).map((name) => (
            <Theme key={name} theme={themes[name]} mode="light">
              <VStack gap={4} className="theme-preview">
                <Text type="supporting">
                  {name === "warm" ? "WARM" : "PRODUCTIVITY"}
                </Text>
                <Heading level={2}>작은 완료, 좋은 하루</Heading>
                <HStack gap={3} vAlign="center">
                  <CheckCircleIcon size={24} className="accent-icon" aria-hidden />
                  <Text>오늘의 할 일 정리하기</Text>
                </HStack>
                <Text color="secondary">하나씩, 우리만의 속도로.</Text>
              </VStack>
            </Theme>
          ))}
        </HStack>
        <Text role="status" type="supporting">
          현재 테마: {theme === "warm" ? "Warm" : "Productivity"}
        </Text>
      </VStack>
    </VStack>
  );
}
