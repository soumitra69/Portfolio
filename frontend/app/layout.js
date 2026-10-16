import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import "./portfolio.css";
import Script from "next/script";
import { SITE_URL, SEO_TITLE, SEO_DESCRIPTION } from "../shared/seo-content.mjs";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SEO_TITLE,
  description: SEO_DESCRIPTION,
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
  verification: {
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } } : {}),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        <Script id="portfolio-theme" strategy="beforeInteractive">{`try { document.documentElement.dataset.theme = localStorage.getItem('portfolio-theme') === 'light' ? 'light' : 'dark'; } catch {}`}</Script>
        {children}
      </body>
    </html>
  );
}
