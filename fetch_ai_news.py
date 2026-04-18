#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Dependencies:
  pip install feedparser beautifulsoup4
"""

from __future__ import annotations

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import re
import time
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin

import feedparser
from bs4 import BeautifulSoup


RSS_SOURCES: Dict[str, List[str]] = {
    "量子位": ["https://www.qbitai.com/feed"],
    "InfoQ AI": ["https://www.infoq.cn/feed?tag=AI"],
    "OSCHINA AI": ["https://www.oschina.net/news/rss/ai"],
}

TARGET_COUNTS: Dict[str, int] = {
    "量子位": 3,
    "InfoQ AI": 3,
    "OSCHINA AI": 2,
}
TOTAL_TARGET = 5

OUTPUT_FILE = Path("ai_news.json")
META_FILE = Path("ai_news_meta.json")
REQUEST_INTERVAL_SECONDS = 0.1
MAX_FETCH_PER_SOURCE = 30
DAYS_TO_FETCH = 7
DAYS_TO_FALLBACK = 180
MAX_WORKERS = 15
ARTICLE_TIMEOUT = 4

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Referer": "https://www.google.com/",
}


def parse_date_string(date_str: str) -> datetime | None:
    if not date_str:
        return None
    
    date_str = date_str.strip()
    
    formats = [
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%a, %d %b %Y %H:%M:%S %z",
        "%d %b %Y %H:%M:%S %Z",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d",
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    
    try:
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'
            return datetime.fromisoformat(date_str)
    except ValueError:
        pass
    
    match = re.match(
        r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?',
        date_str
    )
    if match:
        groups = match.groups()
        try:
            year = int(groups[0])
            month = int(groups[1])
            day = int(groups[2])
            hour = int(groups[3]) if groups[3] else 0
            minute = int(groups[4]) if groups[4] else 0
            second = int(groups[5]) if groups[5] else 0
            return datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
        except ValueError:
            pass
    
    return None


def load_existing_news(file_path: Path) -> List[dict]:
    if not file_path.exists():
        return []
    try:
        with file_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            return []
    except Exception as e:
        print(f"[ERROR] 读取现有新闻失败: {e}")
        return []


def build_unique_keys(items: List[dict]) -> set:
    keys = set()
    for item in items:
        link = (item.get("link") or "").strip()
        title = (item.get("title") or "").strip()
        source = (item.get("source") or "").strip()
        if link:
            keys.add(("link", link))
        else:
            keys.add(("fallback", f"{source}|{title}"))
    return keys


def parse_published_date(published_str: str, source_name: str) -> str:
    if not published_str:
        return datetime.now(timezone.utc).isoformat()
    
    parsed_date = parse_date_string(published_str)
    if parsed_date:
        return parsed_date.isoformat()
    
    print(f"[WARN] 解析日期失败 ({source_name}): {published_str[:50]}...")
    return datetime.now(timezone.utc).isoformat()


def is_recent_date(published_iso: str, days: int) -> bool:
    try:
        published_date = datetime.fromisoformat(published_iso.replace("Z", "+00:00"))
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        return published_date >= cutoff_date
    except Exception as e:
        print(f"[WARN] 日期比较失败: {e}")
        return True


def fetch_url(url: str, timeout: int = 10) -> str | None:
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as response:
            content = response.read().decode("utf-8", errors="replace")
            return content
    except Exception as e:
        print(f"[WARN] 获取URL失败 {url[:50]}: {e}")
        return None


def extract_images_with_soup(html: str, base_url: str) -> List[str]:
    images = []
    try:
        soup = BeautifulSoup(html, "html.parser")
        
        for meta in soup.find_all("meta", property="og:image"):
            img_url = meta.get("content", "").strip()
            if img_url:
                images.append(urljoin(base_url, img_url))
        
        for meta in soup.find_all("meta", attrs={"name": "twitter:image"}):
            img_url = meta.get("content", "").strip()
            if img_url:
                images.append(urljoin(base_url, img_url))
        
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                json_data = json.loads(script.string or "")
                if isinstance(json_data, list):
                    for item in json_data:
                        if isinstance(item, dict) and item.get("@type") == "Article":
                            img_url = item.get("image", "")
                            if isinstance(img_url, str):
                                images.append(urljoin(base_url, img_url))
                            elif isinstance(img_url, list) and img_url:
                                images.append(urljoin(base_url, img_url[0]))
                elif isinstance(json_data, dict):
                    img_url = json_data.get("image", "")
                    if isinstance(img_url, str):
                        images.append(urljoin(base_url, img_url))
            except:
                pass
        
        for img in soup.find_all("img"):
            src = img.get("src", "").strip() or img.get("data-src", "").strip() or img.get("data-lazy-src", "").strip()
            if src:
                img_url = urljoin(base_url, src)
                if img_url not in images:
                    images.append(img_url)
    
    except Exception as e:
        print(f"[WARN] BeautifulSoup解析失败: {e}")
        pass
    
    return images


def extract_images_with_regex(html: str, base_url: str) -> List[str]:
    images = []
    
    patterns = [
        r'<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']',
        r'<meta\s+name=["\']twitter:image["\']\s+content=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+)["\'][^>]*class=["\'][^"\']*(?:article|main|content|post|cover|hero|detail)[^"\']*["\']',
        r'<img[^>]+class=["\'][^"\']*(?:article|main|content|post|cover|hero|detail)[^"\']*["\'][^>]*src=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif))["\'][^>]*>',
        r'<img[^>]+data-src=["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif))["\'][^>]*>',
        r'data-lazy-src=["\']([^"\']+)["\']',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, html, re.IGNORECASE)
        for match in matches:
            img_url = match.strip()
            if img_url and img_url not in images:
                images.append(urljoin(base_url, img_url))
    
    return images


def select_best_image(images: List[str]) -> str | None:
    if not images:
        return None
    
    valid_images = []
    for img_url in images:
        if img_url.startswith("//"):
            img_url = "https:" + img_url
        
        if not img_url.lower().startswith(("http://", "https://")):
            continue
        
        if any(keyword in img_url.lower() for keyword in ["placeholder", "default", "avatar", "logo", "icon", "sprite", "qrcode", "qr-code", "qr_code", "head.jpg"]):
            continue
        
        if "themes/liangziwei/imagesnew" in img_url.lower():
            continue
        
        if re.search(r'/\d+x\d+(\.jpg|\.png|\.webp)', img_url.lower()):
            match = re.search(r'/(\d+)x(\d+)(\.[a-z]+)$', img_url.lower())
            if match:
                width = int(match.group(1))
                height = int(match.group(2))
                if width < 300 or height < 200:
                    continue
        
        if "://" not in img_url[8:]:
            valid_images.append(img_url)
    
    if not valid_images:
        return None
    
    priority_keywords = ["cover", "banner", "og:image", "twitter:image", "article", "post", "feature", "content", "detail", "large", "full"]
    
    for keyword in priority_keywords:
        for img_url in valid_images:
            if keyword in img_url.lower():
                return img_url
    
    qbitai_candidates = [img for img in valid_images if "qbitai.com/wp-content/uploads" in img.lower()]
    qbitai_candidates = [img for img in qbitai_candidates if "/2019/06/200-100x100" not in img.lower()]
    qbitai_candidates = [img for img in qbitai_candidates if "/2019/06" not in img.lower()]
    if qbitai_candidates:
        return qbitai_candidates[0]
    
    for img_url in valid_images:
        if any(ext in img_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            if "wp-content/uploads" in img_url.lower() and "qrcode" not in img_url.lower():
                return img_url
    
    for img_url in valid_images:
        if any(ext in img_url.lower() for ext in [".jpg", ".jpeg", ".png", ".webp"]):
            return img_url
    
    return valid_images[0]


def fetch_article_image(link: str) -> str | None:
    html = fetch_url(link, timeout=ARTICLE_TIMEOUT)
    if not html:
        return None
    
    images = []
    images.extend(extract_images_with_soup(html, link))
    images.extend(extract_images_with_regex(html, link))
    
    for pattern in [
        r'(https?://[^"\']+/wp-content/uploads/\d{4}/\d{2}/[^"\']+\.(?:jpg|jpeg|png|webp))',
        r'(https?://static001\.infoq\.cn/resource/image/[^"\']+\.(?:jpg|jpeg|png|webp))',
        r'(https?://oscimg\.oschina\.net/oscnet/[^"\']+\.(?:jpg|jpeg|png|webp))',
    ]:
        matches = re.findall(pattern, html, re.IGNORECASE)
        for match in matches:
            if match and match not in images:
                images.append(match)
    
    return select_best_image(images)


def normalize_entry(entry, source_name: str) -> dict:
    title = getattr(entry, "title", "").strip()
    link = getattr(entry, "link", "").strip()
    published = getattr(entry, "published", "").strip() or getattr(
        entry, "updated", ""
    ).strip()
    
    summary = getattr(entry, "summary", "").strip() or getattr(
        entry, "description", ""
    ).strip()
    
    parsed_published = parse_published_date(published, source_name)
    
    image_url = None
    if link:
        try:
            image_url = fetch_article_image(link)
            if image_url:
                print(f"  [IMG] {image_url[:60]}...")
        except Exception as e:
            print(f"  [WARN] 图片抓取失败 {link[:50]}: {e}")
    
    result = {
        "title": title,
        "link": link,
        "published": published,
        "published_iso": parsed_published,
        "summary": summary,
        "source": source_name,
        "fetched_at": datetime.now(timezone.utc).isoformat(),
    }
    
    if image_url:
        result["image_url"] = image_url
    
    return result


def fetch_source(source_name: str, rss_urls: List[str], days_limit: int) -> List[dict]:
    all_entries: List[dict] = []
    
    for rss_url in rss_urls:
        try:
            print(f"[INFO] 正在抓取 {source_name}: {rss_url}")
            feed_content = fetch_url(rss_url, timeout=15)
            if not feed_content:
                print(f"[WARN] 无法获取 RSS 内容 ({source_name})")
                continue
            
            feed = feedparser.parse(feed_content)
            if getattr(feed, "bozo", False):
                bozo_exc = getattr(feed, "bozo_exception", None)
                print(f"[WARN] RSS解析异常 ({source_name}): {bozo_exc}")
                continue

            entries = getattr(feed, "entries", [])
            print(f"[INFO] {source_name} 发现 {len(entries)} 条原始条目")
            
            recent_entries = []
            
            with ThreadPoolExecutor(max_workers=4) as executor:
                futures = {executor.submit(normalize_entry, entry, source_name): entry for entry in entries[:MAX_FETCH_PER_SOURCE]}
                for future in as_completed(futures):
                    try:
                        result = future.result()
                        if is_recent_date(result["published_iso"], days_limit):
                            recent_entries.append(result)
                    except Exception as exc:
                        print(f"[WARN] 处理条目失败: {exc}")
            
            print(f"[INFO] {source_name} 筛选出 {len(recent_entries)} 条近期新闻")
            all_entries.extend(recent_entries)
                
        except Exception as exc:
            print(f"[ERROR] 抓取异常 ({source_name}): {exc}")

    return all_entries


def save_news(file_path: Path, items: List[dict]) -> None:
    try:
        with file_path.open("w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[ERROR] 保存新闻失败: {e}")


def save_meta(file_path: Path) -> str:
    refreshed_at = datetime.now(timezone.utc).isoformat()
    payload = {"last_refreshed_at": refreshed_at}
    try:
        with file_path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[ERROR] 保存元数据失败: {e}")
    return refreshed_at


def main() -> None:
    print("=== AI资讯自动抓取开始 ===")
    print(f"目标信源: {list(RSS_SOURCES.keys())}")
    print(f"目标数量: 共{TOTAL_TARGET}条 (量子位{TARGET_COUNTS['量子位']}条, InfoQ AI {TARGET_COUNTS['InfoQ AI']}条, OSCHINA AI {TARGET_COUNTS['OSCHINA AI']}条)")
    print("-" * 60)

    existing_news = load_existing_news(OUTPUT_FILE)
    unique_keys = build_unique_keys(existing_news)
    all_news = list(existing_news)
    
    print(f"[INFO] 现有新闻数量: {len(existing_news)}")
    print(f"[INFO] 现有唯一链接数: {len(unique_keys)}")

    all_candidates: List[dict] = []
    new_entries: List[dict] = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {}
        for source_name, rss_urls in RSS_SOURCES.items():
            future = executor.submit(fetch_source, source_name, rss_urls, DAYS_TO_FALLBACK)
            futures[future] = source_name
        
        for future in as_completed(futures):
            source_name = futures[future]
            try:
                entries = future.result()
                print(f"[OK] {source_name} 抓取到 {len(entries)} 条候选新闻")
                
                for entry in entries:
                    link = (entry.get("link") or "").strip()
                    if link:
                        key = ("link", link)
                    else:
                        title = (entry.get("title") or "").strip()
                        key = ("fallback", f"{source_name}|{title}")
                    
                    if key not in unique_keys:
                        all_candidates.append(entry)
                        unique_keys.add(key)
                    else:
                        print(f"[DEBUG] 跳过重复: {link[:50]}")
            except Exception as exc:
                print(f"[ERROR] {source_name} 抓取失败: {exc}")

    print(f"[INFO] 找到 {len(all_candidates)} 条新候选新闻")
    
    all_candidates.sort(key=lambda x: x.get("published_iso", ""), reverse=True)
    
    source_counts: Dict[str, int] = {k: 0 for k in RSS_SOURCES.keys()}
    recent_entries = [e for e in all_candidates if is_recent_date(e["published_iso"], DAYS_TO_FETCH)]
    old_entries = [e for e in all_candidates if not is_recent_date(e["published_iso"], DAYS_TO_FETCH)]
    
    print(f"[INFO] 近期候选: {len(recent_entries)} 条, 历史候选: {len(old_entries)} 条")
    
    for entry in recent_entries:
        if len(new_entries) >= TOTAL_TARGET:
            break
        source = entry.get("source", "")
        target = TARGET_COUNTS.get(source, 3)
        
        if source_counts[source] < target:
            new_entries.append(entry)
            source_counts[source] += 1
            print(f"[DEBUG] 添加近期新闻: {entry.get('title', '')[:30]}...")
    
    if len(new_entries) < TOTAL_TARGET:
        print(f"[INFO] 需要从历史补充 {TOTAL_TARGET - len(new_entries)} 条新闻")
        for entry in old_entries:
            if len(new_entries) >= TOTAL_TARGET:
                break
            source = entry.get("source", "")
            if source_counts[source] < TARGET_COUNTS.get(source, 3) * 2:
                if entry not in new_entries:
                    new_entries.append(entry)
                    source_counts[source] += 1
                    print(f"[DEBUG] 添加历史新闻: {entry.get('title', '')[:30]}...")
    
    if len(new_entries) < TOTAL_TARGET:
        print(f"[INFO] 继续补充剩余 {TOTAL_TARGET - len(new_entries)} 条新闻")
        for entry in all_candidates:
            if len(new_entries) >= TOTAL_TARGET:
                break
            if entry not in new_entries:
                new_entries.append(entry)
                print(f"[DEBUG] 强制补充新闻: {entry.get('title', '')[:30]}...")

    all_news.sort(key=lambda x: x.get("fetched_at", ""), reverse=True)
    all_news = new_entries + [news for news in all_news if news not in new_entries]

    save_news(OUTPUT_FILE, all_news)
    refreshed_at = save_meta(META_FILE)

    print("-" * 60)
    print("=== 抓取完成 ===")
    print(f"本次新增: {len(new_entries)} 条")
    print(f"  - 量子位: {source_counts.get('量子位', 0)} 条")
    print(f"  - InfoQ AI: {source_counts.get('InfoQ AI', 0)} 条")
    print(f"  - OSCHINA AI: {source_counts.get('OSCHINA AI', 0)} 条")
    print(f"当前总量: {len(all_news)} 条")
    print(f"输出文件: {OUTPUT_FILE.resolve()}")
    print(f"刷新时间: {refreshed_at}")
    
    print(f"##RESULT## new_count={len(new_entries)} total_count={len(all_news)}")


if __name__ == "__main__":
    main()
