# Redis Cache Integration

## Goal
Add Redis-backed caching to this NestJS service so read-heavy or repeatable operations can reuse cached data, reduce repeated in-memory repository work, and establish a reusable cache foundation for future persistence-backed modules.

## Scope
- `package.json`
- `src/app.module.ts`
- New cache/infrastructure module under `src/`
- `docker-compose.yaml`
- `.env` and runtime environment usage
- Unit tests around cache configuration and cached behavior
- Optional e2e coverage for cached `GET` endpoints once a target endpoint is selected

## Current Context
- The app runs on NestJS 11 and currently has no cache or Redis integration.
- The application already relies on environment variables directly in services and bootstrap code.
- Infrastructure currently includes `app`, `prometheus`, and `grafana` in `docker-compose.yaml`.
- There is no shared configuration module yet, so cache configuration should stay minimal unless the implementation also introduces `@nestjs/config`.

## Technical Direction
- Use NestJS cache support through `@nestjs/cache-manager` and `cache-manager`.
- For Redis storage, use the NestJS 11-compatible Keyv path with `@keyv/redis`.
- Register cache asynchronously so Redis connection details and TTL can come from environment variables.
- Keep cache registration global to avoid repeating imports across feature modules.
- Start with manual service-level caching or selective `GET` endpoint caching only. Do not apply a global cache interceptor to the whole app on the first iteration.

## Proposed Environment Variables
- `REDIS_URL`: Redis connection string, for example `redis://redis:6379`
- `CACHE_TTL_MS`: default cache TTL in milliseconds
- `CACHE_ENABLED`: optional feature flag for safe local fallback, `true` by default

## Plan
1. Add cache dependencies aligned with NestJS 11: `@nestjs/cache-manager`, `cache-manager`, and `@keyv/redis`.
2. Create a small infrastructure module, for example `src/cache/cache.module.ts`, that registers `CacheModule.registerAsync()` as global and reads `REDIS_URL` and `CACHE_TTL_MS` from `process.env`.
3. Import that module into `AppModule` so cache wiring is centralized and reusable.
4. Add a Redis service to `docker-compose.yaml` with a stable service name and expose port `6379` for local development.
5. Add a first practical cache use case instead of caching everything:
   - Prefer `PunchinService.getPunchinsFromUser()` because it is a pure read path and already returns deterministic data from a query.
   - Build cache keys from normalized business inputs, for example `punchins:user:{emailAddress}`.
6. Define invalidation rules for related writes:
   - After `PunchinService.record()`, invalidate that user’s punchin-list cache key.
   - If future cached user lookups are added, invalidate them after user updates or registration conflicts are resolved.
7. Add unit tests covering:
   - Cache module registration behavior with and without `REDIS_URL`
   - Cache hit path for the selected read method
   - Cache invalidation after a write
8. If the team wants endpoint-level caching later, add it only to explicit `GET` routes with `CacheInterceptor`, `@CacheKey()`, and `@CacheTTL()` where responses are public or safely keyed.
9. Update operational docs with the required env vars and local startup flow.

## Acceptance Criteria
- The project can start locally with Redis enabled through Docker Compose.
- Redis cache wiring uses NestJS 11-compatible packages and configuration.
- Cache configuration is centralized and available across modules.
- At least one read flow uses Redis-backed caching with deterministic cache keys.
- The selected cached read flow returns the same payload shape as before.
- A related write flow invalidates stale cache entries.
- The application still starts when cache is disabled or when local fallback mode is used, if `CACHE_ENABLED=false` is implemented.
- Tests cover cache hit and invalidation behavior.

## Risks
- Applying cache globally may leak user-scoped data or cache responses that should stay dynamic.
- Using the old `redisStore` setup would be incompatible with the current NestJS cache stack.
- This project currently uses in-memory repositories, so Redis will improve architectural readiness more than runtime performance until persistent repositories or heavier read volume exist.
- Direct `process.env` usage across the app may become harder to maintain as infrastructure settings grow; a later `ConfigModule` adoption may be worthwhile.

## Validation
- `npm install`
- `npm test`
- `npm run test:e2e`
- `docker compose up --build`
- Verify Redis container health and confirm cached reads are invalidated after a punch-in write.

## References
- NestJS caching docs: https://docs.nestjs.com/techniques/caching
- NestJS v11 migration guide cache section: https://docs.nestjs.com/migration-guide
