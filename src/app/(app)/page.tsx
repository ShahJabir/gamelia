import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/components/chat-composer";
import { createGame } from "@/lib/games/action";
import { suggestions } from "@/lib/games/suggestions";

export default async function Home() {
  await auth.protect();

  return (
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
      <EmptyContent className="max-w-2xl gap-6">
        <ChatComposer />
        <div className="flex flex-wrap justify-center gap-2">
          {suggestions.map((suggestion) => (
            <form key={suggestion.label} action={createGame}>
              <input type="hidden" name="title" value={suggestion.label} />
              <Button type="submit" variant="outline" size="sm" className="rounded-full font-normal text-muted-foreground">
                <suggestion.icon />
                {suggestion.label}
              </Button>
            </form>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  );
}

