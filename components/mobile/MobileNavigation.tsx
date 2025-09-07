"use client"

import { Home, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

type MobileNavigationProps = {
  onOpenSettings: () => void
}

export default function MobileNavigation({ onOpenSettings }: MobileNavigationProps) {
  const [activeTab, setActiveTab] = useState<"home" | "settings">("home")
  const router = useRouter()

  const handleTabChange = (tab: "home" | "settings") => {
    setActiveTab(tab)
    if (tab === "settings") {
      onOpenSettings()
    } else {
      router.push("/")
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1e1f22] border-t border-[#2b2d31] h-14 flex items-center justify-around z-50">
      <button
        className={`flex flex-col items-center justify-center w-1/2 h-full ${
          activeTab === "home" ? "text-white" : "text-[#949ba4]"
        }`}
        onClick={() => handleTabChange("home")}
      >
        <Home className="w-6 h-6" />
        <span className="text-xs mt-1">Home</span>
      </button>
      <button
        className={`flex flex-col items-center justify-center w-1/2 h-full ${
          activeTab === "settings" ? "text-white" : "text-[#949ba4]"
        }`}
        onClick={() => handleTabChange("settings")}
      >
        <Settings className="w-6 h-6" />
        <span className="text-xs mt-1">Settings</span>
      </button>
    </div>
  )
}
