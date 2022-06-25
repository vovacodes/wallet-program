import * as assert from "assert";
import anchor, { web3 } from "@project-serum/anchor";
import type { Program, AnchorError } from "@project-serum/anchor";
import {
  NATIVE_MINT,
  getAssociatedTokenAddress,
  createSyncNativeInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { WalletProgram } from "../target/types/wallet_program";
import { createUid } from "./utils.js";

const { BN } = anchor;
const { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction } =
  anchor.web3;
const { utf8 } = anchor.utils.bytes;

describe("wallet-program", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.WalletProgram as Program<WalletProgram>;

  describe("wallet_create", () => {
    it("should create new wallet", async () => {
      const owner = new Keypair();
      const uid = createUid();
      const recoveryGracePeriod = new anchor.BN(24 * 60 * 60);

      const [wallet] = await PublicKey.findProgramAddress(
        [utf8.encode("wallet"), utf8.encode(uid)],
        program.programId
      );

      await program.methods
        .walletCreate({
          uid,
          numGuardians: 7,
          recoveryGracePeriod,
        })
        .accounts({
          payer: provider.wallet.publicKey,
          owner: owner.publicKey,
          wallet,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const walletData = await program.account.wallet.fetch(wallet);

      // uid
      assert.equal(utf8.decode(Uint8Array.from(walletData.uid)), uid);

      // owner
      assert.equal(walletData.owner.toString(), owner.publicKey.toString());

      // guardians
      assert.equal(walletData.guardians.length, 7);
      assert.ok(
        walletData.guardians.every(
          (guardian) => guardian.toString() === PublicKey.default.toString()
        )
      );

      // recoveryGracePeriod
      assert.equal(
        walletData.recoveryGracePeriod.toString(),
        recoveryGracePeriod.toString()
      );

      // updatedAt ("just now")
      assert.ok(Date.now() - walletData.updatedAt.toNumber() * 1000 < 2000);
    });

    it("should throw if invalid `uid` is passed", async () => {
      const uid = "INVALID";
      const recoveryGracePeriod = new BN(24 * 60 * 60);

      const [wallet] = await PublicKey.findProgramAddress(
        [utf8.encode("wallet"), utf8.encode(uid)],
        program.programId
      );

      await assert.rejects(
        () =>
          program.methods
            .walletCreate({
              uid,
              numGuardians: 7,
              recoveryGracePeriod,
            })
            .accounts({
              payer: provider.wallet.publicKey,
              owner: new Keypair().publicKey,
              wallet,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc(),
        (err: AnchorError) => {
          assert.match(
            err.message,
            /UID must consist of 6 alphanumerical characters/
          );
          return true;
        }
      );
    });
  });

  describe("transaction_execute", () => {
    it("should execute transaction on behalf of the `wallet`", async () => {
      const owner = new Keypair();
      const uid = createUid();
      const recoveryGracePeriod = new BN(24 * 60 * 60);

      const [wallet] = await PublicKey.findProgramAddress(
        [utf8.encode("wallet"), utf8.encode(uid)],
        program.programId
      );

      await program.methods
        .walletCreate({
          uid,
          numGuardians: 7,
          recoveryGracePeriod,
        })
        .accounts({
          payer: provider.wallet.publicKey,
          owner: owner.publicKey,
          wallet,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Fund the wallet with 1 WSOL.
      const walletWsolAta = await getAssociatedTokenAddress(
        NATIVE_MINT,
        wallet,
        true
      );
      await fundWrappedSol(
        provider,
        walletWsolAta,
        wallet,
        1 * LAMPORTS_PER_SOL
      );
      let wsolTokenAccountData = await getAccount(
        provider.connection,
        walletWsolAta
      );
      assert.equal(wsolTokenAccountData.amount, 1 * LAMPORTS_PER_SOL);

      // Prepare the receiver.
      const receiver = Keypair.generate();
      const receiverWsolAta = await getAssociatedTokenAddress(
        NATIVE_MINT,
        receiver.publicKey
      );
      await provider.sendAndConfirm(
        new Transaction().add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            receiverWsolAta,
            receiver.publicKey,
            NATIVE_MINT
          )
        )
      );
      let receiverWsolTokenAccountData = await getAccount(
        provider.connection,
        receiverWsolAta
      );
      assert.equal(receiverWsolTokenAccountData.amount, 0);

      await program.methods
        .transactionExecute({
          instructions: [
            // transfer WSOL
            createTransferInstruction(
              walletWsolAta,
              receiverWsolAta,
              wallet,
              0.5 * LAMPORTS_PER_SOL
            ),
          ],
        })
        .accounts({ owner: owner.publicKey, wallet })
        // All accounts required by `instructions` are passed here.
        .remainingAccounts([
          { pubkey: wallet, isSigner: false, isWritable: false },
          { pubkey: walletWsolAta, isSigner: false, isWritable: true },
          { pubkey: receiverWsolAta, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ])
        .signers([owner])
        .rpc();

      // Sender (wallet)
      wsolTokenAccountData = await getAccount(
        provider.connection,
        walletWsolAta
      );
      assert.equal(wsolTokenAccountData.amount, 0.5 * LAMPORTS_PER_SOL);

      // Receiver
      receiverWsolTokenAccountData = await getAccount(
        provider.connection,
        receiverWsolAta
      );
      assert.equal(receiverWsolTokenAccountData.amount, 0.5 * LAMPORTS_PER_SOL);
    });
  });
});

async function fundWrappedSol(
  provider: anchor.AnchorProvider,
  wsolAta: web3.PublicKey,
  wsolAtaOwner: web3.PublicKey,
  amount: bigint | number
): Promise<void> {
  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      provider.wallet.publicKey,
      wsolAta,
      wsolAtaOwner,
      NATIVE_MINT
    ),
    // transfer SOL
    SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: wsolAta,
      lamports: amount,
    }),
    // sync wrapped SOL balance
    createSyncNativeInstruction(wsolAta)
  );

  await provider.sendAndConfirm(tx, []);
}
