import Image from "next/image";
import Link from "next/link";

import { formatPublishTime } from "@/lib/date";
import { NewsItem } from "@/types/news";

type NewsCardProps = {
  article: NewsItem;
};

export function NewsCard({ article }: NewsCardProps) {
  return (
    <article className="news-card">
      <div className="news-card-image-wrap">
        <Image
          src={article.imageUrl}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="news-card-image"
        />
      </div>
      <div className="news-card-content">
        <p className="news-card-time">{formatPublishTime(article.publishedAt)}</p>
        <h2 className="news-card-title">{article.title}</h2>
        <p className="news-card-summary">{article.summary}</p>
        <Link href={article.readMoreUrl} target="_blank" className="news-card-link">
          阅读更多
        </Link>
      </div>
    </article>
  );
}
