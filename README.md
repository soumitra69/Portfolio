# Soumitra Samanta's Portfolio

The original portfolio converted to a Next.js App Router frontend and separate Node.js/Express backend, with an admin panel at `/admin`.

## Run locally

Use Node.js 22.9 or newer and npm. From the `Portfolio` folder:

```bash
npm install
npm run setup:admin
npm run dev
```

- Portfolio: http://localhost:3000
- Admin panel: http://localhost:3000/admin
- Backend health: http://localhost:5000/api/health

`npm run dev` starts both the frontend and backend, whether you run it from `Portfolio/` or `Portfolio/frontend/`. If a healthy backend is already running, it reuses it. The admin login needs both servers. Use `npm run dev:web --workspace frontend` only when running the backend separately.

`setup:admin` sets the login to username `admin@gmail.com` and password `admin` in `backend/.env`. The credentials persist across restarts. Running setup again restores the same login while preserving other environment settings, including Supabase credentials. Restart the backend after changing credentials. Admin sessions last eight hours; restarting the backend signs out existing sessions.

## Features

- Original portfolio sections, images, project links, responsive layout, and animations.
- Dark/light theme with a saved preference and accessible mobile navigation.
- Contact form with validation, submission feedback, and persistent message storage.
- Protected admin dashboard with message counts, read/unread controls, email reply links, and deletion.
- Add, edit, or delete projects. The public portfolio loads updated projects on each visit.
- Manage skills through the admin panel's Skills tab. Add a name and select an icon; add, edit, and delete changes appear in the portfolio's About section on each visit.
- Manage Experience with company, job title, employment type, joining month, end month or Present, and an optional description. Entries appear in the public Experience section, newest first.
- Change your profile photo in the Profile tab. Preview and upload JPEG, PNG, or WebP images up to 10 MB, or restore the original photo.

Contact messages are stored locally; they are not automatically emailed. Reply links open your email application. Profile photo uploads are validated, rotated, cropped, and saved as JPEG images in `backend/data/uploads/`, then served through `/api/media/`. Back up this folder alongside the JSON data file. Add new project images to `frontend/public/assets/` and enter their `/assets/filename.png` path in the admin form; project image uploads are not included.

## Structure

```text
Portfolio/
  frontend/
    app/                 # Next.js pages, metadata, and portfolio CSS
      admin/page.js      # Admin page
    components/          # Navigation, contact form, projects, admin panel
    public/assets/       # Original portfolio images
    next.config.mjs      # Proxy /api requests to the backend
    shared/              # Portfolio seed data and utilities used by both apps
  backend/
    src/                 # Express API, authentication, JSON storage
    scripts/             # Local admin credential setup
    test/                # API integration tests
    data/portfolio.json  # Created when data is saved; excluded from Git
    data/uploads/        # Uploaded profile photos; excluded from Git
  scripts/dev.mjs        # Starts both development servers
  package.json           # npm workspaces and shared commands
  package-lock.json      # Shared dependency lockfile
  netlify.toml           # Netlify frontend build configuration
```

## Configuration

Copy `frontend/.env.local.example` to `frontend/.env.local` if changing `BACKEND_URL` (default `http://127.0.0.1:5000`). Next.js uses this for its server proxy; restart/rebuild after changing it. If the backend port changes, update this URL too.

The backend reads `backend/.env`:

```dotenv
PORT=5000
ADMIN_USERNAME=admin@gmail.com
ADMIN_PASSWORD=admin
# Optional: DATA_FILE=/absolute/path/to/portfolio.json
```

Data persists in `backend/data/portfolio.json`. Writes are serialized and saved atomically within a single process. Use persistent storage for hosting and back up this file. Use a database for multiple backend instances. Admin endpoints require an HttpOnly session cookie and custom request header, supplied by the dashboard. Login and contact submissions have rate limits.

Supabase Storage credentials belong in the ignored `backend/.env` file:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-only-secret-key
SUPABASE_STORAGE_BUCKET=your-bucket-name
```

Keep the secret key on the backend; do not place it in `frontend/` or a `NEXT_PUBLIC_*` variable. The project URL and bucket name are required before connecting Supabase Storage. Profile photo uploads currently use local storage, and portfolio content uses the JSON data file.

## Build and checks

```bash
npm test
npm run build
npm start
```

`npm start` runs both servers after building the frontend. For HTTPS hosting, set `NODE_ENV=production` in the backend environment to enable secure cookies. Keep backend access behind the Next.js proxy and use HTTPS for the public site. Credentials and saved messages are excluded from Git.

API routes include `GET /api/health`, `GET /api/projects`, `GET /api/skills`, `GET /api/experience`, `GET /api/profile`, `POST /api/contact`, and protected `/api/admin/*` routes for login, sessions, messages, projects, skills, experience, and profile photo uploads. The frontend falls back to initial projects, skills, and the original photo if the API is unavailable; contact submission and admin management require the backend.

Customize static hero/about/skills/contact content in `frontend/app/page.js`, styling in `frontend/app/globals.css`, and initial projects in `frontend/shared/projects.json`. Once projects have been saved to the data file, use the admin panel to change them.

## GitHub and Netlify production builds

Use `Portfolio/` as the single Git repository root. The frontend, backend, shared data, root package files, and development scripts all belong to this repository. Do not initialize separate Git repositories inside `frontend/` or `backend/`. The former nested repositories' Git metadata was preserved locally under `.git/repository-backups/`; it is not published.

The frontend owns `frontend/shared/`, so its production imports stay inside the app. The backend reads the same files through `../../frontend/shared/`. All six required shared files are included: `employment-types.json`, `format-month.js`, `profile.json`, `projects.json`, `skills.json`, and `skill-icons.json`.

Install and build from either the repository root or the frontend:

```bash
# From Portfolio/
npm install
npm run build

# Or from Portfolio/frontend/
npm install
npm run build
```

Keep the root `package-lock.json` in Git. npm workspaces install Next.js, React, and React DOM declared in `frontend/package.json`; `next.config.mjs` explicitly sets the workspace resolution and file tracing root. A standalone copy of `frontend/` uses its own build root when the workspace lockfile is absent.

For Netlify, connect the GitHub repository containing the entire `Portfolio/` project and set:

| Setting | Value |
| --- | --- |
| Base directory | Repository root (`.`); configured in `netlify.toml` |
| Package directory | `frontend` (set this in the Netlify UI) |
| Build command | `npm run build --workspace frontend` |
| Publish directory | `frontend/.next` |
| Node version | `22` |

The configuration enables Netlify's Next.js adapter. Keep the Next.js server build; do not change this app to a static export, because its API proxy and admin features require server support.

Netlify hosts the frontend. Deploy the existing Express backend separately with persistent storage, and set `BACKEND_URL` in Netlify's environment settings to that backend's HTTPS origin before building. The local default (`http://127.0.0.1:5000`) is for local development. Set backend credentials and other secrets on the backend host; do not put them in the frontend or Git. This repository change does not deploy the backend or migrate its data.

`.env`, `.env.local`, other local environment files, `node_modules/`, `.next/`, `.netlify/`, and backend data/uploads are ignored. Only `.env*.example` templates belong in Git; never put actual secrets in them.

Run the publishing commands from `Portfolio/`:

```bash
git add .
git commit -m "Fix production build"
git push
```
