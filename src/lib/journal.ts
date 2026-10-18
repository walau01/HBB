import { getCollection, type CollectionEntry } from "astro:content";
import config from "@/config/config.json";
import languageConfig from "@/config/language.json";
import dictionary from "@/i18n/en.json";
import { getTranslations, slugSelector } from "@/lib/utils/languageParser";
import { getTopic, topicList, type Topic } from "@/lib/topics";
import { slugify as slugifyTag } from "@/lib/utils/textConverter";

export type Lang = "en" | "zh";
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
export type Post = {
  slug: string;
  topic: Topic;
  title: string;
  summary: string;
  takeaway: string;
  tags: string[];
  minutes: number;
  order: number;
  date?: Date;
  sample: boolean;
  entry: CollectionEntry<"blog">;
};
export function toPost(entry: CollectionEntry<"blog">): Post {
  const { data } = entry;
  const topic = data.topic && getTopic(data.topic);
  if (!topic) throw new Error(`${entry.id}: missing or unknown "topic"`);
  return {
    slug: entry.id.split("/").pop()!,
    topic,
    title: data.title,
    summary: data.description || "",
    takeaway: data.takeaway || data.description || "",
    tags: data.tags,
    minutes:
      data.minutes ||
      Math.max(1, Math.ceil((entry.body || "").split(/\s+/).length / 220)),
    order: data.order ?? 999,
    date: data.date,
    sample: data.sample_draft ?? false,
    entry,
  };
}
/** Published articles in a language, in reading order. */
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
        (b.date?.getTime() || 0) - (a.date?.getTime() || 0),
    );
}
/** Articles grouped by topic in topic order; newest first inside a group. */
export function groupByTopic(posts: Post[]) {
  return topicList.map((topic) => ({
    topic,
    posts: posts
      .filter((p) => p.topic.id === topic.id)
      .sort(
        (a, b) =>
          (b.date?.getTime() || 0) - (a.date?.getTime() || 0) ||
          a.order - b.order,
      ),
  }));
}
export function searchText(post: Post, lang: Lang): string {
  return [
    post.title,
    post.summary,
    post.takeaway,
    post.topic.name[lang],
    ...post.tags,
    (post.entry.body || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/^import .*$/gm, ""),
  ].join(" ");
}
/** "4 MIN" / "4 分钟" — the short read time used on boards and receipts. */
export function shortMinutes(minutes: number, copy: JournalCopy) {
  return copy.minShort.replace("{n}", String(minutes));
}
/** "12 Oct 2026" / "2026年10月12日". */
export function formatDate(date: Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "zh" ? "zh-CN" : "en-GB", {
    day: "numeric",
    month: lang === "zh" ? "long" : "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}
/** The fixed beginner path on Start here, and the chit's default picks. */
export const beginnerPath = [
  "what-you-own-in-an-etf",
  "the-quiet-work-of-compounding",
  "are-malaysian-etfs-bad",
];
export function pickSlugs(posts: Post[], slugs: string[]) {
  return slugs
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is Post => !!p);
}
/** Fill "{n}" in a count string, using the singular form for one. */
export function countText(n: number, many: string, one: string) {
  return n === 1 ? one : many.replace("{n}", String(n));
}
/** Tags used by these posts, with counts, in first-seen order. */
export function tagCounts(posts: Post[]) {
  const tags = new Map<string, { label: string; count: number }>();
  for (const p of posts)
    for (const label of p.tags) {
      const key = slugifyTag(label);
      tags.set(key, { label, count: (tags.get(key)?.count || 0) + 1 });
    }
  return [...tags].map(([slug, v]) => ({ slug, ...v }));
}
