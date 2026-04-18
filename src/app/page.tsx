import { ClientPage } from "@/components/ClientPage";
import { rssNewsProvider } from "@/services/news/rssProvider";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await rssNewsProvider.getLatestNews();

  return <ClientPage articles={articles} />;
}
