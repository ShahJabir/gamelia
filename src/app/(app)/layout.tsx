import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { listGames } from "@/lib/games/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const games = await listGames();

  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <AppSidebar games={games} />
      <SidebarInset className="h-full min-h-0 overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
