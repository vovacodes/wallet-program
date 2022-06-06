use anchor_lang::prelude::*;

#[error_code]
pub enum WalletError {
    #[msg("UID must consist of 6 alphanumerical characters")]
    InvalidUID,
}
