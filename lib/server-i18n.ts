import { cookies } from "next/headers";
import { zh } from "@/content/copy.zh";
import { en } from "@/content/copy.en";
import type { Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  const v = c.get("lang")?.value;
  return v === "en" ? "en" : "zh";
}

export async function getCopy() {
  const lang = await getLang();
  return lang === "en" ? en : zh;
}
