"use client";

import { useState, useEffect } from "react";
import { Note } from "@/types/note";
import { NewsItem } from "@/types/news";

const PAGE_SIZE = 6;

export function NotesPanel({ allArticles }: { allArticles: NewsItem[] }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const response = await fetch("/api/notes");
      const data = await response.json();
      if (data.notes) {
        setNotes(data.notes);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    }
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条笔记吗？")) return;
    
    try {
      const response = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setNotes(notes.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingNote || !editContent.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notes/${editingNote.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      
      if (response.ok) {
        setNotes(notes.map(n => 
          n.id === editingNote.id 
            ? { ...n, content: editContent, updatedAt: new Date().toISOString() }
            : n
        ));
        setEditingNote(null);
        setEditContent("");
      }
    } catch (error) {
      console.error("Error updating note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setEditContent("");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const findNewsById = (newsId: string) => {
    return allArticles.find(a => a.id === newsId);
  };

  if (notes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📝</div>
        <h3>暂无笔记</h3>
        <p>阅读新闻后，点击新闻卡片上的笔记按钮记录核心要点</p>
      </div>
    );
  }

  const totalPages = Math.ceil(notes.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const displayedNotes = notes.slice(startIndex, startIndex + PAGE_SIZE);

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
            className="pagination-item"
          >
            1
          </button>
        );
        if (leftBound > 2) {
          pages.push(<span key="left-ellipsis" className="pagination-ellipsis">...</span>);
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
          pages.push(<span key="right-ellipsis" className="pagination-ellipsis">...</span>);
        }
        pages.push(
          <button
            key={totalPages}
            onClick={() => handlePageClick(totalPages)}
            className="pagination-item"
          >
            {totalPages}
          </button>
        );
      }
    }
    
    return pages;
  };

  return (
    <div className="notes-panel">
      <div className="notes-list">
        {displayedNotes.map((note) => {
          const news = findNewsById(note.newsId);
          return (
            <div key={note.id} className="note-card">
              {editingNote?.id === note.id ? (
                <div className="note-edit-form">
                  <h4 className="note-edit-title">编辑笔记</h4>
                  <textarea
                    className="note-edit-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    placeholder="记录核心要点..."
                  />
                  <div className="note-edit-actions">
                    <button
                      className="note-btn note-btn-save"
                      onClick={handleSaveEdit}
                      disabled={isLoading}
                    >
                      {isLoading ? "保存中..." : "保存"}
                    </button>
                    <button
                      className="note-btn note-btn-cancel"
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="note-header">
                    <div className="note-meta">
                      <span className="note-date">{formatDate(note.createdAt)}</span>
                      {note.updatedAt !== note.createdAt && (
                        <span className="note-edited">(已编辑)</span>
                      )}
                    </div>
                    <div className="note-actions">
                      <button
                        className="note-action-btn"
                        onClick={() => handleEdit(note)}
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        className="note-action-btn"
                        onClick={() => handleDelete(note.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="note-content">{note.content}</div>
                  
                  {news && (
                    <a
                      href={news.readMoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="note-news-link"
                    >
                      <span className="note-news-icon">📰</span>
                      <span className="note-news-title">{note.newsTitle}</span>
                      <span className="note-news-arrow">→</span>
                    </a>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            onClick={handlePrev}
            disabled={currentPage === 1}
          >
            上一页
          </button>
          <div className="pagination-numbers">
            {renderPageNumbers()}
          </div>
          <button
            className="pagination-btn"
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
