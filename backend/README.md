# Portfolio backend

The backend is a self-contained Node.js ESM project. `src/`, `shared/`, and
`package.json` live in this directory; no module imports require the frontend.

`src/store.js` imports project seed data using:

```js
import seedProjects from "../shared/projects.json" with { type: "json" };
```

The JSON import attribute is supported by Node.js 24. The six committed seed
files and utilities are `shared/projects.json`, `shared/profile.json`,
`shared/skills.json`, `shared/employment-types.json`, `shared/skill-icons.json`,
and `shared/format-month.js`. These are static defaults copied from the existing
portfolio. Without MongoDB configured, runtime messages and edited content use the ignored
`data/portfolio.json`; existing saved data takes precedence over the defaults.

## Run

Use Node.js 24 and Yarn Classic 1.22.22. From this directory:

```sh
yarn install
yarn test
yarn start
```

The start command is `node --env-file-if-exists=.env server.js`.
There is no compilation step. Configuration comes from the hosting environment
or an ignored local `.env`. Copy `.env.example` and fill in the server settings.
The server honors `PORT` and defaults to 5000 for local development.

## Render

Backend URL: https://portfolio-backend-vs7k.onrender.com
Service ID: `srv-db3rslm0tbcc738mn210`.
Manage its environment at
[Render service settings](https://dashboard.render.com/web/srv-db3rslm0tbcc738mn210/env).
Local `.env` files are ignored by Git and are not uploaded to Render. For
MongoDB login, provision the database admin account as described below and set
`MONGODB_URI` in the service's Environment page, then save and redeploy.
Set a random `JWT_SECRET` (at least 32 characters), `CORS_ORIGINS` to the exact
Netlify frontend origin, and `TRUST_PROXY=1` on Render. Production refuses to
start without MongoDB, JWT, and allowed-origin configuration. The owner account
already stored in Atlas is used; runtime environment admin passwords cannot
override it. Local JSON development can use `ADMIN_PASSWORD_HASH`.

For the full `Portfolio` repository, set Root Directory to `backend`.
For a repository containing only this backend, leave Root Directory empty.

| Setting | Value |
| --- | --- |
| Build Command | `yarn install --frozen-lockfile` |
| Start Command | `yarn start` |
| Node version | `24` |
| Health Check Path | `/api/health` |

If necessary, set `NODE_VERSION=24` in Render's Environment settings to override
a previous version setting. Use `NODE_ENV=production` for secure admin cookies.
Keep `.env`, credentials, saved messages, and uploaded photos out of Git.
Use persistent storage for the backend's data directory when retaining admin
changes, messages, and photos across redeployments.

## MongoDB persistence

Set MONGODB_URI privately in the backend environment and MONGODB_DB=portfolio.
The URI must percent-encode special characters in the username/password.
Never put it in frontend variables or commit a populated environment file.

When MONGODB_URI is configured, Mongoose preserves projects, skills, experience,
and profile metadata in the existing `portfolio` collection. Separate models
store contact messages in `contactmessages`, inquiries in `projectinquiries`,
the owner's hashed credentials in `admins`, and daily visitor aggregates in
`visitorstats`. No duplicate users collection is created.
The first connection imports the existing local JSON data (or seed defaults if
there is no local file). Existing MongoDB data is never overwritten on startup.
Old contact messages are imported once, preserving identifiers and read status.
Deleted migrated messages do not return after a restart. Existing password hashes
are retained. Serialized content writes and revision checks prevent concurrent
edits from losing data; submissions use individual indexed documents.
When no URI is configured, the existing JSON store remains available for local use.
If a configured database cannot connect, startup fails clearly rather than saving
changes to another storage location.

Profile image binaries still use data/uploads; keep that directory persistent.
MongoDB stores the photo URL, not the uploaded image file.

For Render with MongoDB, set MONGODB_URI and MONGODB_DB in
Environment settings. The ignored local .env is not sent to Render. In Atlas,
ensure the database user can read/write this database and Network Access permits
the backend host to connect. Restart the backend after configuration changes.

Run `yarn check:db` from the backend directory to verify Atlas authentication
without changing database data or printing the connection string.

## Database admin account

Set `MONGODB_URI`, `MONGODB_DB`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` privately
and run this command once from the backend directory:

```sh
yarn setup:admin:db
```

This creates the portfolio owner's account in the MongoDB `admins` collection
using a salted scrypt password hash. It does not write plaintext passwords to local data
files and never replaces an existing account. The setup command must connect to
the same database that Render uses.

Once created, MongoDB login works without `ADMIN_USERNAME` or `ADMIN_PASSWORD`
in the running server's environment. Keep `MONGODB_URI` and `MONGODB_DB` on
Render, deploy the updated backend code, and sign in using the existing admin UI.
An unavailable database or missing account cannot fall back to local credentials.
Without MongoDB configured, JSON-mode login remains available for local
development using an environment password hash. From the repository root,
`npm run setup:admin` preserves the current database account and privately
generates a JWT key and local password hash. Your existing requested
`admin@gmail.com` / `Admin` login is preserved. New accounts require privately
supplied provisioning credentials; there is no hardcoded default password.
No public registration or password-reset endpoint is exposed.

## REST API and authentication

- `POST /api/contact`: name, email, subject, message, optional honeypot `website`.
- `POST /api/inquiries`: name, email, optional company, projectType, message.
  The existing UI had no budget field, so no budget input was added.
- `POST /api/analytics/visit`: optional, restricted to the public home page.
- `POST /api/admin/login`, `GET /api/admin/session`, `POST /api/admin/logout`.
- Protected `GET /api/admin/messages` and `/inquiries`, with `page` and `limit`
  (maximum 100), detail `GET /:id`, `PATCH /:id`, and `DELETE /:id`.
- Protected `/api/admin/overview`, `/analytics`, `/notifications/status` and
  `POST /api/admin/messages/:id/notification` (also supported for inquiries).
- Existing protected projects, skills, experience, and profile-photo APIs remain.

JWTs use HS256 with fixed issuer/audience, an eight-hour expiration, and an
HttpOnly, SameSite=Strict cookie. Production cookies are Secure. Signing keys
belong only on the backend. Logging out revokes all owner sessions using a
database version counter, including on other instances and after restarts.
Admin mutations require `X-Admin-Request: 1`; CORS rejects unknown origins.
Helmet supplies response security headers. Login and public submissions are
rate-limited; contacts and inquiries share one limit. Body sizes and fields
are bounded, and only whitelisted fields reach the database. Errors never
return credentials or driver details.

The default rate-limit store is per-process and appropriate for one backend
instance. For multiple instances, configure a shared rate-limit store at the
hosting edge or in Express. Set `TRUST_PROXY` only for your actual trusted proxy
topology so arbitrary client headers cannot bypass limits.

## Owner email notifications

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_FROM`, and
`NOTIFICATION_EMAIL=soumitrasamanta69@gmail.com` privately on the backend.
Authenticated providers also need `SMTP_USER` and `SMTP_PASSWORD` (for Gmail,
use an app password). Use a verified sender address belonging to the provider;
visitors' email addresses are Reply-To, never the sender. Port 587 uses STARTTLS;
port 465 uses `SMTP_SECURE=true`.

`npm run check:email --workspace backend` verifies SMTP without sending mail.
Notifications use plain text. Submission success depends on database storage,
so an SMTP outage does not lose a message. Delivery status appears in the admin
Details view; failed/disabled notifications can be retried after configuration.
No mail is sent when SMTP is not configured. Delivery has bounded timeouts;
a retry after an ambiguous provider timeout can send a duplicate notification.

## Visitor statistics

Set `ANALYTICS_ENABLED=true` on both backend and frontend hosts. Local `npm run dev`
passes the backend flag to the frontend. The public page counts at most one visit
per page/browser session/day and respects DNT and Global Privacy Control. IDs
are random, session-scoped, hashed on the backend, and rotated daily. No IP,
precise location, raw user agent, query strings, or full referrer URLs are saved.

Daily aggregates contain page, device category, browser family, referrer domain,
and last-visit time. A TTL index expires them after 90 days. Unique visitor-days
are approximate and are not lifetime distinct people. Admin visits are excluded.
Tracking is disabled by default and never blocks the public page if unavailable.

## Structure and verification

`config/` owns environment validation, Mongoose connection/storage; `models/`
owns schemas; `controllers/` and `routes/` own submission APIs; `middleware/`
owns security/auth/errors; `utils/` owns validation, mail, and analytics. `src/`
retains existing content-management modules for compatibility. `server.js` is
the deployable entry point.

Run `npm test` from the repository root for API, hashing, JWT, validation,
email-failure, and analytics checks. `npm run test:e2e` starts isolated JSON-backed
servers and tests the actual frontend proxy/forms/admin/mobile navigation; it
does not write test submissions to your live portfolio database.

For Atlas integration, from `backend/` in PowerShell:

```powershell
$env:RUN_MONGO_INTEGRATION = '1'
node --env-file-if-exists=.env --test test/mongoose.integration.test.js
```

This creates and removes only a uniquely named `portfolio_validation_*`
database. The Atlas user must have access to create this isolated test database.
The live `portfolio` database is preserved.
