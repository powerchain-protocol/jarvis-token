// Copyright (c) PowerChain Foundation
// SPDX-License-Identifier: Apache-2.0

/// Fixed-maximum JARVIS coin for Sui with a module-sealed burn-only TreasuryCap.
///
/// Genesis mints exactly 20,000,000,000 JARVIS once. The TreasuryCap is then
/// sealed inside `BurnAuthority`; this module exposes no post-genesis mint path.
/// The only cap-backed operation is a burn capped at 2% of outstanding supply
/// in each 90-day window. Before production, the package UpgradeCap MUST be
/// destroyed after bytecode/source verification so mint logic cannot be added
/// by a later package upgrade.
module jarvis_sui::jarvis;

use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin, TreasuryCap};
use sui::tx_context::{Self, TxContext};

const DECIMALS: u8 = 6;
const MAXIMUM_WHOLE_SUPPLY: u64 = 20_000_000_000;
const MAXIMUM_BASE_UNITS: u64 = 20_000_000_000_000_000;
const BPS_DENOMINATOR: u64 = 10_000;
const MAX_BURN_BPS_PER_WINDOW: u64 = 200;
const BURN_WINDOW_MS: u64 = 90 * 24 * 60 * 60 * 1_000;

const E_ZERO_BURN: u64 = 1;
const E_BURN_LIMIT: u64 = 2;

public struct JARVIS has drop {}

/// Owns the TreasuryCap without exposing a mint entry point.
/// This object is intentionally not `store`, so arbitrary external wrapping
/// and transfer are unavailable. It is issued once to the package publisher.
public struct BurnAuthority has key {
    id: UID,
    treasury_cap: TreasuryCap<JARVIS>,
    window_index: u64,
    burned_in_window: u64,
}

#[allow(deprecated_usage)]
fun init(witness: JARVIS, ctx: &mut TxContext) {
    let (mut treasury_cap, metadata) = coin::create_currency(
        witness,
        DECIMALS,
        b"JARVIS",
        b"JARVIS",
        b"Fixed-maximum utility and accounting asset for the JARVIS platform.",
        option::none(),
        ctx,
    );

    let complete_supply: Coin<JARVIS> = coin::mint(&mut treasury_cap, MAXIMUM_BASE_UNITS, ctx);
    assert!(coin::total_supply(&treasury_cap) == MAXIMUM_BASE_UNITS);

    let burn_authority = BurnAuthority {
        id: object::new(ctx),
        treasury_cap,
        window_index: 0,
        burned_in_window: 0,
    };

    transfer::public_freeze_object(metadata);
    transfer::transfer(burn_authority, tx_context::sender(ctx));
    transfer::public_transfer(complete_supply, tx_context::sender(ctx));
}

/// Permanently destroys JARVIS. At most 2% of the outstanding supply at the
/// time of each burn may be destroyed across a single 90-day window.
public entry fun burn(
    authority: &mut BurnAuthority,
    to_burn: Coin<JARVIS>,
    clock: &Clock,
) {
    let amount = coin::value(&to_burn);
    assert!(amount > 0, E_ZERO_BURN);

    let current_window = clock::timestamp_ms(clock) / BURN_WINDOW_MS;
    if (authority.window_index != current_window) {
        authority.window_index = current_window;
        authority.burned_in_window = 0;
    };

    let outstanding = coin::total_supply(&authority.treasury_cap);
    let maximum_for_window = (outstanding * MAX_BURN_BPS_PER_WINDOW) / BPS_DENOMINATOR;
    assert!(authority.burned_in_window + amount <= maximum_for_window, E_BURN_LIMIT);

    coin::burn(&mut authority.treasury_cap, to_burn);
    authority.burned_in_window = authority.burned_in_window + amount;
}

public fun total_supply(authority: &BurnAuthority): u64 {
    coin::total_supply(&authority.treasury_cap)
}

public fun burned_in_current_window(authority: &BurnAuthority): u64 {
    authority.burned_in_window
}

public fun decimals(): u8 { DECIMALS }
public fun maximum_whole_supply(): u64 { MAXIMUM_WHOLE_SUPPLY }
public fun maximum_base_units(): u64 { MAXIMUM_BASE_UNITS }
public fun maximum_burn_bps_per_window(): u64 { MAX_BURN_BPS_PER_WINDOW }
public fun burn_window_ms(): u64 { BURN_WINDOW_MS }

#[test]
fun tokenomics_constants_are_consistent() {
    assert!(MAXIMUM_WHOLE_SUPPLY * 1_000_000 == MAXIMUM_BASE_UNITS);
    assert!(DECIMALS == 6);
    assert!(MAX_BURN_BPS_PER_WINDOW == 200);
    assert!(BURN_WINDOW_MS == 7_776_000_000);
}
