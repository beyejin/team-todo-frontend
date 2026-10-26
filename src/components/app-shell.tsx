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
      variant="section"
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
