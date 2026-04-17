import { ClientPage } from "@/components/ClientPage";
import { getLastRefreshTime, rssNewsProvider } from "@/services/news/rssProvider";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await rssNewsProvider.getLatestNews();
  const lastRefreshTime = (await getLastRefreshTime()) ?? "当前页实时生成";

  return <ClientPage articles={articles} lastRefreshTime={lastRefreshTime} />;
}
