# Spectrum Connect — Full-Stack Creator Marketplace

Spectrum Connect is a full-stack platform that connects **creators/crew** and **producers/clients** for film/media collaboration.  
This repository contains a production-oriented monorepo with:

- a **Next.js + TypeScript frontend** (`spectrum-nextjs`),
- a **FastAPI + MongoDB backend** (`project-master-spectrum`), and
- supporting packages/docs (`spectrum-ui`, `composio-agent`, `context`).

---

## What this project includes

### Core product areas
- Authentication (email/password, OTP flows, Google OAuth)
- Role-based experiences for **creator**, **client**, and **admin**
- Project/job posting and proposal/application workflows
- Messaging, profile management, and portfolio/public profile pages
- Billing/commission/escrow-related backend modules
- ETF (Earn Trust Framework) points and trust-level mechanics
- Community/blog/contact/API utilities

> The backend exposes many route groups via FastAPI routers (auth, profiles, jobs, messaging, billing, admin, escrow, reports, onboarding, etc.) and the frontend maps them into App Router pages.

---

## Repository structure

```text
.
├── project-master-spectrum/      # Python backend (FastAPI, Beanie, MongoDB)
│   ├── app/
│   ├── tests/
│   ├── requirements.txt
│   ├── .env.example
│   ├── Procfile
│   └── render.yaml
├── spectrum-nextjs/              # TypeScript frontend (Next.js App Router)
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── package.json
│   └── next.config.mjs
├── spectrum-ui/                  # Reusable UI package build output/library
├── composio-agent/               # Optional Python 3.11 composio agent integration
├── context/                      # Architecture/API/workflow reference notes
├── SECURITY.md
└── ETF_FRAMEWORK.md
```

---

## Architecture at a glance

| Layer | Stack | Notes |
|---|---|---|
| Frontend | Next.js (App Router), React, TypeScript, Tailwind | Main web app in `spectrum-nextjs/` |
| Backend | FastAPI, Beanie ODM, Motor | Main API in `project-master-spectrum/app/` |
| Database | MongoDB | Configured via `MONGO_URI`, `MONGODB_DB` |
| Auth/session | JWT + httpOnly cookies | Frontend login state helper + backend cookie/session behavior |
| Deploy targets | Vercel (frontend), Python web runtime (Render/Procfile), AWS EB URL referenced | See `spectrum-nextjs/vercel.json`, `project-master-spectrum/render.yaml`, and backend URL rewrites |

### How TypeScript and Python parts interact

1. Frontend API wrapper (`spectrum-nextjs/lib/api.ts`) uses:
   - `NEXT_PUBLIC_API_URL`, or
   - fallback path `/backend`
2. `spectrum-nextjs/next.config.mjs` rewrites `/backend/:path*` to the deployed backend URL.
3. Server-side data fetch modules (`spectrum-nextjs/lib/blog.ts`, `spectrum-nextjs/lib/portfolio.ts`) can call backend directly via `BACKEND_ORIGIN`.
4. Backend (`project-master-spectrum/app/main.py`) enables CORS using `FRONTEND_URL` and optional `ALLOWED_ORIGINS`.

---

## Prerequisites

- **Node.js + npm** (for `spectrum-nextjs` and `spectrum-ui`)
- **Python 3.11 recommended** (backend deploy config and optional composio agent)
- **MongoDB** instance/connection string for backend

---

## Local setup

### 1) Backend (`project-master-spectrum`)

```bash
cd /home/runner/work/spectrum-connect-full-stack-project-/spectrum-connect-full-stack-project-/project-master-spectrum
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
```

Run API:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 2) Frontend (`spectrum-nextjs`)

```bash
cd /home/runner/work/spectrum-connect-full-stack-project-/spectrum-connect-full-stack-project-/spectrum-nextjs
npm install
npm run dev
```

App default: `http://localhost:3000`

---

## Environment variables

### Frontend env

There is no committed frontend `.env.example` file currently; these are used in source code:

| Variable | Used in | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `spectrum-nextjs/lib/api.ts` | Browser/client API base URL (defaults to `/backend`) |
| `BACKEND_ORIGIN` | `spectrum-nextjs/lib/blog.ts`, `spectrum-nextjs/lib/portfolio.ts` | Server-side fetch origin for SSR/ISR content |

Example (`spectrum-nextjs/.env.local`):

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
BACKEND_ORIGIN=http://localhost:8000
```

### Backend env

Use `project-master-spectrum/.env.example` as the source of truth. Key variables include:

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection URI |
| `MONGODB_DB` | Yes | Database name |
| `SECRET_KEY` | Yes (production) | JWT/signing secret |
| `ADMIN_REGISTRATION_KEY` | Yes (production) | Admin bootstrap/protection key |
| `FRONTEND_URL` | Yes | Frontend origin for redirects/CORS |
| `ALLOWED_ORIGINS` | Optional | Additional CORS allowlist |
| OAuth/email/payment/ETF vars | Optional/feature-specific | Enable integrations and business rules |

> Never commit real secrets. Keep real values only in local/deployment secret stores.

---

## Development commands

### Frontend (`spectrum-nextjs/package.json`)

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### UI package (`spectrum-ui/package.json`)

```bash
npm run build
```

### Backend

No dedicated script runner is defined; run FastAPI directly:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## Testing

Backend has targeted pytest modules in `project-master-spectrum/tests/`:

```bash
cd /home/runner/work/spectrum-connect-full-stack-project-/spectrum-connect-full-stack-project-/project-master-spectrum
python -m pytest tests/test_commission.py -v
python -m pytest tests/test_etf_points.py -v
```

> Frontend automated test setup is not currently defined in `spectrum-nextjs/package.json`.

---

## Linting and formatting

- Frontend linting:

```bash
cd /home/runner/work/spectrum-connect-full-stack-project-/spectrum-connect-full-stack-project-/spectrum-nextjs
npm run lint
```

- Backend formatting/lint commands are not explicitly configured in repository scripts (inferred from current manifests).

---

## Production/build & deployment notes

- **Frontend**: Vercel-oriented config in `spectrum-nextjs/vercel.json` (`next build`, output `.next`).
- **Backend**:
  - `Procfile`: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
  - `render.yaml`: Python web service with `pip install -r requirements.txt` and uvicorn start command.
- `spectrum-nextjs/next.config.mjs` includes rewrite mapping for `/backend/*` to deployed backend origin.

---

## API/backend notes

- Backend entrypoint: `project-master-spectrum/app/main.py`
- Health endpoint: `GET /health`
- Root endpoint: `GET /`
- API docs availability is environment-aware (`/docs` and `/redoc` disabled in production mode).
- Existing backend docs:
  - `project-master-spectrum/readme.md` (endpoint listing)
  - `project-master-spectrum/ADMIN_BACKEND_README.md` (admin API reference)

---

## Contributing

1. Create a branch.
2. Keep changes focused and minimal.
3. Update docs when behavior/setup changes.
4. Run relevant lint/tests before opening PRs.
5. Do not commit secrets or local `.env` files.

---

## Troubleshooting

- **Frontend cannot reach API**:
  - Verify backend is running and `NEXT_PUBLIC_API_URL` / rewrite path is correct.
- **CORS errors**:
  - Ensure backend `FRONTEND_URL` and `ALLOWED_ORIGINS` include your local origin.
- **Mongo startup failures**:
  - Re-check `MONGO_URI`, network access, and database name.
- **OAuth redirect mismatch**:
  - Confirm `GOOGLE_REDIRECT_URI` and frontend URL values are consistent with Google app settings.

---

## Security

- Security policy file: [`SECURITY.md`](./SECURITY.md)
- Use private channels for vulnerability disclosure and avoid public secret exposure.

---

## License

No repository license file is currently present in the root. Add a `LICENSE` file if you want explicit usage terms.

---

## Sinhala Quick Start (සිංහල ඉක්මන් මාර්ගෝපදේශය)

- Backend run කරන්න: `project-master-spectrum` folder එකට ගිහින් `pip install -r requirements.txt` සහ `uvicorn app.main:app --host 0.0.0.0 --port 8000` run කරන්න.
- Frontend run කරන්න: `spectrum-nextjs` folder එකට ගිහින් `npm install` සහ `npm run dev` run කරන්න.
- API connection issue තිබ්බොත් `NEXT_PUBLIC_API_URL`, `BACKEND_ORIGIN`, `FRONTEND_URL` values check කරන්න.

