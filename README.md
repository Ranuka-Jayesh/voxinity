# Voxinity

Monorepo for **Voxinity**: a React (Vite + TypeScript) client and a **FastAPI** backend for video dubbing, translation, and related tooling.

---

## GitHub “About” (copy-paste)

Set these on the repo home page: **⚙ Settings** (or the **⚙** next to “About”) → **Description** and **Topics**.

**Description (350 chars max):**

> Voxinity — video dubbing & translation: Vite + React + shadcn UI frontend, FastAPI + Uvicorn API, Whisper / XTTS-style pipeline worker. Monorepo with `npm run dev` + `npm run backend:api`.

**Topics (add each separately or paste comma-separated where GitHub allows):**

`fastapi`, `uvicorn`, `vite`, `react`, `typescript`, `tailwindcss`, `shadcn-ui`, `python`, `video`, `dubbing`, `translation`, `whisper`, `monorepo`

---

## Stack

| Layer | Tech |
|--------|------|
| Frontend | Vite 5, React 18, TypeScript, Tailwind, Radix/shadcn |
| Backend | FastAPI, `backend.main_api` (API + external pipeline flag), disk-queue worker (`npm run backend:pip`) |
| ML / media | PyTorch, Coqui TTS, Whisper, FFmpeg (heavy; first cloud build is slow) |

---

## Local development

**Requirements:** Node 18+, Python 3.11+, FFmpeg on `PATH` (see backend logs if missing).

```bash
npm install
pip install -r backend/requirements.txt
```

Terminal A — frontend (port 8080):

```bash
npm run dev
```

Terminal B — API (port 8000):

```bash
npm run backend:api
```

Terminal C — ML pipeline worker (required for dub jobs when using `main_api`):

```bash
npm run backend:pip
```

The app calls `VITE_API_BASE_URL` if set; otherwise it uses `http://<hostname>:8000`.

---

## Deploy (frontend + backend)

### 1) Backend (Docker — API + worker in one container)

The repo includes **`Dockerfile.api`** and **`docker-entrypoint.sh`**: Uvicorn and `python -m backend.pipeline_worker` run together so the disk job queue works on a single machine.

**[Render](https://render.com):** New **Web Service** → connect GitHub → **Docker** → root `Dockerfile.api`. After deploy, set:

| Env var | Example |
|---------|--------|
| `CORS_ORIGINS` | `https://your-app.vercel.app` (no trailing slash; comma-separate for multiple) |

Health check path: `/health`.

Optional: **Blueprint** → paste `render.yaml`, then set `CORS_ORIGINS` in the dashboard (`sync: false`).

**Note:** Image build installs PyTorch and TTS stacks — expect a long first build and a large image. Free tiers may be too small or slow for real dubbing; upgrade if jobs time out.

### 2) Frontend (Vercel)

**[Vercel](https://vercel.com):** New Project → import this repo → framework **Vite**, build `npm run build`, output **`dist`**. `vercel.json` adds SPA rewrites for React Router.

**Project → Settings → Environment Variables:**

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | Your public API URL, e.g. `https://voxinity-api.onrender.com` (no trailing slash) |

Redeploy after changing env vars.

### 3) Wire CORS

After you know the Vercel URL, set **`CORS_ORIGINS`** on the backend to that exact origin (e.g. `https://voxinity.vercel.app`). Localhost defaults stay enabled in code for development.

---

## Scripts (from `package.json`)

| Script | Purpose |
|--------|--------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production frontend build |
| `npm run backend:api` | FastAPI (`backend.main_api`) |
| `npm run backend:pip` | Pipeline worker |

---

## License

Add a `LICENSE` file when you choose a license (e.g. MIT).
