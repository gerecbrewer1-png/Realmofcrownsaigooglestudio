# Realm of Crowns — API & Network Specification
## Phase 2.7 Verified REST & MMO Real-Time Protocol

All persistent REST endpoints are hosted under `/api/*` and enforced server-authoritatively by Express.
Transient real-time MMO updates use the Phase 2.7 Area of Interest & Network LOD specification (`MMOWorldPartition.ts`).

---

## 1. Authentication & Security
Requests pass the player's Firebase Auth token in the `Authorization: Bearer <token>` header, or use the sanitized `x-player-id` header:
- Header: `Authorization: Bearer <firebase_auth_token>`
- Fallback: `x-player-id: <player_id>` (Validated against `/^[a-zA-Z0-9_-]{3,128}$/`)

---

## 2. Server-Authoritative REST Endpoints

### Core Profile & Kingdom
| Method & Endpoint | Description | Guard / Validation |
|---|---|---|
| `GET /api/health` | Service health & game version | Public |
| `GET /api/auth/profile` | Bootstrap or fetch player identity & power | Auth required |
| `POST /api/auth/bootstrap-starter` | Claim starter charter onboarding package | Auth required, Idempotent |
| `GET /api/kingdom` | Kingdom buildings, resources & construction queues | Auth required |
| `POST /api/buildings/upgrade` | Start building upgrade | Checks prerequisites, costs, queue slots |
| `POST /api/buildings/speedup` | Apply minutes or speedup item to queue task | Authoritative duration verification |
| `POST /api/buildings/instant` | Instant complete building task using Gems | Server calculates `Math.ceil(remainingSec/30)` |
| `POST /api/buildings/collect` | Collect accrued resource production | Server recalculates production delta |

### Quests & Inventory
| Method & Endpoint | Description | Guard / Validation |
|---|---|---|
| `GET /api/quests` | Get active chapter & daily quests | Auth required |
| `POST /api/quests/claim` | Claim completed quest reward | Double-claim guards, atomic transaction logging |
| `GET /api/inventory` | Get player item inventory | Auth required |
| `POST /api/inventory/use` | Consume item (resources, shields, speedups) | Quantity guard (1..100), item ownership |

### Commander Court & Talents
| Method & Endpoint | Description | Guard / Validation |
|---|---|---|
| `GET /api/commander` | Get active commander & royal court roster | Public / Auth |
| `POST /api/commander/assign-role` | Assign role (garrison, field march, etc.) | Unique court roles enforced |
| `POST /api/commander/level-up` | Level up commander using EXP / tomes | Max level 50 cap |
| `POST /api/commander/upgrade-talent` | Allocate talent point into talent branch | Validates available points & node prerequisites |

### Military & Combat System
| Method & Endpoint | Description | Guard / Validation |
|---|---|---|
| `GET /api/military/troops` | Roster, training queue, and wounded troops | Auth required |
| `POST /api/military/train` | Train tier 1-4 swordsmen, archers, cavalry | Enforces resource costs & barracks queue |
| `POST /api/military/speedup` | Speed up troop training task | Verifies minutes / inventory item |
| `POST /api/military/instant` | Instant complete troop training with Gems | Gem calculation `Math.ceil(remainingSec/30)` |
| `POST /api/military/heal` | Heal wounded troops in Citadel hospital | Validates hospital capacity |
| `POST /api/military/heal-all-instant` | Instant heal all hospital wounded with Gems | Gem calculation `Math.ceil(totalWounded/20)` |

### World Map & March Routing
| Method & Endpoint | Description | Guard / Validation |
|---|---|---|
| `GET /api/world/state` | Explored fog of war, active marches, reports | Auth required |
| `GET /api/world/tiles` | Hex world map tiles (1519 tiles) | Auth required |
| `POST /api/world/march/dispatch` | Dispatch march (gather, attack, scout) | Slot availability (2 max), troop presence |
| `POST /api/world/march/recall` | Recall marching army back to citadel | Validates march ownership |
| `POST /api/world/scout` | Fast scout dispatch to hex coordinate | Deducts scout unit |
| `GET /api/transactions` | Player ledger transaction audit trail | Auth required |
| `POST /api/admin/grant` | Admin test grants (gems, resources) | Production requires `x-admin-key` |

---

## 3. Real-Time MMO Area of Interest & Network LOD Protocol

In Phase 2.7, real-time transient MMO positioning is decoupled from Firestore and managed via the `MMOWorldPartitionManager` protocol foundation.

### A. Entity Introduction Packet (`EntityIntroductionPacket`)
Sent **once** when an entity enters a player's active Area of Interest:
```json
{
  "packetType": "intro",
  "entityId": "ship_corsair_42",
  "entityType": "ship_pirate",
  "name": "Crimson Raider Brig",
  "faction": "pirates",
  "initialTransform": { "x": 120.5, "y": 0, "z": 85.2, "heading": 1.57, "speedKnots": 12.0 },
  "health": 1400,
  "maxHealth": 1400,
  "shipConfig": {
    "definitionId": "brig",
    "seed": 9482,
    "culture": "corsair",
    "shipClass": "brigantine",
    "hullConfiguration": 2,
    "sailConfiguration": 3,
    "primaryColor": "#b91c1c",
    "secondaryColor": "#0f172a",
    "faction": "pirates",
    "damageState": 0.0
  },
  "stateFlags": 1,
  "serverTimestamp": 1727218400000
}
```

### B. Compact Entity Delta Packet (`EntityDeltaPacket`)
Sent continuously at the entity's assigned **Network LOD rate** (30 Hz for NET0 down to 0.2 Hz for NET4):
```json
{
  "packetType": "delta",
  "entityId": "ship_corsair_42",
  "serverTimestamp": 1727218400100,
  "x": 121.8,
  "z": 86.4,
  "headingQuantized": 64,
  "speedKnots": 12.2,
  "health": 1350,
  "stateFlags": 1
}
```
*Bandwidth footprint: ~28 bytes per delta packet.*

### C. Entity Leave Packet (`EntityLeavePacket`)
Sent when an entity leaves the player's active AOI ($> 500\text{ m}$ threshold):
```json
{
  "packetType": "leave",
  "entityId": "ship_corsair_42",
  "reason": "out_of_aoi",
  "serverTimestamp": 1727218405000
}
```
*Note: Client cleans up visual mesh; authoritative world entity remains fully intact on server/world partition.*
