# Realm of Crowns - AI Development Context

This file is the short handoff for an AI coding assistant. Read it before changing the project. Use the repository files as the final source of truth and verify paths before assuming that a feature described in a document is implemented.

## 1. Game Identity

Realm of Crowns is a persistent multiplayer medieval kingdom strategy game. The player rules a kingdom in the fictional realm of Valerius.

Primary gameplay loop:

```text
Produce resources -> upgrade buildings -> unlock capabilities
       ^                                      |
       |                                      v
Claim quests <- research and train <- unlock milestones
```

Planned or core systems:

- Kingdom and castle development.
- Resource production: food, wood, stone, iron, and gold.
- Premium currency: gems, earned through gameplay and optionally purchased.
- Construction queues, timed upgrades, speed-ups, and instant completion.
- Quests, inventory items, starter rewards, peace shields, and progression.
- Military training, commanders/heroes, tactical combat, raids, and armies.
- Persistent world map, settlements, ports, sailing, alliances, and wars.
- Responsive mobile-first controls and medieval UI.

The design goal is fair progression: spending money should not be required to reach endgame. The starter experience includes the Royal Sovereign Charter, starter resources and troops, a 24-hour peace shield, speed-ups, and the starter commander Sir Alden the Valiant in the web design documents.

## 2. Runtime Status - Important

The repository contains two overlapping project histories. Do not merge them casually.

### Documented legacy/current web stack

- Browser client: React 19 + TypeScript.
- Build/dev tooling: Vite 6, Tailwind CSS 4, Motion, and Lucide React.
- 3D libraries present in `package.json`: Three.js and PlayCanvas.
- Server: Node.js + Express + TypeScript executed through `tsx`.
- Intended web entry: `index.html` loads `/src/main.tsx`.
- Intended server entry: `server.ts` mounts Express API routes and Vite middleware.
- Intended local port: `3000`, bound by the server.
- Data/auth design: Firebase Authentication and Cloud Firestore, with local/offline development behavior described in the docs.
- Audio design: procedural Web Audio API synthesizer.

### Documented migration target

`docs/MIGRATION_STATUS.md` and the restore guides describe a Godot 4.7 project named `RealmOfCrownsGodot/`, including GDScript simulation systems, native UI, 3D scenes, and web/desktop/mobile exports.

In the current visible checkout, `RealmOfCrownsGodot/` is not present. The current `src` directories also contain folders but no visible implementation files at the paths named by several older documents. Treat the migration documentation as historical/planned context until the Godot directory is restored or the user confirms that Godot is the active runtime.

### Current checkout facts

- `package.json` declares only these scripts: `start`, `dev`, `server`, `build`, and `preview`.
- There are no declared `test`, `lint`, `godot`, `dev:native`, `build:web`, or `game` scripts in the current `package.json`.
- `index.html` points to `src/main.tsx`; verify that file exists before attempting a web build.
- `server.ts` imports service modules under `src/server/services/`; verify those files exist before attempting to run the server.
- Root screenshots, `dist/`, `node_modules/`, `scratch/`, `_development_artifacts/`, `_migration_source/`, and downloaded/extracted asset folders are not substitutes for active source code.

## 3. Web Architecture Rules

When the web architecture is confirmed as active:

- Keep game outcomes server-authoritative. The client must not decide construction completion, resource generation, quest claims, currency changes, inventory changes, or combat results.
- Put authoritative game logic behind `/api/*` and server services.
- Keep balance data in server configuration/data modules, not UI components.
- Use server time for timers, resource accumulation, shields, and completion checks.
- Validate IDs, quantities, prerequisites, costs, and permissions on the server.
- Record premium currency and high-value item movements in the append-only transaction ledger.
- Make reward and claim operations idempotent so refreshes and retries cannot duplicate rewards.
- Use Firebase Auth identity for real authentication. Do not treat an arbitrary client-supplied ID as secure in production.
- Use `lucide-react` icons instead of hand-written SVG icons.
- Preserve responsive behavior for phone, tablet, and desktop layouts.

## 4. Important Web Paths

These are the intended ownership areas. Confirm their existence before editing because some may be absent in this checkout.

- `server.ts`: Express/Vite bootstrap and API route registration.
- `src/main.tsx`: React browser entry expected by `index.html`.
- `src/components/`: React UI, kingdom view, modals, HUD, and navigation.
- `src/server/services/`: authoritative player, kingdom, quest, inventory, ledger, world, and configuration services.
- `src/game/`: combat, armies, heroes, AI, events, mobile input, VFX, and PlayCanvas-related code.
- `src/api/`: API-facing helpers or route-specific client code.
- `src/audio/`: procedural audio.
- `src/assets/`: asset loading, registries, placeholders, LOD, and instancing helpers.
- `src/data/`: static data and balance definitions.
- `public/assets/`: browser-served models, textures, buildings, terrain, characters, water, UI, and effects.
- `firestore.rules`: Firestore security rules.
- `firebase-blueprint.json`: intended Firestore collection/index blueprint.
- `DATABASE.md`: data model documentation.
- `API.md`: intended REST endpoint contract.

## 5. Intended API Surface

The documented web API includes:

- `GET /api/health`
- `GET /api/auth/profile`
- `POST /api/auth/bootstrap-starter`
- `GET /api/kingdom`
- `POST /api/buildings/upgrade`
- `POST /api/buildings/speedup`
- `POST /api/buildings/instant`
- `POST /api/buildings/collect`
- `GET /api/quests`
- `POST /api/quests/claim`
- `GET /api/inventory`
- `POST /api/inventory/use`
- Admin configuration endpoints described in `API.md`.

Do not assume every documented endpoint currently exists. Inspect `server.ts` and the service implementation first.

## 6. Data Concepts

The documented Firestore model includes:

- `players/{playerId}`: identity, level, experience, power, gems, shield, login state, and world coordinates.
- `kingdoms/{kingdomId}`: castle level, resources, production timestamp, construction queue, and troops.
- `kingdoms/{kingdomId}/buildings/{buildingId}`: building type, level, slot, and update time.
- `inventory/{playerId}/items/{itemId}`: consumables, speed-ups, shields, resource packs, and cosmetics.
- `quests/{playerId}/tasks/{questId}`: category, progress, target, status, and claim time.
- `transactions/{transactionId}`: immutable audit records for currency and valuable item movements.

## 7. Assets and References

- `public/assets/` is the web-served asset collection.
- `design_references/` contains visual reference material.
- `docs/WORLD_ASSETS.md` documents KayKit Medieval Hexagon assets and intended Three.js world-map use.
- `ASSET_ATTRIBUTION.md`, `ASSET_LICENSES.md`, and `docs/ASSET_LICENSE_MANIFEST.md` are the licensing references. Check licenses before adding or redistributing assets.
- `_migration_source/` contains legacy/source material and extracted assets. It is reference material, not automatically active runtime code.
- Screenshots such as `mobile_*.png`, `port_*.png`, and `world_*.png` are verification artifacts, not implementation.
- `gear_gallery.html` and scratch scripts are inspection/testing tools, not the game entry point.

## 8. Safe AI Workflow

Before editing:

1. Identify the active runtime: web or restored Godot.
2. Confirm the target file exists and find its callers/tests.
3. Read the nearest architecture/API/data contract.
4. Keep changes inside the owning layer.
5. Do not edit screenshots, generated `dist/`, `node_modules/`, migration archives, or downloaded assets unless the task explicitly concerns them.

For web changes, start with `npm run build` after the relevant source is present. Do not claim `npm test` or `npm run lint` works unless those scripts are added or otherwise verified; the current package scripts do not define them.

## 9. Useful Documents

- `README.md`: product summary and web technology overview.
- `AI_DEVELOPMENT_GUIDE.md`: web architecture rules and intended service boundaries.
- `ARCHITECTURE.md`: server-authoritative web architecture.
- `GAME_DESIGN.md`: game loop, resources, buildings, and fair-play goals.
- `API.md`: web endpoint contract.
- `DATABASE.md`: Firestore model.
- `SECURITY.md`: trust boundary and ledger expectations.
- `docs/MIGRATION_STATUS.md`: web-to-Godot migration history.
- `README_ONEDRIVE_RESTORE.md`: restore/resumption claims; verify commands against `package.json`.

## 10. First Response Expected From Another AI

Before writing code, the AI should state which runtime and files it found, call out any missing entry points or documentation drift, and propose the smallest change that can be validated. It should not invent missing source files or assume the Godot migration is available just because the documents describe it.