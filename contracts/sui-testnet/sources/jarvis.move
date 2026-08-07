// Copyright (c) PowerChain Foundation
// SPDX-License-Identifier: Apache-2.0

/// Fixed-supply JARVIS coin for Sui.
module jarvis_sui::jarvis;

use sui::balance::{Self, Supply};
use sui::coin::{Self, Coin};
use sui::tx_context::{Self, TxContext};

const DECIMALS: u8 = 6;
const MAXIMUM_WHOLE_SUPPLY: u64 = 18_440_000_000;
const MAXIMUM_BASE_UNITS: u64 = 18_440_000_000_000_000;

/// One-time witness for the JARVIS coin type.
public struct JARVIS has drop {}

/// Immutable proof that the original `TreasuryCap` was consumed.
///
/// The enclosed `Supply` cannot be mutably accessed after this object is
/// frozen, so no additional JARVIS can be minted or burned through a cap.
public struct FixedSupply<phantom T> has key, store {
    id: UID,
    supply: Supply<T>,
}

/// Creates metadata, mints the complete supply to the publisher, consumes the
/// `TreasuryCap`, and freezes both metadata and the fixed-supply proof.
#[allow(deprecated_usage)]
fun init(witness: JARVIS, ctx: &mut TxContext) {
    let (mut treasury_cap, metadata) = coin::create_currency(
        witness,
        DECIMALS,
        b"JARVIS",
        b"JARVIS",
        b"Fixed-supply utility and accounting asset for the JARVIS platform.",
        option::none(),
        ctx,
    );

    let complete_supply: Coin<JARVIS> =
        coin::mint(&mut treasury_cap, MAXIMUM_BASE_UNITS, ctx);
    assert!(coin::total_supply(&treasury_cap) == MAXIMUM_BASE_UNITS);

    // This irreversibly deletes the TreasuryCap object and yields its Supply.
    let supply = coin::treasury_into_supply(treasury_cap);
    let fixed_supply = FixedSupply<JARVIS> {
        id: object::new(ctx),
        supply,
    };

    transfer::public_freeze_object(metadata);
    transfer::public_freeze_object(fixed_supply);
    transfer::public_transfer(complete_supply, tx_context::sender(ctx));
}

/// Returns the supply permanently recorded by a fixed-supply proof.
public fun total_supply<T>(fixed_supply: &FixedSupply<T>): u64 {
    balance::supply_value(&fixed_supply.supply)
}

/// Returns the configured decimal precision.
public fun decimals(): u8 {
    DECIMALS
}

/// Returns the maximum supply in base units.
public fun maximum_base_units(): u64 {
    MAXIMUM_BASE_UNITS
}

#[test]
fun tokenomics_constants_are_consistent() {
    assert!(MAXIMUM_WHOLE_SUPPLY * 1_000_000 == MAXIMUM_BASE_UNITS);
    assert!(DECIMALS == 6);
}

