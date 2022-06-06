use anchor_lang::prelude::*;

use crate::errors::WalletError;
use crate::state::Wallet;

const WALLET_SEED: &[u8] = b"wallet";

#[derive(Accounts)]
#[instruction(args: WalletCreateArgs)]
pub struct WalletCreate<'info> {
    /// The account paying the rent.
    #[account(mut)]
    payer: Signer<'info>,

    /// The account to be set as the `owner` of the `wallet`.
    /// CHECK: This can be any account, we're not reading or writing to it.
    owner: AccountInfo<'info>,

    /// The `wallet` PDA to initialize.
    #[account(
        init,
        payer = payer,
        seeds = [WALLET_SEED, args.uid.as_bytes()],
        bump,
        space = Wallet::size_of(args.num_guardians)
    )]
    wallet: Account<'info, Wallet>,

    /// Needed for the wallet account initialization.
    system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Eq, PartialEq, Clone)]
pub struct WalletCreateArgs {
    /// Unique identifier for the `wallet`. Must consist of 6 alpha-numerical characters.
    pub uid: String,

    /// Maximum number of `guardians` this wallet can support.
    ///
    /// **NOTE:** The bigger the size, the higher the account rent fee.
    ///           This cannot be changed after the wallet creation,
    ///           you can only set the number of `guardians` smaller than or equals to this number.
    ///           So choose wisely.
    pub num_guardians: u8,

    /// The grace period (seconds) that has to pass between the approval of a `Recovery`
    /// and the moment the new `owner` is set. During this period, the recovery request can
    /// be cancelled by the existing `owner`.
    pub recovery_grace_period: i64,
}

pub fn wallet_create(ctx: Context<WalletCreate>, args: WalletCreateArgs) -> Result<()> {
    let wallet = &mut ctx.accounts.wallet;

    wallet.uid = args
        .uid
        .as_bytes()
        .try_into()
        .map_err(|_| WalletError::InvalidUID)?;
    wallet.owner = ctx.accounts.owner.key();
    wallet.guardians = vec![Pubkey::default(); args.num_guardians as usize];
    wallet.recovery_grace_period = args.recovery_grace_period;
    wallet.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}
