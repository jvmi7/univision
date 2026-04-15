import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

type EnterExperienceButtonProps = {
  className?: string
  label?: string
}

export function EnterExperienceButton({
  className,
  label = "Enter Experience",
}: EnterExperienceButtonProps) {
  return (
    <Button asChild variant="brand" className={className}>
      <Link to="/profile">{label}</Link>
    </Button>
  )
}
