"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";
import { adminSignInAction } from "@/app/actions";

export function AdminLogin() {
  const t = useT();
  const [pw, setPw] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await adminSignInAction(pw);
      if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto mt-24 flex w-full max-w-xs flex-col gap-3 px-5"
    >
      <div className="text-eyebrow flex items-center justify-center gap-2 text-ink-mute">
        <ShieldCheck className="h-3 w-3" />
        {t.admin.title}
      </div>
      <Label htmlFor="pw" className="text-eyebrow text-ink-mute">
        {t.admin.passwordLabel}
      </Label>
      <Input
        id="pw"
        type="password"
        autoFocus
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        className="h-11 rounded-md border-hairline bg-ivory/40"
      />
      <Button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-ink text-paper hover:bg-ink/90"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : t.admin.signIn}
      </Button>
    </form>
  );
}
