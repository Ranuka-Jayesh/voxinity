<div align="center">

<h1>🎙️ Voxinity</h1>

<p>
  <b>Video dubbing & translation</b> — monorepo with a modern web client and a FastAPI + ML pipeline.<br/>
  <sub>Upload · transcribe · translate · dub · export · optional sign-language flow</sub>
</p>

<p>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></a>
</p>
<p>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" /></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" /></a>
  <a href="https://www.docker.com/"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="https://render.com/"><img src="https://img.shields.io/badge/Render-000000?style=for-the-badge&logo=render&logoColor=white" alt="Render" /></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></a>
</p>

<p>
  <a href="https://github.com/Ranuka-Jayesh/voxinity/stargazers"><img src="https://img.shields.io/github/stars/Ranuka-Jayesh/voxinity?style=flat&logo=github&color=gold&label=stars" alt="GitHub stars" /></a>
  <a href="https://github.com/Ranuka-Jayesh/voxinity/network/members"><img src="https://img.shields.io/github/forks/Ranuka-Jayesh/voxinity?style=flat&logo=github&label=forks" alt="GitHub forks" /></a>
  <img src="https://img.shields.io/badge/PRs-welcome-22c55e?style=flat&logo=github&labelColor=1f2937" alt="PRs welcome" />
</p>

<p>
  <a href="https://github.com/Ranuka-Jayesh/voxinity"><b>Repository</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Ranuka-Jayesh/voxinity/issues"><b>Issues</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/Ranuka-Jayesh/voxinity.git"><b>Clone</b></a>
</p>

<br/>

</div>

---

## Table of contents

| | |
|:--|:--|
| [Highlights](#highlights) | Stack at a glance |
| [Architecture](#architecture) | Mermaid diagram |
| [Quick start](#quick-start) | Install & 3-terminal run |
| [Environment](#environment) | `VITE_API_BASE_URL` & `CORS_ORIGINS` |
| [Deploy](#deploy) | Docker + Vercel |
| [Scripts](#scripts-reference) | `npm` commands |
| [GitHub About](#github-about-copy-paste) | Repo card copy-paste |
| [License](#license) | Add `LICENSE` when ready |

---

## Highlights

| | **Frontend** | **Backend & ML** |
|:--:|:--|:--|
| **Stack** | React 18 · Vite 5 · TypeScript · Tailwind · shadcn/ui · React Router | FastAPI · Uvicorn · disk job queue · FFmpeg |
| **Icons** | ![React](https://img.shields.io/badge/-React-20232A?style=flat-square&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/-Vite-646CFF?style=flat-square&logo=vite&logoColor=white) ![TS](https://img.shields.io/badge/-TS-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Tailwind](https://img.shields.io/badge/-Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white) | ![FastAPI](https://img.shields.io/badge/-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white) ![Python](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white) ![Docker](https://img.shields.io/badge/-Docker-2496ED?style=flat-square&logo=docker&logoColor=white) |
| **Note** | Client uses `VITE_API_BASE_URL` or falls back to **`:8000`** on the same host. | Run **`npm run backend:pip`** beside the API so queued dub jobs execute. |

---

## Architecture

```mermaid
flowchart LR
  subgraph Client["🖥️ Browser"]
    UI["React + Vite"]
  end
  subgraph Server["⚙️ App tier"]
    API["FastAPI :8000"]
    W["Pipeline worker"]
    Q[("Disk job queue")]
    FS[("uploads / outputs")]
  end
  UI -->|"REST · VITE_API_BASE_URL"| API
  API --> Q
  W --> Q
  API --> FS
  W --> FS
```

<p align="center"><sub>Rendered on GitHub. In production Docker, API + worker share one filesystem.</sub></p>

---

## Quick start

<details open>
<summary><b>📋 1 · Prerequisites</b></summary>

| | |
|:--|:--|
| ![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white) | **Node.js** 18+ |
| ![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white) | **Python** 3.11+ |
| ![FFmpeg](https://img.shields.io/badge/FFmpeg-on_PATH-007808?style=flat-square&logo=ffmpeg&logoColor=white) | **FFmpeg** on `PATH` (backend warns if missing) |

<br/>

</details>

<details>
<summary><b>📦 2 · Install</b></summary>

```bash
npm install
pip install -r backend/requirements.txt
```

</details>

<details>
<summary><b>🚀 3 · Run (three terminals)</b></summary>

| # | Role | Command | Port |
|:--:|--|--|:--:|
| **A** | 🎨 Frontend | `npm run dev` | **8080** |
| **B** | ⚡ API | `npm run backend:api` | **8000** |
| **C** | 🤖 ML worker | `npm run backend:pip` | — |

> **C** is required for dubbing when the API uses external pipeline mode (`backend.main_api`).

</details>

---

## Environment

| Variable | Set on | Purpose |
|:--|:--|:--|
| `VITE_API_BASE_URL` | Vite / **Vercel** | Public API base URL (no trailing slash). |
| `CORS_ORIGINS` | **Render** / Docker | Extra allowed browser origins, comma-separated. Localhost stays allowed in code. |

---

## Deploy

<details>
<summary><b>🐳 Backend — Docker (e.g. Render)</b></summary>

| File | Role |
|:--|:--|
| `Dockerfile.api` | Python + FFmpeg + `backend/` |
| `docker-entrypoint.sh` | **Uvicorn** + **`python -m backend.pipeline_worker`** (shared disk queue) |

1. **Render** → Web Service → **Docker** → `Dockerfile.api`
2. Set **`CORS_ORIGINS`** → e.g. `https://your-app.vercel.app`
3. Health check path: **`/health`**
4. Optional: import **`render.yaml`** as a blueprint, then set `CORS_ORIGINS` in the dashboard.

> ⏳ First build installs **PyTorch + TTS** — expect a **long** build and a **large** image. Upgrade RAM/CPU if jobs time out.

</details>

<details>
<summary><b>▲ Frontend — Vercel</b></summary>

1. New project → import this repo → **Vite** → `npm run build` → output **`dist`**
2. **`vercel.json`** handles SPA rewrites for React Router
3. Add **`VITE_API_BASE_URL`** → redeploy

</details>

<details>
<summary><b>🔗 Wire CORS</b></summary>

Set **`CORS_ORIGINS`** on the API to your **exact** Vercel origin (scheme + host, no path). Multiple sites: comma-separated list.

</details>

---

## Scripts reference

| Script | |
|:--|:--|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run backend:api` | FastAPI (`backend.main_api`) |
| `npm run backend:pip` | Dub / ML pipeline worker |

---

## GitHub About (copy-paste)

<details>
<summary><b>📌 Expand</b> — description & topics for the repo “About” card</summary>

**Description (≤350 chars):**

> Voxinity — video dubbing & translation: Vite + React + shadcn UI frontend, FastAPI + Uvicorn API, Whisper / XTTS-style pipeline worker. Monorepo with `npm run dev` + `npm run backend:api`.

**Topics:**  
`fastapi` `uvicorn` `vite` `react` `typescript` `tailwindcss` `shadcn-ui` `python` `video` `dubbing` `translation` `whisper` `monorepo`

</details>

---

## License

Add a **`LICENSE`** file when you choose terms (e.g. MIT).

---

<div align="center">

<br/>

**Maintainer** · [Ranuka Jayesh](https://github.com/Ranuka-Jayesh) · [voxinity](https://github.com/Ranuka-Jayesh/voxinity)

<sub>README tuned for GitHub — badges via <a href="https://shields.io">Shields.io</a> · diagram via Mermaid</sub>

</div>
