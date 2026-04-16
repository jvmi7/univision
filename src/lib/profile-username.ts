/** ProfileRegistry: lowercase `a-z` and `0-9` only, max length. */
export const PROFILE_USERNAME_MAX_LEN = 20

export function sanitizeProfileUsername(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, PROFILE_USERNAME_MAX_LEN)
}

/** Deterministic default when the user leaves the field blank. */
export function defaultProfileUsernameFromAddress(
  address: `0x${string}`,
): string {
  const hex = address.slice(2, 22).toLowerCase().replace(/[^a-f0-9]/g, "")
  const base = `u${hex}`.slice(0, PROFILE_USERNAME_MAX_LEN)
  return base.length >= 1 ? base : "user"
}
