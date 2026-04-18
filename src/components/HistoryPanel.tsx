"use client";

import { useState, useEffect } from "react";

import { NewsCard } from "./NewsCard";
import { NewsItem } from "@/types/news";

type HistoryPanelProps = {
  allArticles: NewsItem[];
};

const PAGE_SIZE = 6;

export function HistoryPanel({ allArticles }: HistoryPanelProps) {
  const [historyArticles, setHistoryArticles] = useState<NewsItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

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
    setCurrentPage(1);
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
      setCurrentPage(1);
    }
  };

  const totalPages = Math.ceil(historyArticles.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const displayedArticles = historyArticles.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handlePrev = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const renderPageNumbers = () => {
    const pages: React.ReactNode[] = [];
    
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageClick(i)}
            className={`pagination-item ${i === currentPage ? "pagination-item-active" : ""}`}
            disabled={i === currentPage}
          >
            {i}
          </button>
        );
      }
    } else {
      let leftBound = Math.max(1, currentPage - 2);
      let rightBound = Math.min(totalPages, currentPage + 2);
      
      if (currentPage <= 3) {
        rightBound = 5;
      }
      
      if (currentPage >= totalPages - 2) {
        leftBound = totalPages - 4;
      }
      
      if (leftBound > 1) {
        pages.push(
          <button
            key={1}
            onClick={() => handlePageClick(1)}
            className={`pagination-item ${1 === currentPage ? "pagination-item-active" : ""}`}
            disabled={1 === currentPage}
          >
            1
          </button>
        );
        
        if (leftBound > 2) {
          pages.push(<span key="ellipsis-start" className="pagination-ellipsis">...</span>);
        }
      }
      
      for (let i = leftBound; i <= rightBound; i++) {
        pages.push(
          <button
            key={i}
            onClick={() => handlePageClick(i)}
            className={`pagination-item ${i === currentPage ? "pagination-item-active" : ""}`}
            disabled={i === currentPage}
          >
            {i}
          </button>
        );
      }
      
      if (rightBound < totalPages) {
        if (rightBound < totalPages - 1) {
          pages.push(<span key="ellipsis-end" className="pagination-ellipsis">...</span>);
        }
        
        pages.push(
          <button
            key={totalPages}
            onClick={() => handlePageClick(totalPages)}
            className={`pagination-item ${totalPages === currentPage ? "pagination-item-active" : ""}`}
            disabled={totalPages === currentPage}
          >
            {totalPages}
          </button>
        );
      }
    }
    
    return pages;
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
        <>
          <div className="news-grid">
            {displayedArticles.map((article) => (
              <NewsCard
                key={article.id}
                article={article}
                showReadTime={true}
                onRemove={handleRemove}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <nav className="pagination" aria-label="历史阅读分页">
              <button
                className="pagination-btn"
                onClick={handlePrev}
                disabled={currentPage === 1}
                aria-label="上一页"
              >
                ←
              </button>
              <div className="pagination-items">
                {renderPageNumbers()}
              </div>
              <button
                className="pagination-btn"
                onClick={handleNext}
                disabled={currentPage === totalPages}
                aria-label="下一页"
              >
                →
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
