import PublicPortfolio from "../components/PublicPortfolio";
import { getPortfolio } from "../services/portfolio";
import { buildHomeMetadata, buildStructuredData, serializeStructuredData } from "../shared/seo-content.mjs";

export async function generateMetadata() {
  return buildHomeMetadata(await getPortfolio());
}
export default async function Home() {
  const content = await getPortfolio();
  return (
    <>
      <script id="portfolio-structured-data" type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeStructuredData(buildStructuredData(content)) }} />
      <PublicPortfolio
        initialContent={content}
        analyticsEnabled={process.env.ANALYTICS_ENABLED === "true"}
        resumeUrl={
          /^(https?:\/\/|\/(?!\/))/.test(process.env.PORTFOLIO_RESUME_URL || "")
            ? process.env.PORTFOLIO_RESUME_URL
            : ""
        }
      />
    </>
  );
}
