/**
 * Minimal ABIs for local contract calls. Adjust to match your deployed bytecode
 * (e.g. rename `faucet`, add overloads, or change `mint` args).
 */

export const fakeUniFaucetAbi = [
  {
    type: "function",
    name: "faucet",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const

/** Typical simple ERC-721 style mint-to-wallet. Replace if your NFT uses `publicMint`, merkle proofs, etc. */
export const localNftMintToAbi = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }],
    outputs: [],
  },
] as const
