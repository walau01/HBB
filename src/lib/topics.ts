import topicsJSON from "@/config/topics.json";
import type { Lang } from "@/lib/journal";

export type SignVariant = "enamel" | "wave" | "flame" | "bulbs";
export type Topic = {
  id: string;
  order: number;
  sign: SignVariant;
  name: Record<Lang, string>;
  signText: Record<Lang, string>;
  description: Record<Lang, string>;
  awning: { day: [string, string]; night: [string, string] };
};

export const topicList = [...(topicsJSON as Topic[])].sort(
  (a, b) => a.order - b.order,
);

export function getTopic(id: string) {
  return topicList.find((t) => t.id === id);
}

/** "2 articles" / "2 篇文章" from the interface copy. */
export function articleCount(
  n: number,
  copy: { articleCount: string; articleCountOne: string },
) {
  return n === 1
    ? copy.articleCountOne
    : copy.articleCount.replace("{n}", String(n));
}
