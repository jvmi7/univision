import { ProfilePage } from "@/pages/profile-page"
import { Web3Provider } from "@/providers/web3-provider"

export default function ProfileExperience() {
  return (
    <Web3Provider>
      <ProfilePage />
    </Web3Provider>
  )
}
