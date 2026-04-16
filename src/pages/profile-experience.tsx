import { useParams } from "react-router-dom"

import { ProfilePage } from "@/pages/profile-page"

export default function ProfileExperience() {
  const { identifier } = useParams<{ identifier: string }>()

  // `Web3Provider` is hoisted to `main.tsx` so wallet/RainbowKit context is
  // available on every route (leaderboard, home, profile), not just here.
  return <ProfilePage identifier={identifier} />
}
