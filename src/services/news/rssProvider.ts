import { XMLParser } from "fast-xml-parser";

import { NewsItem } from "@/types/news";

import { NewsProvider } from "./types";
import { rssSources, RssSource } from "./rssSources";

type ParsedRssItem = {
  title?: string;
  link?: string | { href?: string };
  pubDate?: string;
  published?: string;
  description?: string;
  "content:encoded"?: string;
  enclosure?: { "@_url"?: string; "@_type"?: string };
  "media:content"?: { "@_url"?: string };
  "media:thumbnail"?: { "@_url"?: string };
};

type ParsedRss = {
  rss?: {
    channel?: {
      item?: ParsedRssItem | ParsedRssItem[];
    };
  };
  feed?: {
    entry?: ParsedRssItem | ParsedRssItem[];
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

function stripHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function toArray<T>(value?: T | T[]): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function extractLink(rawLink?: string | { href?: string }): string {
  if (!rawLink) {
    return "";
  }
  if (typeof rawLink === "string") {
    return rawLink;
  }
  return rawLink.href ?? "";
}

function extractImageUrl(item: ParsedRssItem, fallback: string): string {
  const mediaContent = item["media:content"]?.["@_url"];
  if (mediaContent) {
    return mediaContent;
  }

  const mediaThumb = item["media:thumbnail"]?.["@_url"];
  if (mediaThumb) {
    return mediaThumb;
  }

  const enclosureUrl = item.enclosure?.["@_url"];
  const enclosureType = item.enclosure?.["@_type"] ?? "";
  if (enclosureUrl && enclosureType.startsWith("image/")) {
    return enclosureUrl;
  }

  const html = item["content:encoded"] ?? item.description ?? "";
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imageMatch?.[1]) {
    return imageMatch[1];
  }

  return fallback;
}

function mapItem(item: ParsedRssItem, source: RssSource, index: number): NewsItem | null {
  const title = stripHtml(item.title ?? "");
  const readMoreUrl = extractLink(item.link);
  if (!title || !readMoreUrl) {
    return null;
  }

  const rawSummary = item.description ?? item["content:encoded"] ?? "";
  const cleanSummary = stripHtml(rawSummary);

  return {
    id: `${source.id}-${index}-${readMoreUrl}`,
    title,
    summary: cleanSummary || "暂无摘要，点击查看原文。",
    imageUrl: extractImageUrl(item, source.defaultImageUrl),
    publishedAt: item.pubDate ?? item.published ?? new Date().toISOString(),
    readMoreUrl
  };
}

async function fetchSource(source: RssSource): Promise<NewsItem[]> {
  const response = await fetch(source.url, {
    next: { revalidate: 1800 }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${source.name}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml) as ParsedRss;
  const channelItems = toArray(parsed.rss?.channel?.item);
  const atomItems = toArray(parsed.feed?.entry);
  const items = channelItems.length > 0 ? channelItems : atomItems;

  return items
    .map((item, index) => mapItem(item, source, index))
    .filter((item): item is NewsItem => item !== null);
}

function dedupeByLink(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.readMoreUrl)) {
      return false;
    }
    seen.add(item.readMoreUrl);
    return true;
  });
}

export const rssNewsProvider: NewsProvider = {
  async getLatestNews(): Promise<NewsItem[]> {
    const results = await Promise.allSettled(rssSources.map((source) => fetchSource(source)));
    const merged = results
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const sorted = dedupeByLink(merged).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return sorted.slice(0, 30);
  }
};
