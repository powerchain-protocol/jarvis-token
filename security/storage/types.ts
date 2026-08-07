import type { CanonicalAsset } from "../common/types.ts";

export interface TokenSnapshot<T> {
  id: string;
  recordedAt: string;
  digest: string;
  value: T;
}

export interface StoredCanonicalAsset {
  version: number;
  asset: CanonicalAsset;
}

export interface SnapshotQuery { namespace: string; limit?: number; before?: string; }

export interface TokenStorage {
  getCanonicalAsset(): Promise<CanonicalAsset | null>;
  getCanonicalAssetVersioned(): Promise<StoredCanonicalAsset | null>;
  putCanonicalAsset(asset: CanonicalAsset, expectedVersion?: number): Promise<number>;
  appendSnapshot<T>(namespace: string, snapshot: TokenSnapshot<T>): Promise<void>;
  listSnapshots<T>(query: SnapshotQuery): Promise<readonly TokenSnapshot<T>[]>;
  getSnapshot<T>(namespace: string, id: string): Promise<TokenSnapshot<T> | null>;
}
