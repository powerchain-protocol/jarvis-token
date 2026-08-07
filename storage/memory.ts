import type { CanonicalAsset } from "../common/types.ts";
import { JarvisTokenError } from "../common/errors.ts";
import type { SnapshotQuery, StoredCanonicalAsset, TokenSnapshot, TokenStorage } from "./types.ts";

export class InMemoryTokenStorage implements TokenStorage {
  private stored: StoredCanonicalAsset | null = null;
  private readonly snapshots = new Map<string, TokenSnapshot<unknown>[]>();

  async getCanonicalAsset(): Promise<CanonicalAsset | null> {
    return this.stored ? structuredClone(this.stored.asset) : null;
  }

  async getCanonicalAssetVersioned(): Promise<StoredCanonicalAsset | null> {
    return this.stored ? structuredClone(this.stored) : null;
  }

  async putCanonicalAsset(asset: CanonicalAsset, expectedVersion?: number): Promise<number> {
    const currentVersion = this.stored?.version ?? 0;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new JarvisTokenError("STORAGE_CONFLICT", "Canonical asset version conflict", {
        expectedVersion,
        currentVersion,
      });
    }
    const version = currentVersion + 1;
    this.stored = { version, asset: structuredClone(asset) };
    return version;
  }

  async appendSnapshot<T>(namespace: string, snapshot: TokenSnapshot<T>): Promise<void> {
    if (!namespace.trim()) throw new JarvisTokenError("INVALID_ASSET", "Snapshot namespace is required");
    const current = this.snapshots.get(namespace) ?? [];
    if (current.some((item) => item.id === snapshot.id)) throw new JarvisTokenError("STORAGE_CONFLICT", `Duplicate snapshot id ${snapshot.id}`);
    current.push(structuredClone(snapshot) as TokenSnapshot<unknown>);
    current.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    this.snapshots.set(namespace, current);
  }

  async listSnapshots<T>(query: SnapshotQuery): Promise<readonly TokenSnapshot<T>[]> {
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    const values = (this.snapshots.get(query.namespace) ?? [])
      .filter((item) => !query.before || item.recordedAt < query.before)
      .slice(-limit);
    return structuredClone(values) as TokenSnapshot<T>[];
  }

  async getSnapshot<T>(namespace: string, id: string): Promise<TokenSnapshot<T> | null> {
    const value = (this.snapshots.get(namespace) ?? []).find((item) => item.id === id);
    return value ? structuredClone(value) as TokenSnapshot<T> : null;
  }
}
