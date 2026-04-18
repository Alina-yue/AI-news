#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为现有新闻补全缺失的图片
Dependencies:
  pip install feedparser
"""

from __future__ import annotations

import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OUTPUT_FILE = Path("ai_news.json")
REQUEST_INTERVAL_SECONDS = 1.0

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def fetch_article_html(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as response:
            content = response.read().decode("utf-8", errors="ignore")
            return content
    except Exception as e:
        print(f"[WARN] 获取文章内容失败: {url} - {e}")
        return None


def extract_images_from_html(html: str, url: str = "") -> list:
    images = []
    
    patterns = [
        r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*(?:article|main|content|post|cover|hero|news-detail|blog-detail)[^"\']*["\']',
        r'<img[^>]+class=["\'][^"\']*(?:article|main|content|post|cover|hero|news-detail|blog-detail)[^"\']*["\'][^>]*src=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif))["\'][^>]*>',
        r'<img[^>]+data-src=["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif))["\'][^>]*>',
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*data-lazy-src',
        r'data-lazy-src=["\']([^"\']+)["\']',
        r'<div\s+class=["\']article-cover["\'][^>]*>\s*<img[^>]+src=["\']([^"\']+)["\']',
        r'<div\s+class=["\']blog-detail-header["\'][^>]*>\s*<img[^>]+src=["\']([^"\']+)["\']',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, html, re.IGNORECASE)
        for match in matches:
            img_url = match.strip()
            if img_url and img_url not in images:
                images.append(img_url)
    
    if "oschina.net" in url.lower():
        oschina_patterns = [
            r'<div\s+class=["\']article-content["\'][^>]*>\s*<p[^>]*>\s*<img[^>]+src=["\']([^"\']+)["\']',
            r'<div\s+class=["\']markdown-body["\'][^>]*>\s*<p[^>]*>\s*<img[^>]+src=["\']([^"\']+)["\']',
            r'<div\s+class=["\']article-detail["\'][^>]*>\s*<img[^>]+src=["\']([^"\']+)["\']',
            r'<div\s+id=["\']articleContent["\'][^>]*>\s*<img[^>]+src=["\']([^"\']+)["\']',
        ]
        for pattern in oschina_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
            for match in matches:
                img_url = match.strip()
                if img_url and img_url not in images:
                    images.append(img_url)
    
    return images


def select_best_image(images: list) -> str | None:
    if not images:
        return None
    
    valid_images = []
    for img_url in images:
        if img_url.startswith("//"):
            img_url = "https:" + img_url
        if img_url.startswith("/"):
            continue
        if not img_url.startswith("http"):
            continue
        if "placeholder" in img_url.lower() or "default" in img_url.lower():
            continue
        if "avatar" in img_url.lower() or "logo" in img_url.lower():
            continue
        valid_images.append(img_url)
    
    if not valid_images:
        return None
    
    for img_url in valid_images:
        if "cover" in img_url.lower() or "banner" in img_url.lower():
            return img_url
    
    for img_url in valid_images:
        if "og:image" in img_url.lower() or "twitter:image" in img_url.lower():
            return img_url
    
    for img_url in valid_images:
        if "article" in img_url.lower() or "post" in img_url.lower():
            return img_url
    
    return valid_images[0]


def load_news(file_path: Path) -> list:
    if not file_path.exists():
        return []
    try:
        with file_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception as e:
        print(f"[ERROR] 读取文件失败: {e}")
        return []


def save_news(file_path: Path, items: list) -> None:
    with file_path.open("w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


def main() -> None:
    print("=== 为现有新闻补全图片 ===")
    
    news_list = load_news(OUTPUT_FILE)
    print(f"现有新闻数量: {len(news_list)}")
    
    missing_count = sum(1 for news in news_list if not news.get("image_url"))
    print(f"缺少图片的新闻数量: {missing_count}")
    
    if missing_count == 0:
        print("所有新闻都已有图片，无需处理")
        return
    
    updated_count = 0
    
    for index, news in enumerate(news_list, start=1):
        if news.get("image_url"):
            continue
        
        link = news.get("link", "").strip()
        if not link:
            print(f"[{index}/{len(news_list)}] 跳过：无链接")
            continue
        
        title = news.get('title', '')[:30]
        try:
            print(f"[{index}/{len(news_list)}] 正在处理: {title}...")
        except UnicodeEncodeError:
            print(f"[{index}/{len(news_list)}] 正在处理: (标题包含特殊字符)...")
        
        html = fetch_article_html(link)
        if html:
            images = extract_images_from_html(html, link)
            image_url = select_best_image(images)
            if image_url:
                news["image_url"] = image_url
                news["image_filled_at"] = datetime.now(timezone.utc).isoformat()
                updated_count += 1
                print(f"  [OK] 提取图片成功")
            else:
                print(f"  [WARN] 未找到合适的图片")
        else:
            print(f"  [WARN] 获取文章内容失败")
        
        if index < len(news_list):
            time.sleep(REQUEST_INTERVAL_SECONDS)
    
    save_news(OUTPUT_FILE, news_list)
    
    print("-" * 60)
    print("=== 处理完成 ===")
    print(f"成功补全图片: {updated_count} 条")
    print(f"输出文件: {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    main()
