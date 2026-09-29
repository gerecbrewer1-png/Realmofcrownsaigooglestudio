# AI Developer & Coding Agent Guide

## 1. Architectural Rules for AI Agents
When extending or modifying this project:
- **Server-Authoritative Game Logic**: Do NOT calculate construction completion, resource generation, or quest claim results on the client. Always add or invoke endpoints in `/api/*` backed by `/src/server/services/`.
- **Data-Driven Balance**: Never hardcode building costs, stats, or timers inside UI views. All parameters reside in `/src/server/services/gameConfig.ts` and `/src/data/`.
- **Database Rules**: Ensure any new Firestore collection is documented in `DATABASE.md`, specified in `firebase-blueprint.json`, and secured in `firestore.rules`.
- **Icons**: Always import icons from `lucide-react`. Do not create custom SVGs.
- **Port Compliance**: The server MUST bind to `0.0.0.0:3000`.

## 2. Directory Layout
- `/src/types.ts`: Global TypeScript interfaces (Player, Kingdom, Building, Resource, Quest, Inventory, Transaction).
- `/src/server/`: Express server logic, routes, and service classes.
  - `/src/server/services/gameConfig.ts`: Authoritative building, quest, starter pack, and economy configuration.
  - `/src/server/services/kingdomService.ts`: Upgrades, queues, resource delta math.
  - `/src/server/services/playerService.ts`: Profile creation, starter rewards, persistence.
  - `/src/server/services/questService.ts`: Quest tracking, validation, claims.
  - `/src/server/services/inventoryService.ts`: Speedups, item consumption.
  - `/src/server/services/ledgerService.ts`: Audit transactions.
- `/src/components/`: Modular React components.
  - `KingdomView.tsx`: Main interactive settlement map.
  - `BuildingModal.tsx`: Building inspection, upgrades, and speedup controls.
  - `QuestModal.tsx`: Active quests and reward collection.
  - `InventoryModal.tsx`: Items, chests, and speedup activation.
  - `CommanderModal.tsx`: Starter hero inspection.
  - `ShopModal.tsx`: Fair play gem packs and convenience items.
  - `AdminModal.tsx`: Server administration and live game tuning.
  - `TopHeader.tsx`: Resource HUD, power, level, active peace shield.
  - `BottomNav.tsx`: Primary mobile navigation dock.
- `/src/audio/`: Synthesizer audio engine (Web Audio API).
