# Contributing Guidelines

## Coding Standards
1. **TypeScript Strictness**: Always provide accurate type interfaces for client and server entities in `/src/types.ts`.
2. **Server-Authoritative First**: Never place authoritative state modification logic directly inside React components. All gameplay mutations must flow through `/api/*` and corresponding server services.
3. **Responsive UI**: Follow mobile-first design rules. Buttons must have minimum 44px touch targets. Avoid wrapping text on buttons and badges.
