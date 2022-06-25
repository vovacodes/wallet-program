//! This module contains auxiliary structs used by the program.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{
    AccountMeta as SolanaAccountMeta, Instruction as SolanaInstruction,
};

/// This is almost a copy/paste of the `Instruction` struct from the `solana_program` crate.
/// We need it it because the latter doesn't implement `AnchorSerialize` and `AnchorDeserialize`.
/// The only difference between this struct and `solana_program::instruction::Instruction`
/// is the `accounts` field that is called `keys` here to match the client `TransactionInstruction` type.

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Eq, PartialEq, Clone)]
pub struct Instruction {
    /// Pubkey of the program that executes this instruction.
    pub program_id: Pubkey,
    /// Metadata describing accounts that should be passed to the program.
    pub keys: Vec<AccountMeta>,
    /// Opaque data passed to the program for its own interpretation.
    pub data: Vec<u8>,
}

impl From<Instruction> for SolanaInstruction {
    fn from(ix: Instruction) -> Self {
        Self {
            program_id: ix.program_id,
            accounts: ix.keys.into_iter().map(SolanaAccountMeta::from).collect(),
            data: ix.data,
        }
    }
}

/// This is a copy/paste of the `AccountMeta` struct from the `solana_program` crate.
/// We need it it because the latter doesn't implement `AnchorSerialize` and `AnchorDeserialize`.
#[derive(AnchorSerialize, AnchorDeserialize, Debug, Eq, PartialEq, Clone)]
pub struct AccountMeta {
    /// An account's public key.
    pub pubkey: Pubkey,
    /// True if an `Instruction` requires a `Transaction` signature matching `pubkey`.
    pub is_signer: bool,
    /// True if the account data or metadata may be mutated during program execution.
    pub is_writable: bool,
}

impl From<AccountMeta> for SolanaAccountMeta {
    fn from(meta: AccountMeta) -> Self {
        Self {
            pubkey: meta.pubkey,
            is_signer: meta.is_signer,
            is_writable: meta.is_writable,
        }
    }
}
