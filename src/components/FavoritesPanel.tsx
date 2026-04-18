"use client";

import { useState, useEffect } from "react";
import { NewsCard } from "./NewsCard";
import { NewsItem } from "@/types/news";

const PAGE_SIZE = 6;

export function FavoritesPanel() {
  const [favorites, setFavorites] = useState<NewsItem[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = () => {
    const favoritesData = localStorage.getItem("favorites") || "{}";
    const favoritesObj = JSON.parse(favoritesData);
    const favoritesList = Object.values(favoritesObj).map((item: any) => item.article) as NewsItem[];
    favoritesList.sort((a, b) => {
      const aData = favoritesObj[a.id];
      const bData = favoritesObj[b.id];
      return new Date(bData.addedAt).getTime() - new Date(aData.addedAt).getTime();
    });
    setFavorites(favoritesList);
    setCurrentPage(1);
  };

  const handleRemove = (id: string) => {
    const favoritesData = localStorage.getItem("favorites") || "{}";
    const favoritesObj = JSON.parse(favoritesData);
    delete favoritesObj[id];
    localStorage.setItem("favorites", JSON.stringify(favoritesObj));
    loadFavorites();
  };

  if (favorites.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">♥</div>
        <h3>暂无收藏</h3>
        <p>点击新闻卡片右下角的爱心按钮收藏喜欢的文章</p>
      </div>
    );
  }

  const totalPages = Math.ceil(favorites.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const displayedArticles = favorites.slice(startIndex, startIndex + PAGE_SIZE);

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
    <div className="favorites-panel">
      <div className="favorites-header">
        <h2>我的收藏</h2>
        <span className="favorites-count">{favorites.length} 篇</span>
      </div>
      <div className="news-grid">
        {displayedArticles.map((article) => (
          <NewsCard
            key={article.id}
            article={article}
            showReadTime={false}
            onRemove={handleRemove}
            showFavorite={true}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <nav className="pagination" aria-label="我的收藏分页">
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
    </div>
  );
}