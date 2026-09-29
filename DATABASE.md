# Database & Data Model Specification

## Firestore Collections Schema

### 1. `/players/{playerId}`
Root document for player account state:
- `uid`: string (Firebase Auth UID)
- `displayName`: string
- `avatar`: string
- `playerLevel`: number
- `playerExp`: number
- `vipLevel`: number
- `vipPoints`: number
- `power`: number
- `createdAt`: timestamp
- `lastLoginAt`: timestamp
- `loginStreak`: number
- `gems`: number (Current premium currency balance)
- `shieldExpiresAt`: timestamp (Peace shield duration)
- `coordinates`: `{ x: number, y: number }` (World map position)

### 2. `/kingdoms/{kingdomId}`
Root document for the player's physical settlement:
- `ownerUid`: string
- `castleLevel`: number
- `resources`: `{ food: number, wood: number, stone: number, iron: number, gold: number }`
- `lastResourceUpdate`: timestamp (Epoch milliseconds for production delta calculations)
- `constructionQueue`: Array of active building tasks:
  - `taskId`: string
  - `buildingId`: string
  - `targetLevel`: number
  - `startTime`: number (server ms)
  - `completionTime`: number (server ms)
- `troops`: `{ [troopId: string]: number }`

### 3. `/kingdoms/{kingdomId}/buildings/{buildingId}`
Subcollection holding individual building instances:
- `buildingId`: string (e.g., "castle", "farm_1", "lumber_mill_1", "barracks")
- `type`: string (e.g., "castle", "farm", "lumber_mill", "barracks", "warehouse")
- `level`: number
- `slot`: string
- `updatedAt`: timestamp

### 4. `/inventory/{playerId}/items/{itemId}`
Inventory items, speedups, and consumable chests:
- `itemId`: string
- `type`: "speedup" | "resource_pack" | "shield" | "cosmetic"
- `quantity`: number
- `name`: string
- `effect`: object

### 5. `/quests/{playerId}/tasks/{questId}`
Player quest progression:
- `questId`: string
- `category`: "chapter" | "daily" | "achievement"
- `progress`: number
- `target`: number
- `status`: "in_progress" | "completed" | "claimed"
- `claimedAt`: timestamp | null

### 6. `/transactions/{transactionId}`
Immutable audit ledger for currency and high-value item movements:
- `transactionId`: string
- `playerId`: string
- `source`: string (e.g. "starter_pack", "building_upgrade_instant", "quest_reward")
- `currencyType`: "gems" | "gold" | "resource"
- `amountDelta`: number
- `balanceAfter`: number
- `timestamp`: timestamp
