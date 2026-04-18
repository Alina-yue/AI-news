import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NewsItem } from '@/types/news';

const LOCAL_JSON_FILE = join(process.cwd(), 'ai_news.json');
const LOCAL_META_FILE = join(process.cwd(), 'ai_news_meta.json');

let supabase: SupabaseClient | null = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
}

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
  if (supabase) {
    return readNewsFromSupabase();
  }
  return readNewsFromFile();
}

export async function writeNews(items: NewsItem[]): Promise<void> {
  if (supabase) {
    await writeNewsToSupabase(items);
  } else {
    await writeNewsToFile(items);
  }
}

export async function readMeta(): Promise<LocalMeta> {
  if (supabase) {
    return readMetaFromSupabase();
  }
  return readMetaFromFile();
}

export async function writeMeta(meta: LocalMeta): Promise<void> {
  if (supabase) {
    await writeMetaToSupabase(meta);
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

async function readNewsFromSupabase(): Promise<NewsItem[]> {
  try {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('news_items')
      .select('*')
      .order('published_at', { ascending: false });
    
    if (error || !data) return [];
    
    return data.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary || '暂无摘要，点击查看原文。',
      imageUrl: item.image_url || '',
      publishedAt: item.published_at,
      originalPublished: item.original_published,
      readMoreUrl: item.read_more_url,
      source: item.source || 'RSS',
    }));
  } catch {
    return [];
  }
}

async function writeNewsToSupabase(items: NewsItem[]): Promise<void> {
  if (!supabase) return;
  
  for (const item of items) {
    await supabase
      .from('news_items')
      .upsert({
        id: item.id,
        title: item.title,
        summary: item.summary,
        image_url: item.imageUrl,
        published_at: item.publishedAt,
        original_published: item.originalPublished,
        read_more_url: item.readMoreUrl,
        source: item.source,
      });
  }
}

async function readMetaFromSupabase(): Promise<LocalMeta> {
  try {
    if (!supabase) return {};
    
    const { data, error } = await supabase
      .from('news_meta')
      .select('*')
      .single();
    
    if (error || !data) return {};
    
    return {
      last_refreshed_at: data.last_refreshed_at,
    };
  } catch {
    return {};
  }
}

async function writeMetaToSupabase(meta: LocalMeta): Promise<void> {
  if (!supabase) return;
  
  await supabase
    .from('news_meta')
    .upsert({
      id: 'default',
      last_refreshed_at: meta.last_refreshed_at,
    });
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
