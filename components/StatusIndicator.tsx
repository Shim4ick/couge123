import { cn } from "@/lib/utils"

export type UserStatus = "online" | "idle" | "dnd" | "offline"

interface StatusIndicatorProps {
  status: UserStatus
  size?: "small" | "medium" | "large"
  className?: string
}

export default function StatusIndicator({ status, size = "medium", className }: StatusIndicatorProps) {
  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "idle":
        return "bg-yellow-500"
      case "dnd":
        return "bg-red-500"
      case "offline":
      default:
        return "bg-gray-500"
    }
  }

  const getSizeClass = () => {
    switch (size) {
      case "small":
        return "w-3 h-3 border-[1.5px]"
      case "medium":
        return "w-4 h-4 border-2"
      case "large":
        return "w-5 h-5 border-[2.5px]"
      default:
        return "w-4 h-4 border-2"
    }
  }

  return <div className={cn("rounded-full border-[#2b2d31]", getStatusColor(), getSizeClass(), className)} />
}
