"use client";

import { useState } from "react";

import { NewsGrid } from "./NewsGrid";
import { RefreshNewsButton } from "./RefreshNewsButton";
import { HistoryPanel } from "./HistoryPanel";
import { FavoritesPanel } from "./FavoritesPanel";
import { ParticleBackground } from "./ParticleBackground";
import { NewsItem } from "@/types/news";

type ClientPageProps = {
  articles: NewsItem[];
};

type TabType = "news" | "history" | "favorites";

export function ClientPage({ articles }: ClientPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("news");
  const [displayArticles, setDisplayArticles] = useState(articles);
  const [newArticleIds, setNewArticleIds] = useState<Set<string>>(new Set());

  const handleRefresh = (newArticles: NewsItem[]) => {
    const oldUrls = new Set(displayArticles.map(a => a.readMoreUrl));
    const newlyAddedArticles = newArticles.filter(a => !oldUrls.has(a.readMoreUrl));
    const newIdsSet = new Set(newlyAddedArticles.map(a => a.id));
    
    const existingArticles = displayArticles.filter(a => !new Set(newArticles.map(n => n.readMoreUrl)).has(a.readMoreUrl));
    const mergedArticles = [...newArticles, ...existingArticles];
    
    setNewArticleIds(newIdsSet);
    setDisplayArticles(mergedArticles);
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
