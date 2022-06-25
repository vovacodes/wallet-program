//! This module contains anchor `account` structs used by the program.

use anchor_lang::prelude::*;

#[account]
pub struct Wallet {
    /// The PDA's bump.
    pub bump: u8,

    /// UID of the wallet.
    pub uid: [u8; 6],

    /// The owner of the `wallet`.
    pub owner: Pubkey,

    /// The set of accounts that can vote to change the `owner`.
    pub guardians: Vec<Pubkey>,

    /// The grace period (seconds) that has to pass between the approval of a `Recovery`
    /// and the moment the new `owner` is set. During this period, a recovery request
    /// can be cancelled by the existing `owner`.
    pub recovery_grace_period: i64,

    /// The last time (unix timestamp in seconds) the wallet config was updated.
    /// All recovery requests that were initiated prior to this moment are invalid and can only be cancelled.
    pub updated_at: i64,
}

impl Wallet {
    pub fn size_of(num_guardians: u8) -> usize {
        // account discriminator
        8 +
        // bump
        1 +
        // uid
        6 +
        // owner
        32 +
        // guardians
        4 + num_guardians as usize * 32 +
        // recovery_grace_period
        8 +
        // updated_at
        8
    }
}
