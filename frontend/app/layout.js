import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Soumitra Samanta | Portfolio",
  description: "Soumitra Samanta's developer portfolio, skills, projects, and contact information.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="portfolio-theme" strategy="beforeInteractive">{`try { document.documentElement.dataset.theme = localStorage.getItem('portfolio-theme') === 'dark' ? 'dark' : 'light'; } catch {}`}</Script>
        {children}
      </body>
    </html>
  );
}
