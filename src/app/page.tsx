import { NewsGrid } from "@/components/NewsGrid";
import { rssNewsProvider } from "@/services/news/rssProvider";

export default async function HomePage() {
  const articles = await rssNewsProvider.getLatestNews();

  return (
    <main className="page">
      <header className="hero">
        <p className="hero-kicker">AI News Aggregator</p>
        <h1 className="hero-title">AI资讯聚合网站</h1>
        <p className="hero-desc">
          聚合最新AI产品新闻，保留原始语言内容。当前页面已接入真实 RSS 资讯源并自动按时间排序展示。
        </p>
      </header>

      <NewsGrid articles={articles} />
    </main>
  );
}
