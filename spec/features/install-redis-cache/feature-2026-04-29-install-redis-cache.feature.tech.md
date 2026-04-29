# Redis Cache Integration - Technical Definition

## Goal
Introduce a Redis-backed cache foundation for the NestJS service using the current NestJS cache-manager stack, with one explicit cached read flow and matching invalidation behavior. The first implementation should improve architectural readiness without changing API response shapes or applying broad response caching.

## Source Feature
`spec/features/install-redis-cache/feature-2026-04-29-install-redis-cache.md`

## Technical Scope
- Add runtime dependencies for NestJS cache support and Redis storage.
- Add a small cache infrastructure module under `src/cache/`.
- Import the cache infrastructure module once from `src/app.module.ts`.
- Add a `redis` service to `docker-compose.yaml` and wire `REDIS_URL` for the `app` container.
- Add service-level caching to `PunchinService.getPunchinsFromUser()`.
- Add invalidation after successful `PunchinService.record()`.
- Add focused unit tests for cache hit, miss, and invalidation behavior.
- Update operational documentation with cache environment variables.

Out of scope for the first iteration:
- Global `CacheInterceptor` registration.
- Caching write operations.
- Caching authentication, login-code, or mutable user flows.
- Introducing `@nestjs/config` unless the implementation intentionally standardizes all configuration access.

## Architecture
Create `src/cache/cache.module.ts` as an infrastructure module that wraps `CacheModule.registerAsync()`.

The module should:
- Register cache globally with `isGlobal: true`.
- Read `REDIS_URL`, `CACHE_TTL_MS`, and optional `CACHE_ENABLED` from `process.env`.
- Use Redis when caching is enabled and `REDIS_URL` is present.
- Fall back to the default in-memory cache when Redis is intentionally disabled or unavailable by configuration.
- Use millisecond TTL values, because current NestJS cache docs define TTL in milliseconds for cache-manager integration.

Recommended data flow:
1. `GET /punchin?emailAddress=...` calls `PunchinController.getPunchinsFromUser()`.
2. The controller continues validating that `emailAddress` is present.
3. `PunchinService.getPunchinsFromUser()` normalizes the email address for the cache key.
4. The service checks `CACHE_MANAGER` for `punchins:user:{normalizedEmail}`.
5. On hit, return the cached `PunchinEntry[]`.
6. On miss, validate the user through `UserService.findUserByEmailAddress()`, query `PunchinRepositoryPort.findBy()`, cache the resulting array, and return it.
7. `PunchinService.record()` saves the new punch-in only after token and user validation; after a successful save, delete the same user-specific cache key.

Do not cache `PunchinService.list()` in this feature. It is broader than the selected use case and has no existing controller route in the current implementation.

## Contracts
Configuration inputs:
- `REDIS_URL`: Redis connection string. Docker Compose should use `redis://redis:6379`.
- `CACHE_TTL_MS`: positive integer TTL in milliseconds. Recommended default: `60000`.
- `CACHE_ENABLED`: optional flag. Treat only the string `false` as disabled; default to enabled.

Cache key contract:
- Prefix: `punchins:user:`
- Input: normalized `emailAddress`.
- Normalization: `trim().toLowerCase()`.
- Example: `punchins:user:worker@example.com`

Service contract:
- `getPunchinsFromUser(emailAddress: string): Promise<PunchinEntry[]>` must keep returning the same payload shape.
- Cache reads must not skip user existence validation unless the cached entry was produced after a successful user validation.
- `record(dto: CreatePunchinDto): Promise<PunchinEntry>` must invalidate only after `repo.save()` succeeds.

Infrastructure contract:
- Redis must be an internal Docker Compose dependency for the app service.
- Do not log full `REDIS_URL` values because they may contain credentials.
- Cache storage must be accessed through Nest's `CACHE_MANAGER` token from `@nestjs/cache-manager`.

## Security
- Avoid global response caching. `GET /punchin` is user-scoped by query parameter, and global URL-based caching is easy to misconfigure if authentication headers or future authorization checks are added.
- Normalize cache keys to prevent duplicate keys for equivalent email inputs and to reduce accidental stale reads.
- Do not cache authorization decisions, JWT payloads, login codes, or secrets.
- Do not include raw JWTs, Redis credentials, or other secrets in cache keys or logs.
- Keep invalidation tied to successful writes so failed punch-in attempts cannot evict unrelated cache entries.
- If Redis is exposed locally through port `6379`, treat it as a development convenience only. Production should keep Redis on a private network and require authenticated/TLS connection strings where available.
- Cached punch-in entries are user activity data. Any future endpoint-level caching must account for authentication and authorization before caching the response.

Failure modes to handle:
- Invalid `CACHE_TTL_MS`: fall back to the default TTL instead of throwing during bootstrap.
- `CACHE_ENABLED=false`: app should start with local/default cache behavior or no Redis store.
- Missing `REDIS_URL`: app should start without Redis for local tests.
- Redis connection error: app startup behavior must be explicit. Prefer non-Redis fallback for local/test, and document stricter production expectations separately.

## Dependencies
Use the current NestJS cache-manager path:
- `@nestjs/cache-manager`: Nest cache integration package.
- `cache-manager`: underlying cache abstraction used by Nest.
- `@keyv/redis`: Redis storage adapter compatible with the NestJS 11 cache migration path.

Implementation may also need direct dependencies depending on the chosen store construction:
- `keyv`: needed if constructing `new Keyv({ store: ... })` directly.
- `cacheable`: needed only if adding an explicit in-memory `KeyvCacheableMemory` tier.

Recommended first iteration:
- Install `@nestjs/cache-manager`, `cache-manager`, and `@keyv/redis`.
- Add `keyv` only if TypeScript imports it directly.
- Avoid `cache-manager-redis-store` and old `redisStore` examples; the NestJS 11 migration guide points to Keyv-based stores.

References:
- NestJS caching docs: https://docs.nestjs.com/techniques/caching
- NestJS migration guide, cache module: https://docs.nestjs.com/migration-guide
- Keyv Redis adapter docs: https://keyv.org/docs/storage-adapters/redis/

## Implementation Notes
- Prefer manual service-level caching in `PunchinService` over controller interceptors for this feature.
- Inject cache with `@Inject(CACHE_MANAGER) private readonly cacheManager: Cache`.
- Import `Cache` from `cache-manager` for typing.
- Keep key construction in a small private method on `PunchinService`, for example `private getUserPunchinsCacheKey(emailAddress: string): string`.
- Cache only repository results, not exceptions. If `UserService.findUserByEmailAddress()` throws, do not write a cache entry.
- Invalidate with `await this.cacheManager.del(key)` after a successful save. If deletion fails, do not fail the punch-in write in the first iteration; log the failure once a project-wide logger pattern exists.
- Use deterministic test doubles for `CACHE_MANAGER` in service specs instead of requiring Redis for unit tests.
- Keep Docker Compose service naming stable: `redis`.
- Add `depends_on: [redis]` for the `app` service if Compose is expected to start everything together.

Potential cache module shape:

```ts
CacheModule.registerAsync({
  isGlobal: true,
  useFactory: async () => {
    const ttl = parsePositiveInt(process.env.CACHE_TTL_MS, 60000);

    if (process.env.CACHE_ENABLED === 'false' || !process.env.REDIS_URL) {
      return { ttl };
    }

    return {
      ttl,
      stores: [new KeyvRedis(process.env.REDIS_URL)],
    };
  },
});
```

Confirm the exact `@keyv/redis` import form during implementation against the installed version. Current docs show both default `KeyvRedis` construction and `createKeyv()` examples.

## Validation
Required commands:
- `npm install`
- `npm test`
- `npm run test:e2e`
- `docker compose up --build`

Required unit coverage:
- Cache module returns a default/local configuration when `REDIS_URL` is absent.
- Cache module uses Redis store configuration when `REDIS_URL` is present and caching is enabled.
- `getPunchinsFromUser()` returns cached entries without calling the repository on a cache hit.
- `getPunchinsFromUser()` validates the user, calls `repo.findBy()`, stores entries, and returns them on a cache miss.
- `record()` invalidates the normalized user punch-in cache key after successful save.
- `record()` does not invalidate when token validation, user validation, or save fails.

Recommended manual verification:
- Start the app with Docker Compose.
- Register or seed a user through the existing flow.
- Record a punch-in.
- Call `GET /punchin?emailAddress={email}` twice and confirm the second read is served from cache by temporary test instrumentation or Redis key inspection.
- Record another punch-in for the same user.
- Call the same `GET` again and confirm the new entry is visible after invalidation.

## Open Questions
- Should Redis be required in production, or should the app always allow in-memory fallback?
- Should `CACHE_ENABLED=false` mean no cache at all, or default in-memory cache only?
- What production TTL should be used for user punch-in lists: 30 seconds, 60 seconds, or a different business-defined value?
- Should future persistence changes introduce repository-level cache decorators, or should caching remain explicit in services?
- Should this feature also add health/readiness checks for Redis, or leave that to a broader operations feature?
