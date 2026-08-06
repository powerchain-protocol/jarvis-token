// SPDX-License-Identifier: Apache-2.0

/// Contains the metadata for Blobs on Walrus.
module walrus::metadata;

use std::string::String;
use sui::vec_map::{Self, VecMap};

/// The metadata struct for Blob objects.
public struct Metadata has drop, store {
    metadata: VecMap<String, String>,
}

/// Creates a new empty metadata collection.
public fun new(): Metadata {
    Metadata {
        metadata: vec_map::empty(),
    }
}

/// Inserts a key-value pair, replacing the previous value if the key exists.
public fun insert_or_update(self: &mut Metadata, key: String, value: String) {
    if (self.metadata.contains(&key)) {
        self.metadata.remove(&key);
    };
    self.metadata.insert(key, value);
}

/// Removes and returns the key-value pair associated with `key`.
public fun remove(self: &mut Metadata, key: &String): (String, String) {
    self.metadata.remove(key)
}

/// Removes `key` if it exists and returns its previous value.
public fun remove_if_exists(self: &mut Metadata, key: &String): option::Option<String> {
    if (self.metadata.contains(key)) {
        let (_, value) = self.metadata.remove(key);
        option::some(value)
    } else {
        option::none()
    }
}

/// Returns `true` when a value is stored for `key`.
public fun contains(self: &Metadata, key: &String): bool {
    self.metadata.contains(key)
}

/// Returns the number of metadata entries.
public fun length(self: &Metadata): u64 {
    self.metadata.size()
}
