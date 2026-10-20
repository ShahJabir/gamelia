import { auth } from "@clerk/nextjs/server";
import { PricingTable } from "@clerk/nextjs";
import { reconcileOrgSubscriptionCredits } from "@/lib/credits/reconcile";
import { getOrgBalance, FREE_BASELINE_CREDITS } from "@/lib/credits/ledger";
import { formatDollars } from "@/lib/credits/format";

export default async function BillingPage() {
  await auth.protect();
  const { orgId } = await auth();

  if (orgId) {
    await reconcileOrgSubscriptionCredits(orgId);
  }

  const balance = orgId ? await getOrgBalance(orgId) : FREE_BASELINE_CREDITS;
  const availableCredits = formatDollars(balance);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-10 flex h-13 shrink-0 items-center border-b border-border/40 bg-background/80 px-6 backdrop-blur-md">
        <h1 className="text-sm font-medium text-foreground">Billing</h1>
      </header>

      {/* Main Content Area - Centered with balanced padding */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <div className="mx-auto w-full max-w-2xl space-y-10">
          {/* Section 1: Available credits */}
          <div className="space-y-1.5">
            <p className="text-xs font-normal text-muted-foreground">
              Available credits
            </p>
            <p className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
              {availableCredits}
            </p>
            <p className="max-w-xl text-xs text-muted-foreground leading-relaxed pt-0.5">
              Credits cover the models that build and revise your games. A scene
              already in progress can finish below zero; the next build waits for
              more credits.
            </p>
          </div>

          {/* Section 2: Keep the studio running */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base md:text-lg font-semibold text-foreground">
                Keep the studio running
              </h2>
              <p className="text-xs text-muted-foreground">
                Builder adds $10.00 every month, and unused credits roll over.
              </p>
            </div>

            {/* Section 3: Clerk Organization Pricing Table */}
            <div className="w-full">
              <PricingTable
                for="organization"
                fallback={
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    {/* Free Plan Card */}
                    <div className="bg-card dark:bg-[#1f1f1f] border border-border/70 dark:border-white/5 rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[230px] shadow-xs dark:shadow-none transition-colors">
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-card-foreground dark:text-white">
                          Free
                        </h3>
                        <div className="space-y-0.5">
                          <p className="text-2xl font-bold text-card-foreground dark:text-white">
                            $0
                          </p>
                          <p className="text-xs text-muted-foreground dark:text-zinc-400">
                            Always free
                          </p>
                        </div>
                      </div>
                      <div className="mt-8">
                        <button
                          type="button"
                          className="w-full bg-[#783c2e] hover:bg-[#8f4738] text-white text-xs font-medium py-2.5 px-4 rounded-md transition-colors shadow-none cursor-pointer"
                        >
                          Switch to this plan
                        </button>
                      </div>
                    </div>

                    {/* Builder Plan Card */}
                    <div className="bg-card dark:bg-[#1f1f1f] border border-border/70 dark:border-white/5 rounded-xl p-5 sm:p-6 flex flex-col justify-between min-h-[230px] shadow-xs dark:shadow-none transition-colors">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-card-foreground dark:text-white">
                            Builder
                          </h3>
                          <span className="bg-[#fbf1ee] text-[#a44431] border border-[#e8c2ba] dark:bg-[#4d261c] dark:text-[#ea7c61] dark:border-[#783c2e]/40 text-[11px] font-medium px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-zinc-400">
                          $10 in game-building credits added every month.
                        </p>
                        <div className="pt-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-card-foreground dark:text-white">
                              $20
                            </span>
                            <span className="text-xs text-muted-foreground dark:text-zinc-400">
                              / month
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-zinc-400 mt-0.5">
                            Only billed monthly
                          </p>
                        </div>
                      </div>
                      <div className="mt-8 h-9" />
                    </div>
                  </div>
                }
                appearance={{
                  variables: {
                    fontFamily:
                      "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
                  },
                  elements: {
                    rootBox: "!w-full !max-w-none !font-sans",
                    pricingTable:
                      "!grid !grid-cols-1 sm:!grid-cols-2 !gap-4 !w-full !font-sans",
                    pricingTableCard:
                      "!bg-card dark:!bg-[#1f1f1f] !border !border-border/70 dark:!border-white/5 !rounded-xl !p-5 sm:!p-6 !flex !flex-col !justify-between !min-h-[230px] !shadow-xs dark:!shadow-none !transition-colors !font-sans",
                    pricingTableCardHeader:
                      "!flex !flex-col !space-y-4 !w-full !p-0 !font-sans",
                    pricingTableCardTitleContainer:
                      "!flex !flex-col !gap-1.5 !w-full !font-sans",
                    pricingTableCardTitle:
                      "!text-sm !font-semibold !text-card-foreground dark:!text-white !font-sans",
                    pricingTableCardBadge:
                      "!bg-[#fbf1ee] !text-[#a44431] !border !border-[#e8c2ba] dark:!bg-[#4d261c] dark:!text-[#ea7c61] dark:!border-[#783c2e]/40 !text-[11px] !font-medium !px-2 !py-0.5 !rounded-full !font-sans",
                    pricingTableCardDescription:
                      "!text-xs !text-muted-foreground dark:!text-zinc-400 !m-0 !mt-0.5 !leading-relaxed !font-sans",
                    pricingTableCardFeeContainer:
                      "!mt-3 !flex !items-baseline !gap-1 !font-sans",
                    pricingTableCardFee:
                      "!text-2xl !font-bold !text-card-foreground dark:!text-white !font-sans",
                    pricingTableCardFeePeriod:
                      "!text-xs !text-muted-foreground dark:!text-zinc-400 !font-normal !font-sans",
                    pricingTableCardFeePeriodNotice:
                      "!text-xs !text-muted-foreground dark:!text-zinc-400 !mt-0.5 !font-sans",
                    pricingTableCardBody:
                      "!flex !flex-col !flex-1 !justify-between !p-0 !mt-auto !w-full !border-0 !border-none !font-sans",
                    pricingTableCardFooter:
                      "!mt-6 !pt-0 !border-0 !border-none !w-full !font-sans",
                    pricingTableCardFooterButton:
                      "!w-full !bg-[#783c2e] hover:!bg-[#8f4738] !text-white !text-xs !font-medium !py-2.5 !px-4 !rounded-md !transition-colors !border-0 !shadow-none !cursor-pointer !font-sans",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
