"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins, MessageSquareIcon, SquarePen } from "lucide-react";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Empty, EmptyDescription } from "@/components/ui/empty";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={20}
                height={20}
                className="size-5"
              />
              <span className="font-logo text-base">Sandbox</span>
            </div>
            <SidebarTrigger />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                variant="outline"
                render={<Link href="/" />}
                isActive={pathname === "/"}
              >
                <SquarePen />
                <span>New Game</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
          <SidebarGroupContent>
            <Empty className="border py-2.5 p-2 group-data-[collapsible=icon]:hidden">
              <EmptyDescription className="text-xs">
                Your games will live here.
              </EmptyDescription>
            </Empty>
            <SidebarMenu className="hidden group-data-[collapsible=icon]:flex">
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Recents">
                  <MessageSquareIcon />
                  <span>Recents</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton>
              <Coins />
              <span>Credits</span>
            </SidebarMenuButton>
            <SidebarMenuBadge>$1.00</SidebarMenuBadge>
          </SidebarMenuItem>

          <SidebarMenuItem className="flex items-center justify-between px-2 mt-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <div className="w-full group-data-[collapsible=icon]:hidden">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    rootBox: "w-full! max-w-full",
                    organizationSwitcherTrigger:
                      "w-full! max-w-full justify-between!",
                    organizationPreview: "min-w-0",
                    organizationPreviewTextContainer: "min-w-0",
                    organizationPreviewMainIdentifier: "truncate",
                  },
                }}
              />
            </div>
            <UserButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
