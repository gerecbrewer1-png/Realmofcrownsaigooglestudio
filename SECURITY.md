# Security Architecture & Rules

## 1. Zero-Trust Client Policy
The browser or mobile client is fundamentally untrusted.
1. **Never Trust Client Timestamps**: The server records `Date.now()` upon request receipt. Construction completion, shield duration, and production accumulation are calculated strictly against server time.
2. **Never Trust Client Currency & Inventory**: All additions and deductions to Gems, Resources, and Items occur via atomic server-side updates.
3. **Combat Determinism**: All combat resolution is executed by server calculations based on verified stats, commander affinities, and seeded randomness.

## 2. Ledger Immutability
All movements of premium currency (`Gems`) are written to an append-only `/transactions` ledger. Double-spend attempts are thwarted by idempotency tokens and atomic transaction checks.

## 3. Rate Limiting & Input Sanitization
- API routes enforce rate limiting per player UID to prevent automated request flooding.
- Building IDs, item IDs, and action payloads are validated against strict JSON schemas and enum whitelist tables.
- Cross-Site Scripting (XSS) and SQL/NoSQL injection mitigations are enforced on all player-submitted text (e.g. Kingdom names, chat messages).
