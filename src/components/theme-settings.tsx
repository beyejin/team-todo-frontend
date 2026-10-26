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
        <Heading level={1}>설정</Heading>
        <Text color="secondary">작업 화면의 색상과 간격을 선택하세요.</Text>
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
            label="Productivity"
            description="회색 바탕, 짙은 청록색 강조, 촘촘한 간격"
          />
          <RadioListItem
            value="warm"
            label="Warm"
            description="크림색 바탕, 갈색 강조, 여유 있는 간격"
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
                  {name === "warm" ? "Warm" : "Productivity"}
                </Text>
                <Heading level={2}>팀 칸반</Heading>
                <HStack gap={3} vAlign="center">
                  <CheckCircleIcon size={24} className="accent-icon" aria-hidden />
                  <Text>업무 상태 확인</Text>
                </HStack>
                <Text color="secondary">할 일 · 진행 중 · 완료</Text>
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
