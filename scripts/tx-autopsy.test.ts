// Tx-autopsy unit tests (backlog #13): the failure-diagnosis pure helpers in
// src/lib/tx-explain.ts. No React, no network — every helper under test is
// deterministic. Run: npm run test:tx-autopsy
//
// Why this exists: the failed-tx diagnosis names WHY a transaction reverted
// (out of gas, expired deadline, the contract's own revert reason). A wrong
// diagnosis is worse than none — it sends a user back to retry the same
// losing transaction. These tests pin the evidence rules so that class of
// bug fails loudly here instead of on mainnet.
//
// The tests import the REAL module (not a re-implementation): the alias
// loader (scripts/test-alias-hook.mjs, registered via --import) maps "@/"
// to ./src/ so node type-stripping can load the source directly.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  deadlinePassed,
  describeApproval,
  explainRevertReason,
  extractRevertReason,
  formatPlsCost,
  isOutOfGas,
  isSwapBurn,
  MAX_ALLOWANCE,
  swapCallShape,
} from "../src/lib/tx-explain.ts";

describe("isOutOfGas", () => {
  it("flags gasUsed == gasLimit", () => {
    assert.equal(isOutOfGas(21_000n, 21_000n), true);
  });
  it("does not flag partial gas use", () => {
    assert.equal(isOutOfGas(20_999n, 21_000n), false);
  });
  it("does not flag a zero gas limit (degenerate input)", () => {
    assert.equal(isOutOfGas(0n, 0n), false);
  });
});

describe("deadlinePassed", () => {
  it("fires when the block came after the deadline", () => {
    assert.equal(deadlinePassed(1_000n, 1_001n), true);
  });
  it("stays quiet when the block beat the deadline", () => {
    assert.equal(deadlinePassed(1_000n, 999n), false);
  });
  it("stays quiet on exact equality (included in the deadline block)", () => {
    assert.equal(deadlinePassed(1_000n, 1_000n), false);
  });
});

describe("formatPlsCost", () => {
  it("prices 21k gas at 1 gwei as 0.000021 PLS", () => {
    assert.equal(formatPlsCost(21_000n, 1_000_000_000n), "0.000021 PLS");
  });
  it("prices a heavy failed swap sanely", () => {
    // 500k gas at 50 gwei = 0.025 PLS
    assert.equal(formatPlsCost(500_000n, 50_000_000_000n), "0.025 PLS");
  });
});

describe("extractRevertReason", () => {
  it("decodes ABI-encoded Error(string)", () => {
    // Error("PancakeRouter: EXPIRED") encoded — selector 0x08c379a0.
    const data =
      "0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001650616e63616b65526f757465723a2045585049524544000000000000000000";
    const err = Object.assign(new Error("execution reverted"), { data });
    assert.equal(extractRevertReason(err), "PancakeRouter: EXPIRED");
  });
  it("parses plain-text 'execution reverted: <reason>'", () => {
    const err = new Error("execution reverted: PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT");
    assert.equal(extractRevertReason(err), "PancakeRouter: INSUFFICIENT_OUTPUT_AMOUNT");
  });
  it("parses 'reverted with reason string'", () => {
    const err = new Error(
      "execution reverted with reason string 'TransferHelper: TRANSFER_FROM_FAILED'",
    );
    assert.equal(extractRevertReason(err), "TransferHelper: TRANSFER_FROM_FAILED");
  });
  it("rejects the real viem ExecutionRevertedError shape with a bare code", () => {
    // Live shape seen on PulseChain 2026-10-02: the node summarized the
    // revert as the bare code "01" — not a human reason. Must not surface
    // as if it explained anything (regression: once captured
    // "with reason: 01." as the reason).
    const err = Object.assign(new Error("Execution reverted with reason: 01."), {
      cause: {
        details: "execution reverted: 01",
        shortMessage: "Execution reverted with reason: 01.",
        name: "ExecutionRevertedError",
      },
    });
    assert.equal(extractRevertReason(err), null);
  });
  it("returns null when the node gave no reason", () => {
    assert.equal(extractRevertReason(new Error("execution reverted")), null);
  });
  it("returns null on Hardhat-style 'couldn't infer the reason'", () => {
    const err = new Error("transaction reverted and Hardhat couldn't infer the reason");
    assert.equal(extractRevertReason(err), null);
  });
  it("returns null on non-error junk", () => {
    assert.equal(extractRevertReason(null), null);
    assert.equal(extractRevertReason("totally fine"), null);
  });
});

describe("explainRevertReason", () => {
  it("maps EXPIRED to the deadline story", () => {
    const t = explainRevertReason("PancakeRouter: EXPIRED");
    assert.match(t, /deadline passed/i);
    assert.match(t, /protection working as designed/i);
  });
  it("maps INSUFFICIENT_OUTPUT_AMOUNT to the slippage story, prefix-agnostic", () => {
    const t = explainRevertReason("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
    assert.match(t, /slippage/i);
    assert.match(t, /pre-tax price/i);
  });
  it("maps TRANSFER_FROM_FAILED to the approval story", () => {
    const t = explainRevertReason("TransferHelper: TRANSFER_FROM_FAILED");
    assert.match(t, /approval was too small/i);
  });
  it("shows unknown reasons verbatim instead of guessing", () => {
    const t = explainRevertReason("SomeCustomError: FROBNICATED");
    assert.match(t, /SomeCustomError: FROBNICATED/);
    assert.match(t, /don't have a plain-English mapping/i);
  });
});

describe("swapCallShape", () => {
  const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
  const DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D";

  it("reads deadline (last arg) + trade token (path[0]) for token-in swaps", () => {
    const args = [1_000n, 900n, [DUMB, WPLS], "0xabc", 1_700_000_000n] as const;
    const s = swapCallShape("swapExactTokensForETHSupportingFeeOnTransferTokens", args);
    assert.deepEqual(s, { deadline: 1_700_000_000n, tradeToken: DUMB });
  });
  it("reads trade token as path[last] for PLS-in swaps", () => {
    const args = [900n, [WPLS, DUMB], "0xabc", 1_700_000_000n] as const;
    const s = swapCallShape("swapExactETHForTokensSupportingFeeOnTransferTokens", args);
    assert.deepEqual(s, { deadline: 1_700_000_000n, tradeToken: DUMB });
  });
  it("returns null for unknown functions", () => {
    assert.equal(swapCallShape("transfer", ["0xabc", 1n]), null);
  });
  it("returns null when the deadline arg isn't a bigint", () => {
    const args = [
      1_000n,
      900n,
      [DUMB, WPLS],
      "0xabc",
      "not-a-bigint",
    ] as unknown as readonly unknown[];
    assert.equal(swapCallShape("swapExactTokensForETHSupportingFeeOnTransferTokens", args), null);
  });
});

describe("isSwapBurn", () => {
  const ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9";
  const DEAD = "0x000000000000000000000000000000000000dEaD";
  const DUMB = "0xe65112d2f120c8cb23ADC80D8E8122c0c8b7fF8D";
  const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
  const USER = "0x1111111111111111111111111111111111111111";
  const PLS_FN = "swapExactETHForTokensSupportingFeeOnTransferTokens" as const;
  const ERC20_FN = "swapExactTokensForTokensSupportingFeeOnTransferTokens" as const;

  it("fires on the PLS swap-burn shape (decode + brag-eligible)", () => {
    assert.equal(isSwapBurn(ROUTER, PLS_FN, { path: [WPLS, DUMB], to: DEAD }), true);
  });
  it("fires on the ERC-20 swap-burn shape for decode AND brag", () => {
    // Dumb AI Pro's burn leg uses this exact shape for every non-DUMB payment
    // token — the brag-card endpoint now verifies it too (same gate), so the
    // UI may promise a card for these burns.
    assert.equal(isSwapBurn(ROUTER, ERC20_FN, { path: [WPLS, DUMB], to: DEAD }), true);
  });
  it("ignores mixed-case addresses (the gate lowercases)", () => {
    assert.equal(
      isSwapBurn(ROUTER.toUpperCase(), PLS_FN, {
        path: [WPLS.toUpperCase(), DUMB.toUpperCase()],
        to: DEAD.toUpperCase(),
      }),
      true,
    );
  });
  it("stays quiet when the swap pays a user, not dead", () => {
    assert.equal(isSwapBurn(ROUTER, PLS_FN, { path: [WPLS, DUMB], to: USER }), false);
  });
  it("stays quiet when the path does not end in DUMB", () => {
    assert.equal(isSwapBurn(ROUTER, ERC20_FN, { path: [DUMB, WPLS], to: DEAD }), false);
  });
  it("stays quiet on an empty path", () => {
    assert.equal(isSwapBurn(ROUTER, PLS_FN, { path: [], to: DEAD }), false);
  });
  it("stays quiet when the tx did not target the router", () => {
    assert.equal(isSwapBurn(USER, PLS_FN, { path: [WPLS, DUMB], to: DEAD }), false);
  });
  it("stays quiet with no captured swap args or fn", () => {
    assert.equal(isSwapBurn(ROUTER, PLS_FN, null), false);
    assert.equal(isSwapBurn(ROUTER, null, { path: [WPLS, DUMB], to: DEAD }), false);
  });
});

describe("describeApproval", () => {
  const ROUTER = "0x165C3410fC91EF562C50559f7d2289fEbed552d9";
  it("names a capped approval with a formatted amount", () => {
    const a = describeApproval("DUMB", 18, ROUTER, 1_000_000n * 10n ** 18n);
    assert.equal(a.headline, "Approved 0x165C…52d9 to move up to 1,000,000 DUMB");
    assert.match(a.subline, /No tokens moved in this transaction/);
    assert.equal(a.flags.length, 0);
  });
  it("flags an unlimited allowance as a revoke-advising warning", () => {
    const a = describeApproval("DUMB", 18, ROUTER, MAX_ALLOWANCE);
    assert.equal(a.headline, "Unlimited approval — 0x165C…52d9 can move your DUMB");
    assert.equal(a.flags.length, 1);
    assert.equal(a.flags[0].kind, "warn");
    assert.match(a.flags[0].text, /revoke/i);
  });
  it("reads a zero allowance as a revocation, not an approval", () => {
    const a = describeApproval("DUMB", 18, ROUTER, 0n);
    assert.equal(a.headline, "Approval revoked — 0x165C…52d9 can no longer move DUMB");
    assert.equal(a.flags.length, 0);
  });
  it("formats non-18-decimal tokens (8-decimal HEX)", () => {
    const a = describeApproval("HEX", 8, ROUTER, 500n * 10n ** 8n);
    assert.equal(a.headline, "Approved 0x165C…52d9 to move up to 500 HEX");
    assert.equal(a.flags.length, 0);
  });
});
