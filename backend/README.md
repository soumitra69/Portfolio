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

The start command remains `node --env-file-if-exists=.env src/server.js`.
There is no compilation step. Configuration comes from the hosting environment
or an ignored local `.env`. Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` privately.
The server honors `PORT` and defaults to 5000 for local development.

## Render

Backend URL: https://portfolio-backend-vs7k.onrender.com
Service ID: `srv-db3rslm0tbcc738mn210`.
Manage its environment at
[Render service settings](https://dashboard.render.com/web/srv-db3rslm0tbcc738mn210/env).
Local `.env` files are ignored by Git and are not uploaded to Render. For
MongoDB login, provision the database admin account as described below and set
`MONGODB_URI` in the service's Environment page, then save and redeploy.
For JSON-mode login, set `ADMIN_USERNAME` and `ADMIN_PASSWORD` there instead.

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

When MONGODB_URI is configured, projects, skills, experience, profile metadata,
and contact messages persist in the MongoDB database's portfolio collection.
The first connection imports the existing local JSON data (or seed defaults if
there is no local file). Existing MongoDB data is never overwritten on startup.
Serialized writes and revision checks prevent concurrent updates from losing data.
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
using a salted scrypt password hash. It does not write credentials to local data
files and never replaces an existing account. The setup command must connect to
the same database that Render uses.

Once created, MongoDB login works without `ADMIN_USERNAME` or `ADMIN_PASSWORD`
in the running server's environment. Keep `MONGODB_URI` and `MONGODB_DB` on
Render, deploy the updated backend code, and sign in using the existing admin UI.
An unavailable database or missing account cannot fall back to local credentials.
Without MongoDB configured, the existing JSON-mode login remains available.
