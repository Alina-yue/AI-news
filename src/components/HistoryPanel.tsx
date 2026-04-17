"use client";

import { useState, useEffect } from "react";

import { NewsCard } from "./NewsCard";
import { NewsItem } from "@/types/news";

type HistoryPanelProps = {
  allArticles: NewsItem[];
};

export function HistoryPanel({ allArticles }: HistoryPanelProps) {
  const [historyArticles, setHistoryArticles] = useState<NewsItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, [allArticles]);

  const loadHistory = () => {
    const historyData = localStorage.getItem("readingHistory") || "{}";
    const history = JSON.parse(historyData);
    
    const articlesWithHistory: NewsItem[] = [];
    const historyIds = Object.keys(history);
    
    for (const id of historyIds) {
      const article = allArticles.find(a => a.id === id);
      if (article) {
        articlesWithHistory.push(article);
      }
    }
    
    articlesWithHistory.sort((a, b) => {
      const historyData = localStorage.getItem("readingHistory") || "{}";
      const history = JSON.parse(historyData);
      return new Date(history[b.id] || "").getTime() - new Date(history[a.id] || "").getTime();
    });
    
    setHistoryArticles(articlesWithHistory);
  };

  const handleRemove = (id: string) => {
    const historyData = localStorage.getItem("readingHistory") || "{}";
    const history = JSON.parse(historyData);
    delete history[id];
    localStorage.setItem("readingHistory", JSON.stringify(history));
    loadHistory();
  };

  const handleClearAll = () => {
    if (window.confirm("确定要清空所有历史记录吗？")) {
      localStorage.removeItem("readingHistory");
      setHistoryArticles([]);
    }
  };

  return (
    <div className="history-panel">
      <div className="history-header">
        <h2 className="history-title">
          <span className="history-icon">📚</span>
          历史阅读
        </h2>
        <div className="history-stats">
          共 {historyArticles.length} 篇
        </div>
        {historyArticles.length > 0 && (
          <button className="history-clear-btn" onClick={handleClearAll}>
            清空历史
          </button>
        )}
      </div>

      {historyArticles.length === 0 ? (
        <div className="history-empty">
          <div className="history-empty-icon">🔍</div>
          <p className="history-empty-text">暂无阅读历史</p>
          <p className="history-empty-hint">点击新闻卡片的"阅读更多"链接后，会在这里显示</p>
        </div>
      ) : (
        <div className="history-grid">
          {historyArticles.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              showReadTime={true}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
