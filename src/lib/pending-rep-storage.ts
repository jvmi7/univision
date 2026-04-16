import type { RepCategoryName } from "@/lib/profile-api"

/**
 * Optimistic REP increments for recently-submitted `giveRep` txs.
 *
 * The indexer runs on epochs (~2 min locally), so there's a visible lag
 * between a tx confirming and the recipient's totals updating via the API.
 * For demos, we stash each submitted assignment locally and overlay it on
 * top of the API totals until either:
 *
 *   - the API reflects it (`reconcilePendingRepFor` drops reconciled
 *     entries once `api_total ≥ baseline + amount`), or
 *   - the TTL elapses (indexer stuck / event rejected) and we drop it so
 *     the UI doesn't permanently overshoot the true onchain state.
 *
 * Stored in `localStorage` so state survives route changes; a custom event
 * plus the native `storage` event let subscribers re-render when entries
 * are added or reconciled.
 */

const STORAGE_KEY = "unity:pending-rep"
const TTL_MS = 5 * 60 * 1000
const CHANGE_EVENT = "unity-pending-rep-change"

export type PendingRepEntry = {
  /** Lowercased recipient address. */
  targetWallet: string
  category: RepCategoryName
  /** Signed REP amount (positive grants, negative offsets). */
  amount: number
  /** ms-since-epoch submission timestamp. */
  submittedAt: number
  /** API-reported REP in this category at submission time. */
  baseline: number
  txHash?: string
}

function isEntry(value: unknown): value is PendingRepEntry {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return (
    typeof v.targetWallet === "string" &&
    typeof v.category === "string" &&
    typeof v.amount === "number" &&
    typeof v.submittedAt === "number" &&
    typeof v.baseline === "number"
  )
}

function loadAll(): PendingRepEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const now = Date.now()
    return parsed
      .filter(isEntry)
      .filter((entry) => now - entry.submittedAt < TTL_MS)
  } catch {
    return []
  }
}

function saveAll(entries: PendingRepEntry[]) {
  if (typeof window === "undefined") return
  try {
    if (entries.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY)
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    }
  } catch {
    // Quota / privacy mode — non-fatal.
  }
}

function notify() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }
}

export function addPendingRep(
  entry: Omit<PendingRepEntry, "submittedAt">,
): void {
  const next: PendingRepEntry = {
    ...entry,
    targetWallet: entry.targetWallet.toLowerCase(),
    submittedAt: Date.now(),
  }
  saveAll([...loadAll(), next])
  notify()
}

export type PendingRepByCategory = Partial<Record<RepCategoryName, number>>

export function getPendingRepFor(wallet: string | undefined): {
  totals: PendingRepByCategory
  hasPending: boolean
} {
  if (!wallet) return { totals: {}, hasPending: false }
  const lower = wallet.toLowerCase()
  const all = loadAll()
  const totals: PendingRepByCategory = {}
  let hasPending = false
  for (const entry of all) {
    if (entry.targetWallet !== lower) continue
    hasPending = true
    totals[entry.category] = (totals[entry.category] ?? 0) + entry.amount
  }
  return { totals, hasPending }
}

/**
 * Drop pending entries whose corresponding API total has caught up
 * (api ≥ baseline + amount). Call this whenever a profile refetch lands
 * so the optimistic overlay collapses smoothly into the true totals.
 */
export function reconcilePendingRepFor(
  wallet: string | undefined,
  apiRepByCategory: Partial<Record<RepCategoryName, number>>,
): void {
  if (!wallet) return
  const lower = wallet.toLowerCase()
  const all = loadAll()
  const kept = all.filter((entry) => {
    if (entry.targetWallet !== lower) return true
    const current = apiRepByCategory[entry.category] ?? 0
    return current < entry.baseline + entry.amount
  })
  if (kept.length !== all.length) {
    saveAll(kept)
    notify()
  }
}

/** Subscribe to pending-rep changes (same tab + cross-tab via `storage`). */
export function onPendingRepChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener("storage", listener)
  }
}
