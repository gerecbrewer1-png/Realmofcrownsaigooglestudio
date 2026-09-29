# Realm of Crowns — Deployment Guide
## Phase 2.7 Verified Runtime Specification

---

## 1. Production Architecture
The application runs as a unified single-port full-stack service conforming to Cloud Run, containerized workloads, and standard cloud hosting.
- **Port**: Bound strictly to `0.0.0.0:3000`.
- **Runtime**: Node.js v20+ / v22+ / v24+ executing TypeScript server via `tsx server.ts` or native Node ESM.
- **Dual-Mode Serving**:
  - **Development (`NODE_ENV != 'production'`)**: Express boots and mounts Vite dev server in middleware mode with real-time Hot Module Replacement (HMR).
  - **Production (`NODE_ENV=production`)**: Express serves pre-compiled production assets statically from the `/dist` directory with SPA fallback routing to `/dist/index.html`.

---

## 2. Verified Scripts & Build Commands

| Command | Action | Implementation |
|---|---|---|
| `npm start` | Launches full-stack server on port 3000 | `tsx server.ts` |
| `npm run dev` | Launches dev server with Vite HMR | `tsx server.ts` |
| `npm run build` | Builds optimized production client bundle | `vite build` (outputs to `/dist`) |
| `npm test` | Executes all 5 automated test suites | `tsx test/*.ts` (290 tests) |
| `npm run preview` | Previews production build | `vite preview` |

---

## 3. Environment Variables
- `PORT`: Server port (defaults to `3000`).
- `NODE_ENV`: Set to `'production'` for static asset serving from `/dist`.
- `ADMIN_SECRET`: Secret header required for `/api/admin/grant` in production mode.
- `FIREBASE_APPLET_CONFIG`: Client credentials located in `firebase-applet-config.json`.
