# Clipper Desktop

AI Video Clipper Desktop App — Electron + React + TypeScript.

## Requirements

- Node.js 18+
- npm 9+
- Python FastAPI backend running (see `video-clipper-engine`)

## Install

```bash
npm install
```

## Run in Browser (Vite dev server only)

```bash
npm run dev
# Open http://localhost:5173
```

## Run as Desktop App (Electron)

```bash
npm run electron:dev
```

This starts both the Vite dev server and Electron in parallel.
The Electron window will open automatically once Vite is ready.

## Build for Production

```bash
npm run electron:build
# Output in dist-electron/
```

## First-time Setup

1. Start the FastAPI backend: `python -m uvicorn clipper.main:app --reload --app-dir src`
2. Launch Clipper Desktop
3. Go to **Settings** and verify the Backend URL (`http://localhost:8000`)
4. Enter your **Gemini API Key**
5. Upload a video from **Videos** and follow the pipeline

## Pipeline

```
Upload → Transcribe → Detect Hooks → Extract Clips → Export
```

Each step is accessible from the Video detail page or individual feature pages.

## Architecture

```
src/
├── features/          # Feature modules (dashboard, videos, clips, …)
├── shared/
│   ├── components/
│   │   ├── ui/         # shadcn/ui primitives (Radix UI + CVA + Tailwind)
│   │   └── layout/      # Sidebar, Header, app shell pieces
│   ├── hooks/          # useToast, useBackendStatus
│   └── utils/           # Formatters and class-merge helper (cn)
├── services/           # API abstraction layer (Axios)
├── store/              # Zustand stores (settings, projects, UI)
├── routes/              # React Router config
├── layouts/              # App shell layout
└── types/                # Global TypeScript types
```

## UI System

Built on **shadcn/ui conventions**: Radix UI primitives + class-variance-authority +
Tailwind, with design tokens as CSS custom properties in `src/index.css`
(`--background`, `--primary`, `--border`, etc.) consumed by `tailwind.config.js`.

Components included: Button, Badge (+ StatusBadge/ScoreBadge), Card, Input, Select,
Dialog, AlertDialog, DropdownMenu, Toast/Toaster, Tooltip, Separator, Progress,
Skeleton (+ SkeletonCard/Row/Table/Stats), EmptyState, ErrorBoundary, DataTable, Pagination.

Toasts are triggered via `toast.success(...)`, `toast.error(...)`, `toast.warning(...)`
from `@/shared/hooks/useToast`.

## State Management

| Concern | Tool |
|---|---|
| Server data (videos, clips, hooks) | React Query |
| UI state (sidebar collapse) | Zustand |
| Settings (backend URL, API keys) | Zustand + localStorage |
| Projects (client-side) | Zustand + localStorage |
