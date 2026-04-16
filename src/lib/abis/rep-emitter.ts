/**
 * Minimal ABI for Project Unity's `RepEmitter` contract.
 *
 * Indexer-side rule: the absolute sum of a giver's counted REP events must stay
 * below their current Aura. The contract itself only filters self-rep, zero
 * amounts, and invalid categories.
 *
 * Category ids:
 *   0 — research
 *   1 — builder
 *   2 — trader
 *   3 — liquidity
 *   4 — governance
 *   5 — community
 */
export const repEmitterAbi = [
  {
    type: "function",
    name: "giveRep",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "category", type: "uint8" },
      { name: "amount", type: "int256" },
    ],
    outputs: [],
  },
] as const
