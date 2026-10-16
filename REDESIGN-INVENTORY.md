# Frontend redesign inventory

Reference: https://alamy.vercel.app/

This inventory records the existing portfolio before the reference-inspired redesign. Existing working-tree changes, including the SEO work, must be preserved. The reference supplies visual direction; Soumitra's content, assets, section order and application behavior remain authoritative.

## Application and pages

- Next.js App Router application in `frontend`, using the existing npm workspace.
- `/`: server-rendered public portfolio with client-side CMS refresh and nine configurable sections.
- `/admin`: authentication and the complete CMS dashboard.
- Unknown URLs: the existing accessible not-found page and real HTTP 404 response.
- Route loading state: existing monogram, loading label and progress indicator.
- `/api/content`: same-origin public content endpoint with offline fallback.
- Other `/api/*` URLs: existing rewrite to the separate backend; no API contract changes.
- `/robots.txt`, `/sitemap.xml`, favicon and Apple touch icon: preserve the existing metadata routes and assets.
- Homepage hash routes: existing navigation targets, `#main-content`, `#contact-form` and `#service-areas` remain functional.
- Deployment: preserve the current Netlify/Next.js workspace settings and backend URL handling. This redesign does not deploy or replace the backend.

## Public sections and content

The CMS controls visibility and order. Preserve that control and all existing records.

| Section | Existing content and functionality to preserve |
| --- | --- |
| Home | Profile title, greeting, name, local-service H1, introduction, both configured CTAs, resume action, social links/caption, scroll cue, Three.js scene, CSS fallback, code window, scene label, pause/resume control and visible profile badge. |
| About | CMS heading, kicker, short and long introductions, profile information, highlights, additional information, toolkit tags, project count and project link. |
| Skills | Every skill/category/icon, optional category headings, proficiency meters and empty state. |
| Services | Existing introduction and internal links; all ten editorial service descriptions; local service-area heading, paragraph and eight locations; development approach; every dynamic CMS service with image/icon, copy, expandable details, features, technologies, price and inquiry action. |
| Experience | Every role, employer/link, employment type, dates, location, description and technology; retain the honest empty state when there are no records. |
| Education | Every degree, institution, course, dates, location and description; retain the empty state when there are no records. |
| Projects | Every existing project, screenshot, featured/category labels, title, description, technology and descriptive external demo/source link. |
| Gallery | Every image, category filter, featured label and empty state; modal image/title/description/date/related link, previous/next controls, keyboard navigation, Escape and focus restoration. |
| Contact | CMS heading/CTA/introduction, configured visible email/phone/location, social links, contact and inquiry form modes, or the CMS-controlled closed-form message. |

Also preserve the footer's social links, copyright text and optional configured link; skip link; outage/retry notice; and the original content in all states.

## Components

- Public composition: `PublicPortfolio`, `Header`, `ServiceOverview`, `ContactForm`, `Gallery`, `HeroScene`, `DepthCard`, `SectionAnimations`, `VisitorAnalytics`.
- CMS: `AdminPanel`, `CMSManager`, `SubmissionInbox`, `VisitorStatistics`.
- Existing standalone/legacy components retained: `Experience`, `ExperienceManager`, `ProfileManager`, `ProfilePhoto`, `Projects`, `SkillManager`, `Skills`.
- Styling: `app/globals.css`, `app/portfolio.css`, `components/admin.css`. Scope public changes so they do not accidentally affect dashboard controls.
- Existing Font Awesome icon system remains available. Preserve real profile/project images and CMS media integration.

## Functionality and integrations

- Desktop anchor navigation, active-section indicator, scrolled header state and theme switch.
- Mobile navigation toggle, all configured links, outside-click/Escape close and focus restoration.
- Saved light/dark theme plus CMS theme/accent settings.
- Public content refresh every 30 seconds while visible, focus/visibility refresh and BroadcastChannel updates after CMS edits.
- Retention of the last usable live content during backend outages; fallback content for unavailable first loads; working retry control.
- Contact vs project-inquiry selection; required-field validation and focus; honeypot; actual API submission; timeout/loading/error/success states; failed-submission input retention; disabled submissions during outages.
- Resume download when configured and the existing contact fallback otherwise.
- Visitor analytics through the existing endpoint and setting.
- CMS login/logout/session handling with HttpOnly cookies and admin request header.
- CMS dashboard, navigation, profile, about, contact information, profile photo, services, projects, skills, experience, education, gallery, social links, messages, inquiries, visitors, settings, section ordering and media library.
- CMS creation/editing/deletion, visibility, ordering, reset actions, image uploads, deletion confirmation, inbox pagination/read state, inquiry status, analytics and SMTP configuration status.
- Metadata, canonical URL, social previews, Person/WebSite/WebPage structured data, one meaningful homepage H1, admin noindex and privacy-aware image/contact visibility.

## Asset inventory

Keep original and optimized files; the existing image helper maps original image paths to optimized assets.

- `public/assets/DSC_0068.JPG`
- `public/assets/Digital_Marketing_Agency_Website_ (1).png`
- `public/assets/soumitra69.github.io_Cryptocurrency_Price_Tracker_Website_.png`
- `public/assets/CineFlix-A-stylish-movie-streaming-download-website_.png`
- `public/assets/soumitra-samanta-frontend-developer.webp`
- `public/assets/projects/digital-marketing-agency-website.webp`
- `public/assets/projects/cryptocurrency-price-tracker.webp`
- `public/assets/projects/cineflix-movie-website.webp`
- `public/assets/seo/soumitra-samanta-web-developer.png`
- `public/assets/seo/soumitra-samanta-web-developer.svg`
- `public/favicon.svg` and `public/apple-touch-icon.png`
- CMS images served through backend media URLs; do not replace these with fixed local content or bypass their visibility settings.

## Existing responsive and motion behavior

- Public presentation changes at desktop/tablet/mobile breakpoints including 1100, 768 and 380 pixels; base styles also contain older intermediate breakpoints.
- Responsive hero, content grids, header navigation, contact form and gallery modal.
- Mobile admin sidebar toggle and dashboard/editor grid stacking.
- Reduced-motion support; CMS animation setting; pointer-sensitive card tilt; viewport section reveals.
- Three.js uses lazy loading, capped frame rate/pixel density, low-power checks, responsive eligibility, offscreen/hidden-tab pausing, fallback rendering, context-loss handling and resource cleanup.
- Preserve animation pause controls and ensure no animation is required to access content or finish a task.

## Redesign workflow and verification plan

1. Capture and visually inspect the reference at desktop and mobile sizes, including navigation, hover/focus and scroll states. Record actual font, colors, spacing, shapes and motion before selecting implementation values.
2. Capture the current portfolio in equivalent viewports using the isolated test backend. Record a content/section baseline.
3. Document the concrete reference comparison and redesign plan, then implement section by section using existing components and presentation layers.
4. Preserve handlers, data fetching, routing, validation, authentication and CMS contracts; use CSS transforms/opacity and lightweight observers for motion.
5. Check desktop, laptop, tablet and mobile layouts, including 320px width, text zoom, reduced motion, long content and light/dark themes. Check horizontal overflow and keyboard/touch access.
6. Run existing content/SEO unit checks, production build and browser regression suite against the isolated fixture backend. Exercise public forms, CMS CRUD/visibility/reordering, uploads/gallery, navigation, theme/accent, scene controls, outage/recovery and 404/metadata routes.
7. Inspect console/network failures and capture final screenshots. Compare matching reference/implementation captures together and record visual QA in `design-qa.md`.
8. Rebuild with the configured production backend and provide a local preview plus concise validation results. Do not deploy without a deployment request.

## Current gate

The in-app browser reports no available browser surfaces. The Product Design workflow requires user approval before using Playwright directly; that approval has been requested. Visual reference capture, the final design plan and implementation remain pending. No application source files have been changed for this redesign yet.
