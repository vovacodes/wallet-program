# Wallet Program

This program implements a social recovery wallet account
that can hold different tokens and sign transactions when the wallet's `owner`
approves them.

## Social Recovery
The wallet's `owner` can be changed by an approval from the `guardians` - 
a set of accounts that can vote to do that.

## Accounts

### `Wallet`
Represents a social recovery wallet.
- `owner: Pubkey` - the owner of the wallet.
- `guardians: Vec<Pubkey>` - the set of accounts that can vote to change the owner.
- `recovery_grace_period: i64` - the grace period (seconds) that has to pass between the approval of a `Recovery`
   and the moment the new `owner` is set. During this period, the recovery request can be cancelled by the existing `owner`.
- `updated_at: i64` - the last time (unix timestamp) the wallet config was updated. All recovery requests
   that were initiated prior to this time are invalid and can only be cancelled.

### `Recovery`
Represents a recovery request.
- `initiator: Pubkey` - the account that paid for initialization of the recovery.
- `new_owner: Pubkey` - the new owner of the wallet.
- `approvals: Vec<bool>` - the approvals, indices in this vector correspond to the indices in the wallet's `guardians` vector.
- `initiated_at: i64` - the time the recovery was initiated.
- `approved_at: i64` - the time the recovery was approved.
- `max_age: i64` - the maximum period of time (seconds) since `initiated_at` after which the request expires.
   `0` means no expiration.

## Instructions

### `wallet_create`
Creates a new `Wallet` account. With an `owner` and `recovery_grace_period` set, but with an empty vector of `guardians`.

Accounts:
- `payer (signer)` - the account paying the transaction and rent fees.
- `owner` - the owner of the wallet.
- `wallet` - wallet PDA with seeds `["wallet", uid]`.
- `system_program` - the system program that is used to create the wallet.

Params:
- `uid: String` - unique identifier for the `wallet`. Must consist of 6 alphanumerical characters.
- `guardians_size: u8` - the size of the `guardians` vector.
  **NOTE:** The bigger the size the higher the account creation fee. This cannot be changed after the wallet creation,
            you can only set the number of `guardians` less than or equals to this number. So choose wisely.
- `recovery_grace_period: i64` - the grace period (seconds) that has to pass between the approval of a `Recovery`
   and the moment the new `owner` is set. During this period, the recovery request can be cancelled by the existing `owner`.

### `guardian_add`
Invites a new `guardian` to the wallet. This instruction is expected to be pre-signed by the `owner` of the wallet
and sent over to the `guardian` that only needs to sign it but pay no costs. So it should be free for the `guardian`.

Accounts:
- `guardian (signer)` - the guardian to be invited to the wallet.

### `guardians_set`
TODO

### `transaction_execute`
Execute a generic transaction on behalf of a `wallet`. Must be signed by the `owner` of the `wallet`.

Accounts:
- `owner` - the owner of the wallet.
- `wallet` - the wallet PDA to be used to execute the transaction.

Remaining accounts:
- Additional signers that are required by the transaction.

Params:
- `instructions: Vec<solana_program::instruction::Instruction>` - the instructions to be executed in the transaction.

### `recovery_initiate`
Initiates a recovery request that later needs to be approved by the `guardians`.
Anyone can create a recovery request, and the only thing that distinguishes requests is their `uid` which needs
to be communicated by the owner to all `guardians` through a safe off-chain channel.

Accounts:
- `payer (signer)` - the account paying the transaction and rent fees.
- `new_owner` - the new owner of the wallet.
- `recovery` - the recovery PDA with seeds `["recovery", uid]`.

Params:
- `max_age: i64` - the maximum period of time (seconds) after which the request expires. 0 means no expiration.

### `recovery_cancel`
Cancels a recovery request, closes the `Recovery` account and returns rent to the `initiator`.
Only the current `owner` of the `Wallet` or one of the `guardians` can cancel a recovery request.

Accounts:
- `recovery` - the recovery PDA to be cancelled.
- `initiator` - the creator of the recovery request. The rent is returned to this account.

### `recovery_approve`
Approves a recovery request. Only `guardians` can approve a recovery request.
If the approval completes the quorum, `recovery.approved_at` is set to `Clock::unix_timestamp()`.
If the wallet config has been updated after the request was initiated, throws an error.
If the recovery is expired, throws an error.

Accounts:
- `guardian (signer)` - the guardian that approves the recovery request.
- `recovery` - the recovery PDA to be approved.

### `recovery_execute`
Executes a recovery request. This can be called by either the `initiator` of the recovery request,
or one of the `guardians`.
After the execution the `recovery` account is closed and the rent is returned to the `initiator`.
If the wallet config has been updated after the request was initiated, throws an error.
If not enough approvals have been received, throws an error.
If the recovery is expired, throws an error.

Accounts:
- `executor (signer)` - the account that executes the recovery request.
- `recovery` - the recovery PDA to be approved.
- `initiator` - the creator of the recovery request. The rent is returned to this account.
