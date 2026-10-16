import Link from "next/link";

export default function NotFound() {
  return (
    <main className="portfolio-loading not-found-page">
      <p className="content-kicker">404 — PAGE NOT FOUND</p>
      <h1>This page could not be found.</h1>
      <p>Explore Soumitra Samanta&apos;s projects and web development services, or get in touch about your website.</p>
      <Link className="btn btn-primary" href="/">Return to the portfolio</Link>
      <Link href="/#contact">Contact Soumitra Samanta</Link>
    </main>
  );
}
