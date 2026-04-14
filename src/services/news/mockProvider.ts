import { mockNews } from "@/data/mockNews";
import { NewsItem } from "@/types/news";

import { NewsProvider } from "./types";

export const mockNewsProvider: NewsProvider = {
  async getLatestNews(): Promise<NewsItem[]> {
    return mockNews;
  }
};
