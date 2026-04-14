import { NewsItem } from "@/types/news";

export const mockNews: NewsItem[] = [
  {
    id: "news-1",
    title: "OpenAI发布面向企业的多模态助手升级",
    summary:
      "新版助手支持更长上下文和实时工具调用，企业可将内部知识库接入，提升客服与运营自动化效率。",
    imageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-04-12T09:00:00.000Z",
    readMoreUrl: "https://openai.com/news"
  },
  {
    id: "news-2",
    title: "Google推出面向开发者的新一代Agent API",
    summary:
      "Google在开发者大会上发布Agent API，允许应用更方便地编排搜索、代码执行和多轮推理能力。",
    imageUrl:
      "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-04-11T14:30:00.000Z",
    readMoreUrl: "https://blog.google/technology/ai/"
  },
  {
    id: "news-3",
    title: "Anthropic announces safer coding workflows for teams",
    summary:
      "Anthropic introduced policy-aware coding agents that can enforce internal engineering standards and reduce risky code generation.",
    imageUrl:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-04-10T08:15:00.000Z",
    readMoreUrl: "https://www.anthropic.com/news"
  },
  {
    id: "news-4",
    title: "NVIDIA发布新一代推理优化工具链",
    summary:
      "NVIDIA推出针对大模型推理的端到端优化套件，在多卡场景下显著降低延迟并提升吞吐表现。",
    imageUrl:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-04-09T12:45:00.000Z",
    readMoreUrl: "https://blogs.nvidia.com/blog/category/ai/"
  }
];
