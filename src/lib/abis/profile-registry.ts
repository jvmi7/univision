/**
 * Minimal ABI for Project Unity's `ProfileRegistry` contract.
 *
 * Onchain rules:
 *  - Usernames: 1-20 chars, lowercase a-z / 0-9 only, globally unique.
 *  - One registration per wallet. Names are permanent once set.
 *  - Each profile may have at most one linked wallet at a time.
 */
export const profileRegistryAbi = [
  {
    type: "function",
    name: "registerName",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "linkWallet",
    stateMutability: "nonpayable",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unlinkWallet",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "usernameToWallet",
    stateMutability: "view",
    inputs: [{ name: "", type: "string" }],
    outputs: [{ name: "", type: "address" }],
  },
] as const

/** Validates a username against the onchain rules (1-20 chars, [a-z0-9]). */
export function isValidUsername(name: string): boolean {
  if (name.length === 0 || name.length > 20) return false
  for (let i = 0; i < name.length; i++) {
    const code = name.charCodeAt(i)
    const isLower = code >= 97 && code <= 122 // a-z
    const isDigit = code >= 48 && code <= 57 // 0-9
    if (!isLower && !isDigit) return false
  }
  return true
}
