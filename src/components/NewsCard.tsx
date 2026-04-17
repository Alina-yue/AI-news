"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

import { formatPublishTime } from "@/lib/date";
import { NewsItem } from "@/types/news";

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1677442136019-21780ecad998?w=600&h=400&fit=crop";

type NewsCardProps = {
  article: NewsItem;
  showReadTime?: boolean;
  onRemove?: (id: string) => void;
  isNew?: boolean;
};

export function NewsCard({ article, showReadTime = false, onRemove, isNew = false }: NewsCardProps) {
  const [isRead, setIsRead] = useState(false);
  const [readTime, setReadTime] = useState<string | null>(null);
  const [showNewIndicator, setShowNewIndicator] = useState(isNew && !isRead);
  const [imageUrl, setImageUrl] = useState(article.imageUrl || DEFAULT_IMAGE);

  const handleImageError = () => {
    setImageUrl(DEFAULT_IMAGE);
  };

  useEffect(() => {
    const historyData = localStorage.getItem("readingHistory") || "{}";
    const history = JSON.parse(historyData);
    if (history[article.id]) {
      setIsRead(true);
      setReadTime(history[article.id]);
      setShowNewIndicator(false);
    }
  }, [article.id]);

  const handleClick = () => {
    const historyData = localStorage.getItem("readingHistory") || "{}";
    const history = JSON.parse(historyData);
    
    if (!history[article.id]) {
      history[article.id] = new Date().toISOString();
      localStorage.setItem("readingHistory", JSON.stringify(history));
      setIsRead(true);
      setReadTime(history[article.id]);
    }
    setShowNewIndicator(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(article.id);
    }
  };

  return (
    <article className={`news-card ${isRead ? "news-card-read" : ""}`}>
      {showNewIndicator && (
        <span className="news-card-new-indicator"></span>
      )}
      <div className="news-card-image-wrap">
        <Image
          src={imageUrl}
          alt={article.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="news-card-image"
          onError={handleImageError}
        />
      </div>
      <div className="news-card-content">
        <p className="news-card-time">
          {article.source ? `${article.source} · ` : ""}
          {formatPublishTime(article.publishedAt, article.originalPublished)}
        </p>
        {showReadTime && readTime && (
          <p className="news-card-read-time">
            上次阅读：{formatReadTime(readTime)}
          </p>
        )}
        <h2 className="news-card-title">{article.title}</h2>
        <p className="news-card-summary">{article.summary}</p>
        <div className="news-card-actions">
          <Link
            href={article.readMoreUrl}
            target="_blank"
            className="news-card-link"
            onClick={handleClick}
          >
            阅读更多
          </Link>
          {onRemove && (
            <button 
              className="news-card-remove" 
              onClick={handleRemove}
              title="从历史记录中移除"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function formatReadTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) {
    return "刚刚";
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }
}
