mod errors;
mod instructions;
mod state;

use anchor_lang::prelude::*;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod wallet_program {
    use super::*;

    pub fn wallet_create(ctx: Context<WalletCreate>, args: WalletCreateArgs) -> Result<()> {
        instructions::wallet_create(ctx, args)
    }
}
