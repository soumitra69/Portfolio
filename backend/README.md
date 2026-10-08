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
portfolio. Runtime messages and edited portfolio content still use the ignored
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
