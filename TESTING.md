# Realm of Crowns — Testing & Quality Assurance
## Phase 2.7 Verified Test & Benchmark Specifications

---

## 1. Verified Automated Test Suites (290 Assertions, 0 Failures)

| Suite File | Scope | Test Count | Status |
|---|---|---|---|
| `test/securityAndAuthoritativeTests.ts` | Server authority, double-claim guards, ledgers, speedups, building queues, warehouse limits, hero classes, and architectural 3D factory. | 116 Passed | PASS |
| `test/test_adaptive_controls.ts` | Conflict-free WASD locomotion, RTS command shortcuts (Q, T, M, F), mobile virtual joystick adapter, diagonal normalization. | 53 Passed | PASS |
| `test/test_graphics_gameplay_enhancements.ts` | 3D magnetic loot pickup, combat VFX shockwaves/auras, tactical radar, solar day/night elevation, hero click-to-move, wolf pack flanking AI. | 40 Passed | PASS |
| `test/test_phase2_6_simulation_lod.ts` | Simulation LOD distance tiers (`SIM0-SIM4`), 20m hysteresis, time-sliced AI ticks, 2D spatial hash grid, zero-allocation object pool, 250-ship fleet manager. | 38 Passed | PASS |
| `test/test_phase2_7_mmo_aoi.ts` | MMO spatial world partition, uniform grid hashing, multi-factor AOI relevance, 50m hysteresis, prefetch band, NET0-NET5 tiers, delta quantization, client interpolation, and density budget capping. | 43 Passed | PASS |
| **Total Automated Assertions** | **All Core Systems** | **290 Passed** | **100% PASS** |

---

## 2. Automated Benchmark Suites

| Benchmark File | Scenarios Evaluated | Output Artifact |
|---|---|---|
| `scripts/test_phase2_6_simulation_lod.mjs` | Fleet scaling at 1, 10, 25, 50, 100, 250 ships with live FPS, draw calls, triangles, and simulation tiers. | `voyage_phase2_6_benchmark.json` |
| `scripts/test_phase2_7_mmo_benchmarks.ts` | 10, 100, 500, 1000 world entities; dense 25, 50, 100, 200 nearby; distributed world (1000 world vs 2 AOI); pirate traversal; 100 memory cycles. | `voyage_phase2_7_mmo_benchmark.json` |
| `scripts/test_phase2_7_browser_live.mjs` | Headless Chrome live validation with F3 MMO HUD overlay, 500 world entities, and 50 dense nearby ships. | `voyage_phase2_7_browser_live.json`, `voyage_phase2_7_mmo_hud.png` |

---

## 3. Running Tests & Benchmarks

- **Run All 5 Automated Test Suites:**
  ```bash
  npm test
  # Or directly via tsx:
  node node_modules/tsx/dist/cli.mjs test/securityAndAuthoritativeTests.ts
  node node_modules/tsx/dist/cli.mjs test/test_adaptive_controls.ts
  node node_modules/tsx/dist/cli.mjs test/test_graphics_gameplay_enhancements.ts
  node node_modules/tsx/dist/cli.mjs test/test_phase2_6_simulation_lod.ts
  node node_modules/tsx/dist/cli.mjs test/test_phase2_7_mmo_aoi.ts
  ```

- **Run MMO Scaling Benchmarks:**
  ```bash
  node node_modules/tsx/dist/cli.mjs scripts/test_phase2_7_mmo_benchmarks.ts
  ```

- **Run Live Browser Headless Validation:**
  ```bash
  node scripts/test_phase2_7_browser_live.mjs
  ```

- **Production Client Bundle Verification:**
  ```bash
  npm run build
  # Or directly:
  node node_modules/vite/bin/vite.js build
  ```

*(Note: Prior documentation referenced `npm run lint`. That script does not exist in `package.json`; use TypeScript compilation `npx tsc --noEmit` or `npm test` instead).*
