# Snapback SDK Code Review

## High Severity / ROI

-   **Breaks analytics payload contract when hashing file paths**  
    **Location:** `src/privacy/sanitizer.ts:125` (contract: `node_modules/@snapback/contracts/src/types/snapshot.ts:83`)  
    **Issue:** `sanitize()` deletes the required `path` field whenever `hashFilePaths` is enabled and only emits a `pathHash`. The contracts package (and our API validation) still requires `FileMetadata.path`, so hashed payloads start failing Zod validation/400ing as soon as privacy mode is switched on.  
    **Impact:** Cloud analytics uploads are rejected, silently degrading telemetry and downstream recommendations for any user who enables hashing.  
    **Recommendation:** Keep the `path` field populated with the hashed value (or introduce a dedicated `hashedPath` in the contracts and update both sides atomically). Until then, avoid deleting `path` and instead overwrite it with the digest so that the payload continues to satisfy the schema.

-   **Snapshot list cache never clears, returning stale data**  
    **Location:** `src/client/SnapshotClient.ts:28-30`, `88-90`, `116-117`  
    **Issue:** All list responses are cached under keys like `snapshots:list:{"protected":true}` yet invalidation only deletes the literal key `snapshots:list`. After any create/update/delete, every filtered list keeps serving stale entries until eviction.  
    **Impact:** UIs fail to reflect new snapshots or removals, and dedupe logic built on `list()` will make decisions from stale state. Bugs surface immediately in long-lived editors where the cache survives multiple mutations.  
    **Recommendation:** Normalise invalidation (e.g. iterate keys with the `snapshots:list` prefix) or disable caching for list endpoints until a performant prefix eviction strategy is in place.

-   **Protection list cache goes stale for the same reason**  
    **Location:** `src/client/ProtectionClient.ts:21-35`, `94-95`  
    **Issue:** `list()` caches under `protection:list:{...}` but mutating calls wipe only `protection:list`, so every filtered list keeps returning the pre-mutation snapshot.  
    **Impact:** Users think protections were added/removed but subsequent fetches disagree; automation relying on `list()` operates on obsolete state.  
    **Recommendation:** Mirror the snapshot fix—either nuke every `protection:list:` entry on mutation or stop caching lists until a proper namespace-aware cache is available.

-   **Dedup cache never drops deleted snapshot hashes**  
    **Location:** `src/snapshot/SnapshotManager.ts:115-126`, `src/snapshot/SnapshotDeduplication.ts:44-47`, `107-108`  
    **Issue:** When a snapshot is deleted, we drop it from storage but keep its hash→id mapping in the in-memory LRU. The next attempt to snapshot identical content hits the cached id and throws “Duplicate snapshot detected”, even though the referenced row no longer exists.  
    **Impact:** Deduplication becomes a one-way door: once a snapshot is removed, the user can never recreate it while the process stays warm. That is a hard functional regression for any workflow that prunes old checkpoints.  
    **Recommendation:** Provide an eviction path (e.g. `deduplication.clear(hash|id)`) and call it on delete, or at least confirm the cached id still exists before rejecting the write.

## Medium Severity / ROI

-   **Date filters serialise to non-portable strings**  
    **Location:** `src/client/SnapshotClient.ts:45-53`  
    **Issue:** We copy `Date` objects straight into `searchParams`. `ky` converts them with `String(date)`, yielding locale-specific strings (`"Wed Sep 11 2024 10:15:00 GMT-0700"`). The HTTP API documented in contracts expects ISO or epoch values, so backends parsing ISO/epoch fail to recognise the filters.  
    **Impact:** Server-side filtering by `before`/`after` silently breaks, forcing callers to fetch unbounded lists and filter client-side.  
    **Recommendation:** Serialise deterministically (`date.toISOString()` or `date.getTime()`) before attaching to `searchParams`.

-   **`validatePath` rejects legitimate filenames**  
    **Location:** `src/utils/security.ts:33-34`  
    **Issue:** The guard blocks any path whose normalised form contains the substring `".."`. Benign names such as `"config..json"`, `"my..folder/file.ts"`, or hashed filenames with double dots trigger the check even though they do not traverse upward.  
    **Impact:** Users cannot snapshot perfectly safe files, especially those produced by build tooling that inserts double dots, leading to surprising 400s.  
    **Recommendation:** Inspect path segments instead (e.g. `normalized.split(path.sep).some(seg === "..")`) so only actual parent directory hops are rejected.

-   **`cache: false` still leaves caching enabled**  
    **Location:** `src/client/SnapbackClient.ts:39-40`  
    **Issue:** When callers opt out of caching, we instantiate `QuickLRU` with `maxSize: 1`. The sub-clients continue to populate/read the cache, meaning one entry per namespace survives and the opt-out is honoured neither for correctness (stale reads) nor for privacy.  
    **Impact:** Developers relying on fresh reads (or avoiding in-process state for compliance) still see cached responses, compounded by the invalidation bugs above.  
    **Recommendation:** If `cache === false`, inject a no-op adapter (or skip calling `.set/.get`) rather than allocating a size-1 `QuickLRU`.
