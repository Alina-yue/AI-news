import { kv } from '@vercel/kv';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NewsItem } from '@/types/news';

const LOCAL_JSON_FILE = join(process.cwd(), 'ai_news.json');
const LOCAL_META_FILE = join(process.cwd(), 'ai_news_meta.json');
const KV_KEY_NEWS = 'ai_news';
const KV_KEY_META = 'ai_news_meta';

export type LocalNewsItem = {
  title?: string;
  link?: string;
  published?: string;
  published_iso?: string;
  summary?: string;
  source?: string;
  fetched_at?: string;
  image_url?: string;
};

export type LocalMeta = {
  last_refreshed_at?: string;
};

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

export async function readNews(): Promise<NewsItem[]> {
  if (process.env.VERCEL_ENV) {
    return readNewsFromKV();
  }
  return readNewsFromFile();
}

export async function writeNews(items: NewsItem[]): Promise<void> {
  if (process.env.VERCEL_ENV) {
    await writeNewsToKV(items);
  } else {
    await writeNewsToFile(items);
  }
}

export async function readMeta(): Promise<LocalMeta> {
  if (process.env.VERCEL_ENV) {
    return readMetaFromKV();
  }
  return readMetaFromFile();
}

export async function writeMeta(meta: LocalMeta): Promise<void> {
  if (process.env.VERCEL_ENV) {
    await writeMetaToKV(meta);
  } else {
    await writeMetaToFile(meta);
  }
}

async function readNewsFromFile(): Promise<NewsItem[]> {
  try {
    const fileContent = await readFile(LOCAL_JSON_FILE, 'utf-8');
    const parsed = JSON.parse(fileContent) as LocalNewsItem[];
    return mapLocalToNewsItem(parsed);
  } catch {
    return [];
  }
}

async function writeNewsToFile(items: NewsItem[]): Promise<void> {
  const localItems = items.map(newsItemToLocal);
  await writeFile(LOCAL_JSON_FILE, JSON.stringify(localItems, null, 2));
}

async function readMetaFromFile(): Promise<LocalMeta> {
  try {
    const metaContent = await readFile(LOCAL_META_FILE, 'utf-8');
    return JSON.parse(metaContent) as LocalMeta;
  } catch {
    return {};
  }
}

async function writeMetaToFile(meta: LocalMeta): Promise<void> {
  await writeFile(LOCAL_META_FILE, JSON.stringify(meta, null, 2));
}

async function readNewsFromKV(): Promise<NewsItem[]> {
  try {
    const data = await kv.get<string>(KV_KEY_NEWS);
    if (!data) return [];
    const parsed = JSON.parse(data) as LocalNewsItem[];
    return mapLocalToNewsItem(parsed);
  } catch {
    return [];
  }
}

async function writeNewsToKV(items: NewsItem[]): Promise<void> {
  const localItems = items.map(newsItemToLocal);
  await kv.set(KV_KEY_NEWS, JSON.stringify(localItems));
}

async function readMetaFromKV(): Promise<LocalMeta> {
  try {
    const data = await kv.get<string>(KV_KEY_META);
    if (!data) return {};
    return JSON.parse(data) as LocalMeta;
  } catch {
    return {};
  }
}

async function writeMetaToKV(meta: LocalMeta): Promise<void> {
  await kv.set(KV_KEY_META, JSON.stringify(meta));
}

function mapLocalToNewsItem(items: LocalNewsItem[]): NewsItem[] {
  if (!Array.isArray(items)) return [];

  const hash = (str: string) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h = h & h;
    }
    return Math.abs(h).toString(16);
  };

  return items
    .map((item) => {
      const title = stripHtml(item.title ?? '');
      const readMoreUrl = (item.link ?? '').trim();
      if (!title || !readMoreUrl) return null;

      const id = `news-${hash(readMoreUrl)}-${hash(item.source || '')}`;

      return {
        id,
        title,
        summary: stripHtml(item.summary ?? '') || '暂无摘要，点击查看原文。',
        imageUrl: (item.image_url as string | undefined) || '',
        publishedAt: item.published_iso ?? item.published ?? new Date().toISOString(),
        originalPublished: item.published,
        readMoreUrl,
        source: item.source ?? 'RSS',
      } as NewsItem;
    })
    .filter((item): item is NewsItem => item !== null);
}

function newsItemToLocal(item: NewsItem): LocalNewsItem {
  return {
    title: item.title,
    link: item.readMoreUrl,
    published: item.originalPublished || item.publishedAt,
    published_iso: item.publishedAt,
    summary: item.summary,
    source: item.source,
    fetched_at: new Date().toISOString(),
    image_url: item.imageUrl,
  };
}
