"use client";

import { useState } from "react";
import { NewsItem } from "@/types/news";

interface NoteModalProps {
  news: NewsItem;
  onClose: () => void;
  onSave: () => void;
}

export function NoteModal({ news, onClose, onSave }: NoteModalProps) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newsId: news.id,
          newsTitle: news.title,
          content: content.trim(),
        }),
      });
      
      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="note-modal-backdrop" onClick={handleBackdropClick}>
      <div className="note-modal">
        <div className="note-modal-header">
          <h3 className="note-modal-title">📝 添加笔记</h3>
          <button className="note-modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="note-modal-news">
          <span className="note-modal-label">关联新闻：</span>
          <span className="note-modal-news-title">{news.title}</span>
        </div>
        
        <form onSubmit={handleSubmit}>
          <textarea
            className="note-modal-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="记录这篇新闻的核心要点、个人感悟或重要信息..."
            rows={6}
            autoFocus
          />
          
          <div className="note-modal-actions">
            <button
              type="button"
              className="note-modal-btn note-modal-btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              取消
            </button>
            <button
              type="submit"
              className="note-modal-btn note-modal-btn-save"
              disabled={!content.trim() || isLoading}
            >
              {isLoading ? "保存中..." : "保存笔记"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
