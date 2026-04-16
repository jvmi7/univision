import {
  createPublicClient,
  createTestClient,
  http,
  type Address,
  type Chain,
  parseEther,
} from "viem"

/**
 * Credits native ETH on a local Anvil node (adds `amount` to the current balance).
 * Uses `anvil_setBalance` — equivalent dev ergonomics to funding from a default dev key.
 */
export async function anvilCreditNativeEth(
  chain: Chain,
  recipient: Address,
  amount = parseEther("10"),
): Promise<void> {
  const transport = http(chain.rpcUrls.default.http[0])
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
