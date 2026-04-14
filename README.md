# AI 资讯聚合网站 (Next.js + TypeScript)

## 项目说明

这是一个用于 AI 资讯聚合展示的前端骨架，首页使用卡片列表展示新闻，支持桌面端和移动端响应式布局。

当前数据已接入 RSS 源聚合，后续可在 `src/services/news` 目录继续扩展为数据库或爬虫任务数据源。

## 目录结构

```text
src/
  app/
    globals.css         # 全局样式与响应式布局
    layout.tsx          # 根布局
    page.tsx            # 首页
  components/
    NewsCard.tsx        # 新闻卡片组件
    NewsGrid.tsx        # 卡片网格组件
  data/
    mockNews.ts         # 模拟新闻数据
  lib/
    date.ts             # 日期格式化工具
  services/
    news/
      rssProvider.ts    # RSS 聚合 provider
      rssSources.ts     # RSS 来源配置
      types.ts          # provider 接口定义
  types/
    news.ts             # 新闻数据类型
```

## 本地启动

1. 安装 Node.js 20+
2. 安装依赖

```bash
npm install
```

3. 启动开发环境

```bash
npm run dev
```

## 已接入与后续建议

- 当前已使用 `rssProvider.ts` 聚合多个资讯源并做去重排序
- 可新增 `crawlerProvider.ts`，实现 `NewsProvider` 接口并接入数据库
- 建议增加服务端缓存与定时任务，避免每次请求都实时抓取
