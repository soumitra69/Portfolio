export default function Loading() {
  return (
    <main
      className="portfolio-intro"
      aria-busy="true"
      aria-label="Loading portfolio"
    >
      <span className="intro-monogram" aria-hidden="true">
        S<span>.</span>
      </span>
      <p>Loading portfolio</p>
      <span className="intro-line" aria-hidden="true" />
    </main>
  );
}
