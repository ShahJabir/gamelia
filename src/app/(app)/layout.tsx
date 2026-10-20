import { auth } from "@clerk/nextjs/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { listGames } from "@/lib/games/queries";
import { getOrgBalance, FREE_BASELINE_CREDITS } from "@/lib/credits/ledger";
import { formatDollars } from "@/lib/credits/format";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ orgId }, games] = await Promise.all([
    auth(),
    listGames(),
  ]);

  const balance = orgId ? await getOrgBalance(orgId) : FREE_BASELINE_CREDITS;
  const credits = formatDollars(balance);

  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <AppSidebar games={games} credits={credits} />
      <SidebarInset className="h-full min-h-0 overflow-hidden">
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

