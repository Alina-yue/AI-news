export type RssSource = {
  id: string;
  name: string;
  url: string;
  fallbackUrls?: string[];
  defaultImageUrl: string;
  includePathPrefixes?: string[];
};

export const rssSources: RssSource[] = [
  {
    id: "qbitai",
    name: "量子位",
    url: "https://www.qbitai.com/feed",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "infoq-ai",
    name: "InfoQ AI",
    url: "https://www.infoq.cn/feed?tag=AI",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "oschina-ai",
    name: "OSCHINA AI",
    url: "https://www.oschina.net/news/rss/ai",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80"
  }
];
