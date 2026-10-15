import PublicPortfolio from "../components/PublicPortfolio";
import { getPortfolio } from "../services/portfolio";

export async function generateMetadata() {
  const content = await getPortfolio();
  if (!content)
    return { title: "Portfolio", description: "Developer portfolio" };
  const { settings, profile } = content;
  return {
    title: settings.seoTitle,
    description: settings.seoDescription,
    ...(settings.canonicalUrl
      ? {
          metadataBase: new URL(settings.canonicalUrl),
          alternates: { canonical: settings.canonicalUrl },
        }
      : {}),
    openGraph: {
      title: settings.seoTitle,
      description: settings.seoDescription,
      type: "website",
      ...(settings.canonicalUrl ? { url: settings.canonicalUrl } : {}),
      ...(profile.photoUrl ? { images: [profile.photoUrl] } : {}),
    },
    ...(settings.favicon ? { icons: { icon: settings.favicon } } : {}),
  };
}
export default async function Home() {
  return (
    <PublicPortfolio
      initialContent={await getPortfolio()}
      analyticsEnabled={process.env.ANALYTICS_ENABLED === "true"}
      resumeUrl={
        /^(https?:\/\/|\/(?!\/))/.test(process.env.PORTFOLIO_RESUME_URL || "")
          ? process.env.PORTFOLIO_RESUME_URL
          : ""
      }
    />
  );
}
