"use client";

import { useState } from "react";

function formatDate(dateStr: string): string {
  try {
    if (!dateStr || dateStr === "当前页实时生成") {
      return dateStr || "未知";
    }
    
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    const rfc822Match = dateStr.match(/(\w{3}), (\d{2}) (\w{3}) (\d{4}) (\d{2}):(\d{2}):(\d{2}) (?:GMT|UTC|[+-]\d{4})/);
    if (rfc822Match) {
      const months: Record<string, number> = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
      };
      const year = rfc822Match[4];
      const month = String(months[rfc822Match[3]] + 1).padStart(2, "0");
      const day = rfc822Match[2];
      const hours = rfc822Match[5];
      const minutes = rfc822Match[6];
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
import { FavoritesPanel } from "./FavoritesPanel";
import { ParticleBackground } from "./ParticleBackground";
import { NewsItem } from "@/types/news";

type ClientPageProps = {
  articles: NewsItem[];
  lastRefreshTime: string;
};

type TabType = "news" | "history" | "favorites";

export function ClientPage({ articles, lastRefreshTime }: ClientPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("news");
  const [displayArticles, setDisplayArticles] = useState(articles);
  const [displayRefreshTime, setDisplayRefreshTime] = useState(lastRefreshTime);
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());

  const handleRefresh = (newArticles: NewsItem[], newRefreshTime: string) => {
    const oldUrls = new Set(displayArticles.map(a => a.readMoreUrl));
    const newlyAddedArticles = newArticles.filter(a => !oldUrls.has(a.readMoreUrl));
    const newIdsSet = new Set(newlyAddedArticles.map(a => a.id));
    
    const existingArticles = displayArticles.filter(a => !new Set(newArticles.map(n => n.readMoreUrl)).has(a.readMoreUrl));
    const mergedArticles = [...newArticles, ...existingArticles];
    
    setNewArticleIds(newIdsSet);
    setDisplayArticles(mergedArticles);
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
          网站聚合了量子位、InfoQ AI 和 OSCHINA AI 站点资讯，AI达人们快来获取最新资讯吧~
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
          <button
            className={`tab ${activeTab === "favorites" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            <span className="tab-icon">♥</span>
            <span className="tab-text">我的收藏</span>
          </button>
        </div>
      </div>

      {activeTab === "news" ? (
        <NewsGrid articles={displayArticles} newArticleIds={newArticleIds} showFavorite={true} />
      ) : activeTab === "history" ? (
        <HistoryPanel allArticles={displayArticles} />
      ) : (
        <FavoritesPanel />
      )}
    </main>
  );
}
