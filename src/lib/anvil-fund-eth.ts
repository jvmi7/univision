import {
  createPublicClient,
  createTestClient,
  http,
  type Address,
  type Chain,
  parseEther,
} from "viem"

/** Same-origin proxy from `vite.config.ts` — avoids browser CORS to `127.0.0.1:8545`. */
export const ANVIL_BROWSER_RPC_PATH = "/anvil-rpc"

function getAnvilJsonRpcHttpUrl(chain: Chain): string {
  const direct = chain.rpcUrls.default.http[0]
  if (typeof window === "undefined") {
    return direct
  }
  const { protocol, host, hostname } = window.location
  const localPage =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".localhost")
  if (localPage) {
    return `${protocol}//${host}${ANVIL_BROWSER_RPC_PATH}`
  }
  return direct
}

/**
 * Credits native ETH on a local Anvil node (adds `amount` to the current balance).
 * Uses `anvil_setBalance` — equivalent dev ergonomics to funding from a default dev key.
 */
export async function anvilCreditNativeEth(
  chain: Chain,
  recipient: Address,
  amount = parseEther("10"),
): Promise<void> {
  const transport = http(getAnvilJsonRpcHttpUrl(chain))
  const publicClient = createPublicClient({ chain, transport })
  const testClient = createTestClient({
    chain,
    mode: "anvil",
    transport,
  })

  const current = await publicClient.getBalance({ address: recipient })
  await testClient.setBalance({
    address: recipient,
    value: current + amount,
  })
}
