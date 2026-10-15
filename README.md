# Soumitra Samanta's Portfolio

The existing React/Next.js portfolio and Admin CMS frontend. This repository contains the frontend and its API integration only.

- Frontend repository: https://github.com/soumitra69/Portfolio
- Backend repository: https://github.com/soumitra69/Portfolio-backend

The backend is maintained and deployed independently. Do not copy its implementation, environment file, database data or dependencies into this repository.

## Preserved features

Original branding, blue/amber colors, images, About content, project links and original section order are preserved. The portfolio includes selective CSS 3D profile/card effects, responsive layouts, reduced-motion support, dark/light theme and accessible mobile navigation.

All portfolio content is managed through /admin: profile, navigation, About, independently visible contact details, social links, services, projects, skills, experience, education, gallery, section order, theme, animations, SEO and footer. Collections support add/edit/delete/hide/show/activate/reorder. Gallery supports validated admin uploads, filters and a keyboard-accessible lightbox. Empty career/education/gallery sections never invent records.

The existing Contact section supports messages and project inquiries with validation/loading/success/error states. The admin dashboard includes totals, recent items, quick actions, inbox details, read/unread, inquiry statuses, email delivery state and optional aggregate visitor statistics. Email is disabled until the owner configures SMTP in the backend.

## Run locally

Use Node.js 22.9 or newer. Clone the two repositories beside each other:

    Projects/
      Portfolio/          # This frontend repository
      Portfolio-backend/  # Separate backend repository and private runtime files

First, in Portfolio-backend:

    yarn install --frozen-lockfile
    # Copy .env.example to .env and configure your existing MongoDB connection and JWT key.
    yarn start

Then, in Portfolio:

    npm ci
    npm run dev

The frontend starts at http://localhost:3000 and the admin panel is http://localhost:3000/admin. The separate backend defaults to http://127.0.0.1:5000. Frontend development does not start or modify the backend repository. Sign in using your existing database account; the integration preserves it.

For another API origin, copy frontend/.env.local.example to frontend/.env.local and set:

    BACKEND_URL=http://127.0.0.1:5000
    ANALYTICS_ENABLED=false

BACKEND_URL is a server-side HTTP(S) origin, without /api, a query, fragment or credentials. The Next.js /api proxy and server-rendered content use the same validated origin. Browser requests stay same-origin, and HttpOnly admin cookies pass through the proxy. Restart/rebuild after changing the API origin. Development defaults to localhost:5000; production defaults to https://portfolio-backend-vs7k.onrender.com.

Never put MongoDB credentials, JWT keys, SMTP passwords or storage secrets in this repository or NEXT_PUBLIC variables. They belong in the separate backend's ignored .env or hosting environment.

## API contract

Public content uses GET /api/content, with visible/active records and ordered sections. Individual reads include /api/profile, /navigation, /about, /contact, /services, /projects, /skills, /experience, /education, /gallery and /settings. Contacts submit to POST /api/messages; project inquiries submit to POST /api/inquiries.

Authentication uses POST /api/admin/login, GET /api/admin/session and POST /api/admin/logout. CMS, inbox, analytics and upload routes under /api/admin require the server-issued HttpOnly JWT cookie. Admin mutations include X-Admin-Request: 1. All sensitive configuration stays on the backend. See the backend repository's README for the full endpoint and deployment contract.

The public page refreshes on focus, every 30 seconds while visible, and through same-browser admin broadcasts. Initial API failures show a retry view; later refresh failures preserve the last successful content. Metadata is server-rendered from current CMS settings.

## Checks

    npm run check:api
    npm run build
    npm run test:e2e

check:api verifies health, the CMS contract and rejection of anonymous admin access. It reads BACKEND_URL from frontend/.env.local or the process environment. A missing /api/content means the backend must be updated; changing the frontend URL cannot add missing server routes.

Browser tests launch an isolated API fixture from the sibling Portfolio-backend checkout, not an embedded backend folder, and never write to your live MongoDB portfolio. Install that repository's dependencies first. For another checkout location, set BACKEND_REPO_PATH to its absolute path before testing. Backend unit/API/MongoDB tests live in the backend repository.

For production-mode browser tests in PowerShell:

    $env:BACKEND_URL='http://127.0.0.1:5055'
    $env:ANALYTICS_ENABLED='true'
    npm run build
    $env:E2E_PRODUCTION='true'
    npm run test:e2e

Rebuild with the deployment API origin afterward. Test fixtures use test-only credentials, not your owner login. API and browser checks cover CMS CRUD/visibility/reorder, contact and inquiry flows, protected login, image uploads, gallery controls, reduced motion and mobile layouts.

## Deployment

Deploy the separate backend first, then deploy this frontend. Keep the backend's existing MongoDB data and admin account. Backend production requires NODE_ENV=production, MONGODB_URI, MONGODB_DB, JWT_SECRET (32+ characters), CORS_ORIGINS and the correct trusted proxy setting. CORS_ORIGINS must include the exact frontend origin. Use persistent disk or configured Supabase Storage for uploaded images. SMTP remains optional.

Netlify configuration is in netlify.toml:

| Setting | Value |
| --- | --- |
| Repository | soumitra69/Portfolio |
| Base directory | Repository root |
| Package directory | frontend |
| Build command | npm run build --workspace frontend |
| Publish directory | frontend/.next |
| Node version | 22 |
| BACKEND_URL | https://portfolio-backend-vs7k.onrender.com |

The Next.js server adapter is required for server rendering and the /api proxy. Do not convert the app to static export. Run check:api against the hosted backend before deploying the matching frontend. Render configuration and private credentials belong to Portfolio-backend, not Netlify.

## Structure

    frontend/app/          # Public and /admin pages, metadata, CSS
    frontend/components/   # Existing UI and reusable CMS editors
    frontend/services/     # Server-only API origin/content integration
    frontend/shared/       # Presentation utilities and CMS field descriptors
    frontend/public/       # Original portfolio assets
    scripts/               # Frontend development and read-only API check
    tests/e2e/             # Browser integration tests
    package-lock.json      # Frontend workspace dependencies only
    netlify.toml           # Frontend deployment

Environment files, node_modules, build outputs, test artifacts and logs are ignored. No backend folder belongs in this repository. Backend history and runtime data are maintained in the separate repository. Normal portfolio content edits require no frontend source changes.

## Backend outage behavior

The public page and its read-only /api/content handler use the same server-side
loader. If the backend is unavailable or returns incompatible content, the page
still renders the existing design and original projects from
frontend/shared/offline-content.json. This static presentation copy includes no
database records, contact details, social links or profile photo. It preserves
the section order, branding, project links and responsive layout. An outage
notice explains the limitation; submissions are disabled and admin APIs stay
protected. No failed submission is reported as saved. The frontend retries live
content on focus, refresh and every 30 seconds, preserving already loaded live
content during a later outage. Once the API recovers, live CMS content and forms
resume automatically. The static copy is not a database backup and changes to
live CMS content still require the backend and Atlas to be available.
