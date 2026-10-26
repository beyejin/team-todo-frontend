"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AppShell } from "@astryxdesign/core/AppShell";
import {
  SideNav,
  SideNavHeading,
  SideNavItem,
  SideNavSection,
} from "@astryxdesign/core/SideNav";
import { VStack } from "@astryxdesign/core/VStack";
import { Text } from "@astryxdesign/core/Text";
import {
  CheckSquareIcon,
  ListChecksIcon,
  TrashIcon,
  SlidersHorizontalIcon,
  PlusIcon,
  KanbanIcon,
} from "@phosphor-icons/react";
import { Button } from "@astryxdesign/core/Button";

/** Desktop navigation is 240px; AppShell provides the mobile drawer below 768px. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  function closeNavigation() {
    setMobileOpen(false);
  }
  return (
    <AppShell
      height="auto"
      variant="wash"
      contentPadding={0}
      mobileNav={{ isOpen: mobileOpen, onOpenChange: setMobileOpen }}
      sideNav={
        <SideNav
          className="workspace-navigation"
          header={
            <SideNavHeading
              heading="Team Todo"
              headingHref="/"
              onClick={closeNavigation}
              subheading="함께하는 일을, 가볍게"
              icon={<CheckSquareIcon size={24} aria-hidden />}
            />
          }
          topContent={
            <VStack padding={3}>
              <Button
                href="/tasks/new"
                as={Link}
                label="새 할 일"
                onClick={closeNavigation}
                variant="primary"
                icon={<PlusIcon size={20} aria-hidden />}
              />
            </VStack>
          }
          footer={
            <VStack padding={4} gap={2}>
              <Text type="label">작은 완료가 모이는 곳</Text>
              <Text type="supporting">오늘의 일을 함께 정리해 보세요.</Text>
            </VStack>
          }
        >
          <SideNavSection title="워크스페이스" isHeaderHidden>
            <SideNavItem
              as={Link}
              href="/kanban"
              label="팀 칸반"
              onClick={closeNavigation}
              icon={<KanbanIcon size={20} aria-hidden />}
              isSelected={pathname === "/kanban"}
            />
            <SideNavItem
              as={Link}
              href="/"
              label="할 일"
              onClick={closeNavigation}
              icon={<ListChecksIcon size={20} aria-hidden />}
              isSelected={pathname === "/" || pathname.startsWith("/tasks")}
            />
            <SideNavItem
              as={Link}
              href="/trash"
              label="휴지통"
              onClick={closeNavigation}
              icon={<TrashIcon size={20} aria-hidden />}
              isSelected={pathname === "/trash"}
            />
            <SideNavItem
              as={Link}
              href="/settings"
              label="설정"
              onClick={closeNavigation}
              icon={<SlidersHorizontalIcon size={20} aria-hidden />}
              isSelected={pathname === "/settings"}
            />
          </SideNavSection>
        </SideNav>
      }
    >
      {children}
    </AppShell>
  );
}
