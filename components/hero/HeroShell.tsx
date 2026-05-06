"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { TopBar } from "./TopBar";
import { BookStack } from "./BookStack";
import { ProgressMeter } from "./ProgressMeter";
import { SegmentedTabs } from "./SegmentedTabs";
import { SignInSheet } from "@/components/sheets/SignInSheet";
import { MyBookSheet } from "@/components/sheets/MyBookSheet";
import { WaitlistSheet } from "@/components/sheets/WaitlistSheet";
import { AboutPanel, HowPanel, FaqPanel } from "@/components/sheets/InfoPanels";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * Client shell that owns the sheet open/close state.
 * Receives the Wall as a server-rendered ReactNode (passed-through cache).
 */
export function HeroShell({
  sold,
  goal,
  isSignedIn,
  wall,
}: {
  sold: number;
  goal: number;
  isSignedIn: boolean;
  wall: React.ReactNode;
}) {
  const t = useT();
  const [signInOpen, setSignInOpen] = useState(false);
  const [myBookOpen, setMyBookOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  function openBookShortcut() {
    if (isSignedIn) setMyBookOpen(true);
    else setSignInOpen(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <TopBar
        trailing={
          <button
            type="button"
            onClick={openBookShortcut}
            className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-hairline text-ink-soft transition-colors hover:border-ink hover:text-ink"
            aria-label={
              isSignedIn ? t.myBook.title : t.hero.primaryCta
            }
          >
            <BookOpen className="h-3.5 w-3.5" />
          </button>
        }
      />

      <section className="px-5 pt-4">
        <div className="text-eyebrow text-ink-mute">{t.hero.eyebrow}</div>
        <h1 className="text-display mt-2 text-[2rem] leading-[1.1] text-ink sm:text-[2.4rem]">
          <span className="text-han-display block text-[1.6rem] leading-[1.15] sm:text-[2rem]">
            {t.hero.title}
          </span>
        </h1>
        <p className="mt-3 max-w-[36ch] whitespace-pre-line text-[14.5px] leading-relaxed text-ink-soft">
          {t.hero.subtitle}
        </p>
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="mt-4 inline-flex items-center gap-1 text-[13.5px] font-medium tracking-wide text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          {t.hero.secondaryCta}
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </button>
      </section>

      <div className="relative mt-2 px-2">
        <BookStack className="mx-auto max-w-[420px]" />
      </div>

      <section className="px-5">
        <ProgressMeter sold={sold} goal={goal} />
      </section>

      <section className="mt-5 px-5">
        {isSignedIn ? (
          <Button
            type="button"
            onClick={() => setMyBookOpen(true)}
            className="h-12 w-full rounded-full bg-ink text-paper text-[15px] tracking-wider hover:bg-ink/90"
          >
            <Sparkles className="h-4 w-4" />
            {t.myBook.title}
          </Button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              onClick={() => setSignInOpen(true)}
              className="h-12 rounded-full bg-ink text-paper text-[14px] tracking-wider hover:bg-ink/90"
            >
              <BookOpen className="h-4 w-4" />
              {t.hero.primaryCta}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWaitlistOpen(true)}
              className="h-12 rounded-full border-hairline text-[14px] text-ink"
            >
              <Sparkles className="h-4 w-4" />
              {t.hero.waitlistCta}
            </Button>
          </div>
        )}
      </section>

      <section className="mt-6 px-5 pb-8">
        <SegmentedTabs
          panels={{
            wall: wall,
            how: <HowPanel />,
            faq: <FaqPanel />,
          }}
        />
      </section>

      <SignInSheet
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSignedIn={() => setMyBookOpen(true)}
      />
      <MyBookSheet open={myBookOpen} onOpenChange={setMyBookOpen} />
      <WaitlistSheet open={waitlistOpen} onOpenChange={setWaitlistOpen} />

      {/* About sheet uses the same panel content but in a quick sheet overlay */}
      <AboutQuickSheet open={aboutOpen} onOpenChange={setAboutOpen} />
    </main>
  );
}

function AboutQuickSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-2xl border-hairline bg-paper p-6"
      >
        <SheetHeader className="px-0 text-left">
          <SheetTitle className="text-display text-2xl text-ink">
            {t.about.title}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <AboutPanel />
        </div>
      </SheetContent>
    </Sheet>
  );
}
