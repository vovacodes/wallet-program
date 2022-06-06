import * as assert from "assert";
import anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { WalletProgram } from "../target/types/wallet_program";
import { createUid } from "./utils.js";

const { PublicKey, Keypair } = anchor.web3;
const { utf8: utf8Codec } = anchor.utils.bytes;

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
        [utf8Codec.encode("wallet"), utf8Codec.encode(uid)],
        program.programId
      );

      await program.methods
        .walletCreate({
          uid,
          numGuardians: 6,
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
      assert.equal(utf8Codec.decode(Uint8Array.from(walletData.uid)), uid);

      // owner
      assert.equal(walletData.owner.toString(), owner.publicKey.toString());

      // guardians
      assert.equal(walletData.guardians.length, 6);
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
  });
});
