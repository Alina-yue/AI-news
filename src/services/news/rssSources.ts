export type RssSource = {
  id: string;
  name: string;
  url: string;
  defaultImageUrl: string;
};

export const rssSources: RssSource[] = [
  {
    id: "openai",
    name: "OpenAI",
    url: "https://openai.com/news/rss.xml",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "anthropic",
    name: "Anthropic",
    url: "https://www.anthropic.com/news/rss.xml",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "google-ai",
    name: "Google AI",
    url: "https://blog.google/technology/ai/rss/",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80"
  },
  {
    id: "microsoft-ai",
    name: "Microsoft AI Blog",
    url: "https://blogs.microsoft.com/ai/feed/",
    defaultImageUrl:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80"
  }
];
