import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NewsItem } from "@/types/news";
import { rssSources, RssSource } from "@/services/news/rssSources";

export const runtime = "nodejs";

const LOCAL_JSON_FILE = join(process.cwd(), "ai_news.json");
const LOCAL_META_FILE = join(process.cwd(), "ai_news_meta.json");

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80";

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
    if (mediaContent.startsWith("//")) {
      return "https:" + mediaContent;
    }
    if (!mediaContent.startsWith("http")) {
      return fallback;
    }
    return mediaContent;
  }

  const mediaThumb = item["media:thumbnail"]?.["@_url"];
  if (mediaThumb) {
    if (mediaThumb.startsWith("//")) {
      return "https:" + mediaThumb;
    }
    if (!mediaThumb.startsWith("http")) {
      return fallback;
    }
    return mediaThumb;
  }

  const enclosureUrl = item.enclosure?.["@_url"];
  const enclosureType = item.enclosure?.["@_type"] ?? "";
  if (enclosureUrl && enclosureType.startsWith("image/")) {
    if (enclosureUrl.startsWith("//")) {
      return "https:" + enclosureUrl;
    }
    if (!enclosureUrl.startsWith("http")) {
      return fallback;
    }
    return enclosureUrl;
  }

  const html = item["content:encoded"] ?? item.description ?? "";
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imageMatch?.[1]) {
    const imgSrc = imageMatch[1];
    if (imgSrc.startsWith("//")) {
      return "https:" + imgSrc;
    }
    if (!imgSrc.startsWith("http")) {
      return fallback;
    }
    return imgSrc;
  }

  return fallback;
}

function parseDate(dateStr: string | undefined): string {
  if (!dateStr) {
    return new Date().toISOString();
  }
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch {
    // 继续尝试其他格式
  }
  
  return new Date().toISOString();
}

function mapItem(item: ParsedRssItem, source: RssSource, index: number): NewsItem | null {
  const title = stripHtml(item.title ?? "");
  const readMoreUrl = extractLink(item.link);
  
  if (!title || !readMoreUrl) {
    return null;
  }

  const rawSummary = item.description ?? item["content:encoded"] ?? "";
  const cleanSummary = stripHtml(rawSummary);

  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(16);
  };

  const pubDate = item.pubDate ?? item.published;
  
  return {
    id: `news-${hash(readMoreUrl)}-${hash(source.name)}`,
    title,
    summary: cleanSummary || "暂无摘要，点击查看原文。",
    imageUrl: extractImageUrl(item, source.defaultImageUrl || FALLBACK_IMAGE),
    publishedAt: parseDate(pubDate),
    originalPublished: pubDate,
    readMoreUrl,
    source: source.name
  };
}

function matchesSourceFilter(item: ParsedRssItem, source: RssSource): boolean {
  if (!source.includePathPrefixes || source.includePathPrefixes.length === 0) {
    return true;
  }

  const link = extractLink(item.link).toLowerCase();
  if (!link) {
    return false;
  }

  return source.includePathPrefixes.some((prefix) => link.startsWith(prefix.toLowerCase()));
}

async function fetchSource(source: RssSource): Promise<NewsItem[]> {
  const candidateUrls = [source.url, ...(source.fallbackUrls ?? [])];
  const errors: string[] = [];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        },
        timeout: 30000
      });
      
      if (!response.ok) {
        errors.push(`${url} -> HTTP ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const parsed = parser.parse(xml) as ParsedRss;
      const channelItems = toArray(parsed.rss?.channel?.item);
      const atomItems = toArray(parsed.feed?.entry);
      const items = channelItems.length > 0 ? channelItems : atomItems;
      
      const mapped = items
        .filter((item) => matchesSourceFilter(item, source))
        .map((item, index) => mapItem(item, source, index))
        .filter((item): item is NewsItem => item !== null);

      if (mapped.length > 0) {
        return mapped;
      }
      errors.push(`${url} -> no parsable entries`);
    } catch (error) {
      errors.push(`${url} -> ${(error as Error).message}`);
    }
  }

  console.warn(`Failed to fetch RSS: ${source.name}; ${errors.join(" | ")}`);
  return [];
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

type LocalNewsItem = {
  title?: string;
  link?: string;
  published?: string;
  published_iso?: string;
  summary?: string;
  source?: string;
  fetched_at?: string;
  image_url?: string;
};

async function readLocalNews(): Promise<LocalNewsItem[]> {
  try {
    const fileContent = await readFile(LOCAL_JSON_FILE, "utf-8");
    const parsed = JSON.parse(fileContent) as LocalNewsItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveNewsToLocal(newsItems: NewsItem[]): Promise<number> {
  const existingNews = await readLocalNews();
  const existingLinks = new Set(existingNews.map(item => item.link));
  
  const newItems: LocalNewsItem[] = newsItems
    .filter(item => !existingLinks.has(item.readMoreUrl))
    .map(item => ({
      title: item.title,
      link: item.readMoreUrl,
      published: item.originalPublished || item.publishedAt,
      published_iso: item.publishedAt,
      summary: item.summary,
      source: item.source,
      fetched_at: new Date().toISOString(),
      image_url: item.imageUrl
    }));
  
  const merged = [...newItems, ...existingNews];
  await writeFile(LOCAL_JSON_FILE, JSON.stringify(merged, null, 2));
  
  await writeFile(LOCAL_META_FILE, JSON.stringify({
    last_refreshed_at: new Date().toISOString()
  }, null, 2));
  
  return newItems.length;
}

function getDaysAgoDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isWithinDays(dateStr: string, days: number): boolean {
  const newsDate = new Date(dateStr);
  const cutoffDate = getDaysAgoDate(days);
  return newsDate >= cutoffDate;
}

export async function POST() {
  try {
    const results = await Promise.allSettled(
      rssSources.map((source) => fetchSource(source))
    );
    
    const merged = results
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === "fulfilled")
      .flatMap((result) => result.value);

    const unique = dedupeByLink(merged);
    const sorted = unique.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    const existingNews = await readLocalNews();
    const existingLinks = new Set(existingNews.map(item => item.link));
    
    const unfetchedNews = sorted.filter(item => !existingLinks.has(item.readMoreUrl));
    
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    
    const todayNews = unfetchedNews.filter(item => {
      const pubDate = new Date(item.publishedAt);
      return pubDate >= todayStart && pubDate < todayEnd;
    });
    
    const last3DaysNews = unfetchedNews.filter(item => isWithinDays(item.publishedAt, 3));
    const last7DaysNews = unfetchedNews.filter(item => isWithinDays(item.publishedAt, 7));
    
    let selectedNews: NewsItem[];
    let message: string;
    let isExpandedRange = false;
    
    if (todayNews.length > 0) {
      selectedNews = todayNews.slice(0, 5);
    } else if (last3DaysNews.length > 0) {
      selectedNews = last3DaysNews.slice(0, 5);
      isExpandedRange = true;
    } else if (last7DaysNews.length > 0) {
      selectedNews = last7DaysNews.slice(0, 5);
      isExpandedRange = true;
    } else {
      selectedNews = unfetchedNews.slice(0, 5);
      isExpandedRange = true;
    }
    
    const newlyAddedCount = await saveNewsToLocal(selectedNews);
    
    revalidatePath("/");

    if (newlyAddedCount === 0) {
      if (last7DaysNews.length === 0) {
        message = "7日内最新资讯均已获取，暂无新资讯";
      } else if (last3DaysNews.length === 0) {
        message = `3日内最新资讯均已获取，扩大抓取范围至7日内，已更新${selectedNews.length}条`;
      } else {
        message = "暂无新资讯，已是最新";
      }
    } else if (isExpandedRange && last7DaysNews.length > 0 && last3DaysNews.length === 0) {
      message = `3日内最新资讯均已获取，扩大抓取范围至7日内，已更新${newlyAddedCount}条`;
    } else if (newlyAddedCount === 5) {
      message = "已更新5条新闻";
    } else {
      message = `已更新${newlyAddedCount}条新闻`;
    }

    return NextResponse.json({
      ok: true,
      message,
      newCount: newlyAddedCount,
      totalFetched: sorted.length,
      articles: selectedNews,
      lastRefreshedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "资讯刷新失败",
        error: error instanceof Error ? error.message : "未知错误"
      },
      { status: 500 }
    );
  }
}
