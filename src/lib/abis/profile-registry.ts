/**
 * ProfileRegistry from Foundry `out` (copied to repo `abis/out`).
 * Creating a profile is `registerName(string)` — there is no ERC-721-style `mint`.
 */
import registryArtifact from "../../../abis/out/ProfileRegistry.sol/ProfileRegistry.json"

export const profileRegistryAbi = registryArtifact.abi

/** Human-readable: onchain “create profile” entrypoint. */
export const PROFILE_REGISTER_FN = "registerName" as const
