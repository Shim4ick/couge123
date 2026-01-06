"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MentionBadgeProps {
  username: string
  serverId: number
  onProfileClick: (userId: string) => void
}

export default function MentionBadge({ username, serverId, onProfileClick }: MentionBadgeProps) {
  const [user, setUser] = useState<any>(null)
  const [isServerMember, setIsServerMember] = useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // First get the user by username without any UUID validation
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("username", username)
          .single()

        if (userError) {
          console.error("Error fetching user:", userError)
          return
        }

        if (userData) {
          // Check if the user is a member of the current server using a simpler query
          const { count, error: memberError } = await supabase
            .from("server_members")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userData.id)
            .eq("server_id", serverId)

          if (memberError) {
            console.error("Error checking server membership:", memberError)
          }

          setUser(userData)
          setIsServerMember(count ? count > 0 : false)
        }
      } catch (error) {
        console.error("Error in fetchUser:", error)
      }
    }

    fetchUser()
  }, [username, serverId, supabase])

  if (!user || !isServerMember) {
    return <span style={{ display: "inline", color: "#5865F2" }}>@{username}</span>
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        verticalAlign: "middle",
      }}
      className="bg-[#5865F2]/20 border border-[#4752C4]/40 rounded-md px-1.5 py-0.5 cursor-pointer transition-colors hover:bg-[#5865F2]/30"
      onClick={() => onProfileClick(user.id)}
    >
      <Avatar className="w-4 h-4 mr-1.5">
        <AvatarImage src={user.avatar_url || undefined} />
        <AvatarFallback>{user.display_name?.[0] || "?"}</AvatarFallback>
      </Avatar>
      <span className="text-[#e0e1e5] font-medium text-xs leading-none">{user.display_name}</span>
    </span>
  )
}
