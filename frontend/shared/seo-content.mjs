import { imageProps } from "./image-assets.mjs";

// Public editorial copy. CMS sections still control visibility and ordering;
// custom CMS text takes precedence over the legacy starter copy below.
export const SITE_URL = "https://soumitrasamanta69.netlify.app/";
export const SEO_TITLE = "Soumitra Samanta | Web Developer, Haldia & Purba Medinipur";
export const SEO_DESCRIPTION = "Soumitra Samanta, frontend web developer, builds modern, responsive React websites for Purba Medinipur, Haldia, Tamluk and Digha. Explore my projects.";
export const HOME_HEADING = "Web Developer in Purba Medinipur, Haldia & Tamluk";
export const SERVICE_AREAS = ["Haldia", "Tamluk", "Digha", "Contai", "Nandakumar", "Mecheda", "Panskura", "Kolkata"];
export const INTRODUCTION = "Soumitra Samanta is a Frontend/Web Developer from Purba Medinipur, West Bengal, specializing in modern, responsive and user-friendly websites.";
export const ABOUT_DESCRIPTION = "I work with HTML, CSS, JavaScript and React to turn ideas and interface designs into usable websites. My work includes responsive web design, API integration and version control with Git/GitHub. Based in Purba Medinipur (East Midnapore), I serve clients in Haldia, Tamluk and across West Bengal.";

export const SERVICE_GUIDE = [
  { title: "Website Development", icon: "fas fa-code", description: "Clear, accessible websites built around your content, audience and goals, with straightforward navigation and useful calls to action." },
  { title: "Frontend Development", icon: "fas fa-laptop-code", description: "Browser interfaces using HTML, CSS and JavaScript, with reusable components and attention to keyboard use and everyday interactions." },
  { title: "React Development", icon: "fab fa-react", description: "Component-based React interfaces for interactive websites, including state management, forms and connections to existing services." },
  { title: "Responsive Website Development", icon: "fas fa-mobile-screen-button", description: "Layouts, typography and images that adapt to phones, tablets and desktops, tested across different screen sizes." },
  { title: "Business Website Development", icon: "fas fa-store", description: "Service and business websites that explain what you offer and help visitors find the information they need to make an enquiry." },
  { title: "Landing Page Development", icon: "fas fa-bullseye", description: "Focused pages for a product, campaign or service, with a clear message, relevant supporting content and a purposeful next step." },
  { title: "Portfolio Website Development", icon: "fas fa-briefcase", description: "Personal and creative portfolios that present projects, skills and contact details clearly while reflecting your visual identity." },
  { title: "UI Implementation", icon: "fas fa-object-group", description: "Turning supplied interface designs into responsive, accessible components while maintaining consistent spacing, typography and interaction states." },
  { title: "Website Performance Optimization", icon: "fas fa-gauge-high", description: "Reviewing image sizes, loading behavior and unnecessary frontend work to improve load times and reduce avoidable layout shifts." },
  { title: "API Integration", icon: "fas fa-plug", description: "Connecting interfaces to APIs with loading, empty and error states, input validation and a clear separation of public data and private credentials." },
];

function replaceStarter(value, starters, replacement) {
  return !value?.trim() || starters.includes(value.trim()) ? replacement : value;
}

// Never mutate a CMS response or manufacture employment, clients or credentials.
export function preparePublicContent(content) {
  return {
    ...content,
    profile: {
      ...content.profile,
      title: replaceStarter(content.profile.title, ["MERN Stack / Full-Stack Developer"], "Web Developer & Frontend Developer"),
      shortIntroduction: replaceStarter(content.profile.shortIntroduction, ["A passionate Front-end Developer creating amazing digital experiences with modern technologies and clean code."], INTRODUCTION),
    },
    about: {
      ...content.about,
      shortIntroduction: replaceStarter(content.about.shortIntroduction, ["I'm a passionate full-stack developer with over 5 years of experience creating digital solutions that make a difference. I specialize in modern web technologies and love turning complex problems into simple, beautiful designs."], INTRODUCTION),
      longDescription: replaceStarter(content.about.longDescription, ["When I'm not coding, you can find me exploring new technologies, contributing to open-source projects, or sharing knowledge with the developer community."], ABOUT_DESCRIPTION),
    },
    contactInfo: {
      ...content.contactInfo,
      introduction: replaceStarter(content.contactInfo.introduction, ["I'm always interested in new opportunities and interesting projects. Whether you have a question or just want to say hi, feel free to reach out!"], "Have a website in mind? Tell me about your business, audience and goals. I can help with a new responsive website, a React interface or improvements to an existing site."),
    },
    settings: {
      ...content.settings,
      seoTitle: replaceStarter(content.settings.seoTitle, ["Soumitra Samanta | Portfolio"], SEO_TITLE),
      seoDescription: replaceStarter(content.settings.seoDescription, ["Soumitra Samanta's developer portfolio, skills, projects, and contact information."], SEO_DESCRIPTION),
    },
  };
}

function publicUrl(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value, SITE_URL);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function buildHomeMetadata(content) {
  const { settings } = preparePublicContent(content);
  const image = { url: new URL("assets/seo/soumitra-samanta-web-developer.png", SITE_URL).href, width: 1200, height: 630, alt: "Soumitra Samanta — Web Developer & Frontend Developer serving Purba Medinipur, West Bengal" };
  return {
    metadataBase: new URL(SITE_URL),
    title: settings.seoTitle,
    description: settings.seoDescription,
    alternates: { canonical: SITE_URL },
    authors: [{ name: "Soumitra Samanta", url: SITE_URL }],
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    openGraph: { title: settings.seoTitle, description: settings.seoDescription, url: SITE_URL, type: "website", siteName: "Soumitra Samanta", locale: "en_IN", images: [image] },
    twitter: { card: "summary_large_image", title: settings.seoTitle, description: settings.seoDescription, images: [image] },
    icons: { icon: publicUrl(settings.favicon) || "/favicon.svg", apple: "/apple-touch-icon.png" },
  };
}

export function buildStructuredData(content) {
  const { profile, settings } = preparePublicContent(content);
  const sameAs = [...new Set(content.socialLinks
    .filter(link => link.isVisible !== false && link.isActive !== false)
    .map(link => publicUrl(link.url)).filter(Boolean))];
  const image = profile.photoVisible && profile.photoUrl && publicUrl(imageProps(profile.photoUrl, 512, 768).src);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Person", "@id": `${SITE_URL}#person`, name: profile.name, jobTitle: profile.title, url: SITE_URL,
        ...(sameAs.length ? { sameAs } : {}), ...(image ? { image } : {}) },
      { "@type": "WebSite", "@id": `${SITE_URL}#website`, url: SITE_URL, name: "Soumitra Samanta", inLanguage: "en-IN", publisher: { "@id": `${SITE_URL}#person` } },
      { "@type": "WebPage", "@id": `${SITE_URL}#webpage`, url: SITE_URL, name: settings.seoTitle, description: settings.seoDescription,
        inLanguage: "en-IN", isPartOf: { "@id": `${SITE_URL}#website` }, about: { "@id": `${SITE_URL}#person` }, mainEntity: { "@id": `${SITE_URL}#person` } },
    ],
  };
}

export function serializeStructuredData(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
