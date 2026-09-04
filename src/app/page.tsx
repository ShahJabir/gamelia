import Image from "next/image";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ModeToggle } from "@/components/mode-toggle";

export default async function Home() {
  await auth.protect();

  return (
    <>
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <Image src="/logo.svg" alt="Logo" width={48} height={48} />
          </EmptyMedia>
          <EmptyTitle className="text-2xl">What should we build today?</EmptyTitle>
          <EmptyDescription>
            Build your own racers, shooters, puzzles and whole worlds using your
            own words. If you can describe it, you can play it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <UserButton />
      <OrganizationSwitcher />
      <ModeToggle />
    </>
  );
}
