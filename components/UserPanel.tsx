"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Mic, Headphones, Settings } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type Profile = {
  username: string
  display_name: string
  avatar_url: string | null
  status: string | null
  profile_color_1: string | null
  profile_color_2: string | null
}

export default function UserPanel() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, status, profile_color_1, profile_color_2")
        .eq("id", user.id)
        .single()

      if (error) {
        console.error("Error fetching profile:", error)
      } else {
        setProfile(data)
      }
    }
  }

  if (!profile) return null

  const profileStyle = {
    backgroundColor: profile.profile_color_1 || "#18191c",
    borderColor: profile.profile_color_2 || "transparent",
    color: profile.profile_color_1 ? (getBrightness(profile.profile_color_1) > 128 ? "#000" : "#fff") : "#fff",
  }

  return (
    <div className="bg-[#292b2f] p-2 flex items-center justify-between" style={profileStyle}>
      <div className="flex items-center space-x-2">
        <Avatar
          className="w-8 h-8"
          style={{ borderColor: profile.profile_color_2 || "transparent", borderWidth: "2px" }}
        >
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback>{profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">{profile.display_name}</span>
          <span className="text-xs opacity-70">@{profile.username}</span>
        </div>
      </div>
      <div className="flex space-x-1">
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Mic className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Headphones className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}

// Вспомогательная функция для определения яркости цвета
function getBrightness(hex: string): number {
  const rgb = Number.parseInt(hex.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  return (r * 299 + g * 587 + b * 114) / 1000
}
