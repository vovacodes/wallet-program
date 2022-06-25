use anchor_lang::prelude::*;

use crate::errors::WalletError;
use crate::structs::accounts::Wallet;

#[derive(Accounts)]
pub struct GuardiansSet<'info> {
    /// The `owner` of the `wallet`.
    owner: Signer<'info>,

    // The wallet PDA.
    #[account(mut, has_one = owner @ WalletError::Unauthorized)]
    wallet: Account<'info, Wallet>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Eq, PartialEq, Clone)]
pub struct GuardiansSetArgs {
    guardians: Vec<Pubkey>,
}

pub fn guardians_set(ctx: Context<GuardiansSet>, args: GuardiansSetArgs) -> Result<()> {
    let wallet = &mut ctx.accounts.wallet;

    wallet.guardians = args.guardians;
    wallet.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}
