import { getCollection, type CollectionEntry } from "astro:content";
import config from "@/config/config.json";
import languageConfig from "@/config/language.json";
import dictionary from "@/i18n/en.json";
import { getTranslations, slugSelector } from "@/lib/utils/languageParser";

export type Lang = "en" | "zh" | "ms";
export type Category = "research" | "bridge" | "foundation" | "life";
export const topics = [
  "investing-basics",
  "investing-questions",
  "life",
] as const;
export type Topic = (typeof topics)[number];
export function topicFor(category: Category): Topic {
  return category === "foundation"
    ? "investing-basics"
    : category === "life"
      ? "life"
      : "investing-questions";
}
export type JournalCopy = typeof dictionary.journal;
export const languages = languageConfig
  .filter(
    (l) =>
      !(config.settings.disable_languages as string[]).includes(l.languageCode),
  )
  .map((l) => l.languageCode as Lang);
export const languageNames: Record<Lang, string> = {
  en: "EN",
  zh: "中文",
  ms: "BM",
};
export function normalizeLang(lang?: string): Lang {
  return languages.includes(lang as Lang)
    ? (lang as Lang)
    : (config.settings.default_language as Lang);
}
export function url(lang: Lang, path = "") {
  const [pathname, query] = path.split("?");
  const localized = slugSelector(
    pathname ? `/${pathname.replace(/^\/|\/$/g, "")}` : "/",
    lang,
  );
  return query ? `${localized}?${query}` : localized;
}
export async function getCopy(lang: Lang): Promise<JournalCopy> {
  return (await getTranslations(lang)).journal;
}
type PostText = { title: string; summary: string; takeaway: string };
export type Post = {
  slug: string;
  category: Category;
  minutes: number;
  motif: string;
  order: number;
  issue: number;
  sample: boolean;
  entry: CollectionEntry<"blog">;
  text: Record<Lang, PostText>;
};
export function toPost(entry: CollectionEntry<"blog">): Post {
  const { data } = entry;
  const text = {
    title: data.title,
    summary: data.description || "",
    takeaway: data.takeaway || data.description || "",
  };
  const category = data.journal_category || "research";
  return {
    slug: entry.id.split("/").pop()!,
    category,
    minutes:
      data.minutes ||
      Math.max(1, Math.ceil((entry.body || "").split(/\s+/).length / 220)),
    motif:
      data.motif ||
      (category === "life"
        ? "life"
        : category === "foundation"
          ? "etf"
          : "factor"),
    order: data.order ?? 999,
    issue: data.issue ?? 1,
    sample: data.sample_draft ?? false,
    entry,
    text: { en: text, zh: text, ms: text },
  };
}
export async function getPosts(lang: Lang): Promise<Post[]> {
  const contentDir = languageConfig.find(
    (l) => l.languageCode === lang,
  )!.contentDir;
  const now = new Date();
  const entries = await getCollection(
    "blog",
    ({ id, data }) =>
      id.startsWith(`${contentDir}/`) &&
      !id.endsWith("-index") &&
      !data.draft &&
      (!data.date || data.date <= now),
  );
  return entries
    .map(toPost)
    .sort(
      (a, b) =>
        a.order - b.order ||
        (b.entry.data.date?.getTime() || 0) -
          (a.entry.data.date?.getTime() || 0),
    );
}

export function searchText(post: Post, copy: JournalCopy): string {
  return [
    post.entry.data.title,
    post.entry.data.description,
    post.entry.data.takeaway,
    copy.categories[post.category],
    ...post.entry.data.tags,
    (post.entry.body || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/^import .*$/gm, ""),
  ].join(" ");
}
