import { XMLParser } from 'fast-xml-parser';

import { NewsItem } from '@/types/news';

import { NewsProvider } from './types';
import { rssSources, RssSource } from './rssSources';
import { readNews, readMeta, LocalMeta } from '@/lib/storage';

type ParsedRssItem = {
  title?: string;
  link?: string | { href?: string };
  pubDate?: string;
  published?: string;
  description?: string;
  'content:encoded'?: string;
  enclosure?: { '@_url'?: string; '@_type'?: string };
  'media:content'?: { '@_url'?: string };
  'media:thumbnail'?: { '@_url'?: string };
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
  attributeNamePrefix: '@_',
});

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80';

function stripHtml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
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
    return '';
  }
  if (typeof rawLink === 'string') {
    return rawLink;
  }
  return rawLink.href ?? '';
}

function extractImageUrl(item: ParsedRssItem, fallback: string): string {
  const mediaContent = item['media:content']?.['@_url'];
  if (mediaContent) {
    return mediaContent;
  }

  const mediaThumb = item['media:thumbnail']?.['@_url'];
  if (mediaThumb) {
    return mediaThumb;
  }

  const enclosureUrl = item.enclosure?.['@_url'];
  const enclosureType = item.enclosure?.['@_type'] ?? '';
  if (enclosureUrl && enclosureType.startsWith('image/')) {
    return enclosureUrl;
  }

  const html = item['content:encoded'] ?? item.description ?? '';
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imageMatch?.[1]) {
    return imageMatch[1];
  }

  return fallback;
}

function mapItem(item: ParsedRssItem, source: RssSource, index: number): NewsItem | null {
  const title = stripHtml(item.title ?? '');
  const readMoreUrl = extractLink(item.link);
  if (!title || !readMoreUrl) {
    return null;
  }

  const rawSummary = item.description ?? item['content:encoded'] ?? '';
  const cleanSummary = stripHtml(rawSummary);

  return {
    id: `${source.id}-${index}-${readMoreUrl}`,
    title,
    summary: cleanSummary || '暂无摘要，点击查看原文。',
    imageUrl: extractImageUrl(item, source.defaultImageUrl),
    publishedAt: item.pubDate ?? item.published ?? new Date().toISOString(),
    readMoreUrl,
    source: source.name,
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

export async function fetchSource(source: RssSource): Promise<NewsItem[]> {
  const candidateUrls = [source.url, ...(source.fallbackUrls ?? [])];
  const errors: string[] = [];

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 1800 },
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

  throw new Error(`Failed to fetch RSS: ${source.name}; ${errors.join(' | ')}`);
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

export async function getLastRefreshTime(): Promise<string | null> {
  const meta = await readMeta();
  if (meta.last_refreshed_at) {
    const ts = new Date(meta.last_refreshed_at).getTime();
    if (Number.isFinite(ts)) {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(ts));
    }
  }

  try {
    const news = await readNews();
    if (news.length === 0) {
      return null;
    }

    const timestamps = news
      .map((item) => item.publishedAt)
      .map((value) => new Date(value).getTime())
      .filter((value) => Number.isFinite(value));

    if (timestamps.length === 0) {
      return null;
    }

    const latest = new Date(Math.max(...timestamps));
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(latest);
  } catch {
    return null;
  }
}

export const rssNewsProvider: NewsProvider = {
  async getLatestNews(): Promise<NewsItem[]> {
    const localNews = await readNews();
    if (localNews.length > 0) {
      return dedupeByLink(localNews).sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    const results = await Promise.allSettled(rssSources.map((source) => fetchSource(source)));
    const merged = results
      .filter((result): result is PromiseFulfilledResult<NewsItem[]> => result.status === 'fulfilled')
      .flatMap((result) => result.value);

    const sorted = dedupeByLink(merged).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return sorted;
  },
};
