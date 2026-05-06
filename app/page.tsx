import { Suspense } from "react";
import { HeroShell } from "@/components/hero/HeroShell";
import { BuyerWall } from "@/components/wall/BuyerWall";
import { counts } from "@/lib/notion/repo";
import { isNotionConfigured } from "@/lib/notion/client";
import { readBuyer } from "@/lib/auth/session";
import { TOTAL_GOAL } from "@/lib/format";

export default function HomePage() {
  return (
    <Suspense fallback={<HeroSkeleton />}>
      <HeroData />
    </Suspense>
  );
}

async function HeroData() {
  const session = await readBuyer();
  const isSignedIn = Boolean(session);

  let sold = 0;
  let goal = TOTAL_GOAL;
  if (isNotionConfigured()) {
    try {
      const c = await counts();
      sold = c.issued;
      goal = c.goal;
    } catch (e) {
      console.error("[home] counts failed", e);
    }
  }

  return (
    <HeroShell
      sold={sold}
      goal={goal}
      isSignedIn={isSignedIn}
      wall={
        <Suspense fallback={<WallFallback />}>
          <BuyerWall />
        </Suspense>
      }
    />
  );
}

function HeroSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-10">
      <div className="h-3 w-24 animate-pulse rounded bg-ivory/60" />
      <div className="mt-4 h-8 w-3/4 animate-pulse rounded bg-ivory" />
      <div className="mt-2 h-8 w-1/2 animate-pulse rounded bg-ivory" />
      <div className="mt-6 h-48 w-full animate-pulse rounded-xl bg-ivory/50" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-ivory" />
    </main>
  );
}

function WallFallback() {
  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="h-3.5 w-[22px]" />
          <div className="h-16 w-12 animate-pulse rounded-[3px] bg-ivory" />
          <div className="h-2 w-10 animate-pulse rounded bg-ivory/60" />
        </div>
      ))}
    </div>
  );
}
