"use client";

import { useState } from "react";

function formatDate(dateStr: string): string {
  try {
    if (!dateStr || dateStr === "当前页实时生成") {
      return dateStr || "未知";
    }
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");
      const hours = String(date.getUTCHours()).padStart(2, "0");
      const minutes = String(date.getUTCMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    const slashMatch = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s*(\d{1,2}):(\d{2})(?::\d{2})?/);
    if (slashMatch) {
      const year = slashMatch[1];
      const month = String(parseInt(slashMatch[2])).padStart(2, "0");
      const day = String(parseInt(slashMatch[3])).padStart(2, "0");
      const hours = String(parseInt(slashMatch[4])).padStart(2, "0");
      const minutes = slashMatch[5];
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    const simpleMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (simpleMatch) {
      return `${simpleMatch[1]}-${simpleMatch[2]}-${simpleMatch[3]} 00:00`;
    }
    
    return dateStr;
  } catch {
    return dateStr || "未知";
  }
}

import { NewsGrid } from "./NewsGrid";
import { RefreshNewsButton } from "./RefreshNewsButton";
import { HistoryPanel } from "./HistoryPanel";
import { ParticleBackground } from "./ParticleBackground";
import { NewsItem } from "@/types/news";

type ClientPageProps = {
  articles: NewsItem[];
  lastRefreshTime: string;
};

type TabType = "news" | "history";

export function ClientPage({ articles, lastRefreshTime }: ClientPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("news");
  const [displayArticles, setDisplayArticles] = useState(articles);
  const [displayRefreshTime, setDisplayRefreshTime] = useState(lastRefreshTime);
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());

  const handleRefresh = (newArticles: NewsItem[], newRefreshTime: string) => {
    const oldIds = new Set(displayArticles.map(a => a.id));
    const newlyAddedIds = newArticles.filter(a => !oldIds.has(a.id)).map(a => a.id);
    const newIdsSet = new Set(newlyAddedIds);
    
    setNewArticleIds(newIdsSet);
    setDisplayArticles(newArticles);
    setDisplayRefreshTime(newRefreshTime);
    if (activeTab === "history") {
      setActiveTab("news");
    }
  };

  return (
    <main className="page">
      <ParticleBackground />
      <header className="hero">
        <p className="hero-kicker">AI News Aggregator</p>
        <h1 className="hero-title">AI资讯聚合网站</h1>
        <p className="hero-desc">
          聚合量子位、InfoQ AI 和 OSCHINA AI 的资讯。页面优先展示脚本抓取并保存到 ai_news.json 的内容，缺失时自动回退到实时 RSS。
        </p>
        <p className="hero-meta">最后刷新时间：{formatDate(displayRefreshTime)}</p>
        <RefreshNewsButton onRefresh={handleRefresh} />
      </header>

      <div className="tab-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === "news" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("news")}
          >
            <span className="tab-icon">📰</span>
            <span className="tab-text">最新资讯</span>
            <span className="tab-count">{displayArticles.length}</span>
          </button>
          <button
            className={`tab ${activeTab === "history" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <span className="tab-icon">📚</span>
            <span className="tab-text">历史阅读</span>
          </button>
        </div>
      </div>

      {activeTab === "news" ? (
        <NewsGrid articles={displayArticles} newArticleIds={newArticleIds} />
      ) : (
        <HistoryPanel allArticles={displayArticles} />
      )}
    </main>
  );
}
