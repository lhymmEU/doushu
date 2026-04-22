"use client";

import { useState, useTransition } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { signInAction } from "@/app/actions";

export function SignInSheet({
  open,
  onOpenChange,
  onSignedIn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSignedIn?: () => void;
}) {
  const t = useT();
  const [serial, setSerial] = useState("");
  const [magicWord, setMagicWord] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await signInAction({ serial, magicWord });
      if (!res.ok) {
        toast.error(t.signIn.error);
        return;
      }
      toast.success(`#${res.data.serialDisplay}`);
      setSerial("");
      setMagicWord("");
      onOpenChange(false);
      onSignedIn?.();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-hairline bg-paper p-6 pt-5"
      >
        <SheetHeader className="px-0 text-left">
          <div className="text-eyebrow flex items-center gap-2">
            <BookOpen className="h-3 w-3" />
            <span>{t.tabs.wall === t.tabs.wall ? "Doushu" : "Doushu"}</span>
          </div>
          <SheetTitle className="text-display text-2xl text-ink">
            {t.signIn.title}
          </SheetTitle>
          <SheetDescription className="text-ink-mute">
            {t.signIn.subtitle}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="serial"
              className="text-eyebrow text-ink-mute"
            >
              {t.signIn.serialLabel}
            </Label>
            <Input
              id="serial"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              required
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder={t.signIn.serialPlaceholder}
              className="text-display tabular h-12 rounded-md border-hairline bg-ivory/50 text-2xl tracking-wider placeholder:text-ink-mute/40"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="magic"
              className="text-eyebrow text-ink-mute"
            >
              {t.signIn.wordLabel}
            </Label>
            <Input
              id="magic"
              required
              autoComplete="off"
              value={magicWord}
              onChange={(e) => setMagicWord(e.target.value)}
              placeholder={t.signIn.wordPlaceholder}
              className="h-12 rounded-md border-hairline bg-ivory/50 text-base placeholder:text-ink-mute/40"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            size="lg"
            className="mt-2 h-12 rounded-full bg-ink text-paper text-[15px] tracking-wider hover:bg-ink/90"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t.signIn.submit
            )}
          </Button>
          <p className="text-center text-xs text-ink-mute">
            {t.signIn.forgot}
          </p>
        </form>
      </SheetContent>
    </Sheet>
  );
}
