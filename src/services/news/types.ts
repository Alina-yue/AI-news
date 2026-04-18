import { NewsItem } from "@/types/news";

export type NewsProvider = {
  getLatestNews: () => Promise<NewsItem[]>;
};
