# Realm of Crowns: Medieval MMO Strategy

**Realm of Crowns** is an original persistent multiplayer medieval strategy MMO built for cross-platform play (modern Web, and future Android/iOS native clients).

Players establish their kingdom, upgrade castle fortifications, cultivate economic resource plots, conduct technological research, train tiered armies, recruit valorous commanders, explore a persistent world, form strategic alliances, and participate in kingdom wars.

## Core Features (Phase 0 & Phase 1)

- **Persistent Kingdom Simulation**: Server-authoritative building upgrades, construction queues, and dynamic resource production (Food, Wood, Stone, Iron, Gold, Gems).
- **Data-Driven Architecture**: All building specifications, upgrade costs, requirements, and benefits are fully decoupled from UI and driven by structured configuration.
- **Fair Play Economy**: $0 spenders can reach endgame. Gems and speed-ups are generously earned via quests, milestones, and daily progression.
- **Generous Starter Experience**: Royal Sovereign Charter onboarding package with starter resources, starter troops, 24-hour peace shield, speed-ups, and the starter hero **Sir Alden the Valiant**.
- **Server-Authoritative Ledger**: Every transaction involving resources, gems, and items is verified and logged to prevent double-spending and client-side manipulation.
- **Mobile-First Responsive Interface**: Tailored for phones, tablets, and desktop displays with tactile touch targets, atmospheric medieval visual design, and real-time countdowns.
- **Integrated Synthesizer Audio**: Web Audio API sound effects for construction, quest completion, coin collection, and royal fanfares with zero external asset dependencies.
- **Administrative Control Deck**: Real-time tools to inspect accounts, modify building levels, grant/deduct resources and gems, and tune game balance.

## Performance & MMO Networking (Phase 2.7 / 2.8)

- **Optimized 60 FPS Rendering**: The naval sea voyage simulation operates efficiently at a stable 60 FPS utilizing a dedicated Three.js WebGL2 context, seamlessly avoiding dual-renderer conflicts. Unnecessary frame loops are actively destroyed upon component unmount.
- **Area of Interest (AOI) Network LOD**: Employs non-linear scaling and 5-tier Network Level of Detail. The client reliably maintains responsive 0.049ms query costs, efficiently culling 99.8% of irrelevant distant entities to conserve mobile bandwidth.
- **Low Latency Architecture**: Stable MMO WebSocket transport achieving < 15ms Avg RTT for localized client duos, and scaling sustainably to handle 100 concurrent clients per regional cluster with strict heap memory control (preventing memory leaks).

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Motion, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, tsx.
- **Database & Auth**: Google Cloud Firestore & Firebase Authentication (with integrated local fallback for offline/isolated development).
- **Audio**: Web Audio API Procedural Medieval Sound Synthesizer.

## Phase 2.9: Naval PvP & Server Authority (Current Progress)

- **Server-Authoritative Projectiles**: Implemented full backend collision mechanics using precise swept-segment continuous collision detection to completely prevent fast projectiles from tunneling through ships between 30Hz server ticks.
- **Scalable Combat Broadphase**: Combat hit-detection bypasses expensive O(N^2) loops by querying the MMO spatial hash partition for rapid local-cell lookup.
- **Idempotent Network Combat Events**: Clients sync to authoritative projectile impacts (`FIRE_CONFIRMED`, `DAMAGE_EVENT`, `SHIP_DEFEATED`), driving client-side visuals without trusting client physics. Faction-based friendly fire rules are strictly enforced server-side.
- **Authentication Hardening Verification**: Confirmed active use of genuine Firebase Admin `verifyIdToken` in the real-time gateway, entirely replacing previous prototype mock/regex tokens.

### 📌 Next Steps / Where We Left Off
- **Authentication Hardening & Server Stability:** Finish tuning the Firebase socket token lifecycle, implement robust reconnection safeguards, ensure socket memory cleanly dereferences on edge-case disconnects, and lock down the production WebSocket gateway stability.
