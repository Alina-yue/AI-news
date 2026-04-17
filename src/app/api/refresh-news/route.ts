import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PYTHON_CANDIDATES = [
  process.env.PYTHON_PATH,
  "C:/Users/X1 YOGA/AppData/Local/Programs/Python/Python312/python.exe",
  "python",
  "py"
].filter((item): item is string => Boolean(item));

function canRunPython(candidate: string): boolean {
  try {
    const result = spawnSync(candidate, ["--version"], {
      windowsHide: true,
      encoding: "utf-8"
    });
    return result.status === 0;
  } catch {
    return false;
  }
}

function resolvePythonExecutable(): string | null {
  for (const candidate of PYTHON_CANDIDATES) {
    if (candidate.includes(":/") || candidate.includes(":\\")) {
      if (existsSync(candidate) && canRunPython(candidate)) {
        return candidate;
      }
      continue;
    }
    if (canRunPython(candidate)) {
      return candidate;
    }
  }
  return null;
}

function runFetchScript(pythonExec: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(process.cwd(), "fetch_ai_news.py");
    const child = spawn(pythonExec, [scriptPath], {
      cwd: process.cwd(),
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("执行抓取脚本超时（120秒）"));
    }, 120_000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `脚本执行失败，退出码: ${code}`));
      }
    });
  });
}

function parseResultOutput(output: string): { newCount: number; totalCount: number } {
  const match = output.match(/##RESULT##\s*new_count=(\d+)\s*total_count=(\d+)/);
  if (match) {
    return {
      newCount: parseInt(match[1], 10) || 0,
      totalCount: parseInt(match[2], 10) || 0
    };
  }
  return { newCount: 0, totalCount: 0 };
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").trim();
}

function generateId(url: string, source: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) {
    h = (h << 5) - h + url.charCodeAt(i);
    h = h & h;
  }
  const urlHash = Math.abs(h).toString(16);
  
  h = 0;
  for (let i = 0; i < source.length; i++) {
    h = (h << 5) - h + source.charCodeAt(i);
    h = h & h;
  }
  const sourceHash = Math.abs(h).toString(16);
  
  return `news-${urlHash}-${sourceHash}`;
}

function readNewsJson(): any[] {
  const newsPath = join(process.cwd(), "ai_news.json");
  const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80";
  
  if (existsSync(newsPath)) {
    try {
      const content = readFileSync(newsPath, "utf-8");
      const data = JSON.parse(content);
      
      if (Array.isArray(data)) {
        return data.map((item: any) => {
          const title = stripHtml(item.title ?? "");
          const readMoreUrl = (item.link ?? "").trim();
          
          if (!title || !readMoreUrl) {
            return null;
          }
          
          return {
            id: generateId(readMoreUrl, item.source || ""),
            title,
            summary: stripHtml(item.summary ?? "") || "暂无摘要，点击查看原文。",
            imageUrl: (item.image_url as string | undefined) || FALLBACK_IMAGE,
            publishedAt: item.published_iso ?? item.published ?? new Date().toISOString(),
            originalPublished: item.published,
            readMoreUrl,
            source: item.source ?? "RSS"
          };
        }).filter((item: any) => item !== null);
      }
      return [];
    } catch {
      return [];
    }
  }
  return [];
}

function readMetaJson(): { last_refreshed_at?: string } {
  const metaPath = join(process.cwd(), "ai_news_meta.json");
  if (existsSync(metaPath)) {
    try {
      const content = readFileSync(metaPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
  return {};
}

export async function POST() {
  const pythonExec = resolvePythonExecutable();
  if (!pythonExec) {
    return NextResponse.json(
      { ok: false, message: "未找到可用的 Python 解释器，请设置 PYTHON_PATH。" },
      { status: 500 }
    );
  }

  try {
    const result = await runFetchScript(pythonExec);
    const output = result.stdout || result.stderr;
    const { newCount, totalCount } = parseResultOutput(output);
    revalidatePath("/");

    const articles = readNewsJson();
    const meta = readMetaJson();

    return NextResponse.json({
      ok: true,
      message: `刷新成功：新增 ${newCount} 条（总量 ${totalCount}）`,
      newCount,
      totalCount,
      articles,
      lastRefreshedAt: meta.last_refreshed_at || new Date().toISOString(),
      output: output.slice(-2000)
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: "资讯刷新失败",
        error: error instanceof Error ? error.message : "未知错误"
      },
      { status: 500 }
    );
  }
}
