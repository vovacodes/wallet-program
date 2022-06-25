use crate::constants::WALLET_SEED;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::Instruction as SolanaInstruction;
use anchor_lang::solana_program::program;

use crate::errors::WalletError;
use crate::structs::accounts::Wallet;
use crate::structs::models::Instruction;

#[derive(Accounts)]
pub struct TransactionExecute<'info> {
    /// The `owner` of the `wallet`.
    owner: Signer<'info>,

    /// The wallet PDA to execute the transaction on behalf of.
    #[account(mut, has_one = owner @ WalletError::Unauthorized)]
    wallet: Account<'info, Wallet>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Eq, PartialEq, Clone)]
pub struct TransactionExecuteArgs {
    /// The instructions to be executed as a transaction.
    pub instructions: Vec<Instruction>,
}

pub fn transaction_execute(
    ctx: Context<TransactionExecute>,
    args: TransactionExecuteArgs,
) -> Result<()> {
    let wallet = &ctx.accounts.wallet;

    for ix in args.instructions.into_iter().map(SolanaInstruction::from) {
        let seeds = &[WALLET_SEED, &wallet.uid, &[wallet.bump]];

        program::invoke_signed(&ix, ctx.remaining_accounts, &[seeds])?;
    }

    Ok(())
}
