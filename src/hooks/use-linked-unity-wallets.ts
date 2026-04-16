import { useCallback, useMemo } from "react"

/**
 * Placeholder until the onchain “link wallet” contract call exists.
 * `primaryAddress` is reserved for the future flow (e.g. signing / tx from the active wallet).
 */
export function useLinkedUnityWallets(primaryAddress: string | undefined) {
  void primaryAddress

  const linkedWallets = useMemo<string[]>(() => [], [])

  const addLinkedWallet = useCallback((raw: string) => {
    void raw
    throw new Error("Wallet linking is not available yet.")
  }, [])

  const removeLinkedWallet = useCallback((address: string) => {
    void address
  }, [])

  return { linkedWallets, addLinkedWallet, removeLinkedWallet }
}
