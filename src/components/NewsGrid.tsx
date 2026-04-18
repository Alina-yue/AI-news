"use client";

import { useState } from "react";

import { NewsCard } from "@/components/NewsCard";
import { NewsItem } from "@/types/news";

type NewsGridProps = {
  articles: NewsItem[];
  newArticleIds?: Set<string>;
  showFavorite?: boolean;
};

const PAGE_SIZE = 6;
const MAX_VISIBLE_PAGES = 5;

export function NewsGrid({ articles, newArticleIds, showFavorite = false }: NewsGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(articles.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const displayedArticles = articles.slice(startIndex, endIndex);

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

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const renderPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= MAX_VISIBLE_PAGES) {
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
    <div className="news-grid-wrapper">
      <section className="news-grid" aria-label="AI资讯列表">
        {displayedArticles.map((article) => (
          <NewsCard 
            key={article.id} 
            article={article} 
            isNew={newArticleIds?.has(article.id) || false}
            showFavorite={showFavorite}
          />
        ))}
      </section>

      {totalPages > 1 && (
        <nav className="pagination" aria-label="新闻分页">
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
