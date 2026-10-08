import "@fortawesome/fontawesome-free/css/all.min.css";
import "./globals.css";

export const metadata = {
  title: "Soumitra Samanta | Portfolio",
  description: "Soumitra Samanta's developer portfolio, skills, projects, and contact information.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
