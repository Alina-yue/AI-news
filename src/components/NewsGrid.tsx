import { NewsCard } from "@/components/NewsCard";
import { NewsItem } from "@/types/news";

type NewsGridProps = {
  articles: NewsItem[];
};

export function NewsGrid({ articles }: NewsGridProps) {
  return (
    <section className="news-grid" aria-label="AI资讯列表">
      {articles.map((article) => (
        <NewsCard key={article.id} article={article} />
      ))}
    </section>
  );
}
