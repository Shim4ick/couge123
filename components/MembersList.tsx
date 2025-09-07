"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import MemberRow from "./MemberRow"
import UserProfileModal from "./UserProfileModal"

interface Member {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified?: boolean
  joined_at: string
  created_at: string
  role: "owner" | "admin" | "member"
}

interface MembersListProps {
  serverId: number
}

export default function MembersList({ serverId }: MembersListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const { data: serverMembers, error: membersError } = await supabase
        .from("server_members")
        .select("user_id, joined_at")
        .eq("server_id", serverId)

      if (membersError) throw membersError

      const { data: server, error: serverError } = await supabase
        .from("servers")
        .select("owner_id")
        .eq("id", serverId)
        .single()

      if (serverError) throw serverError

      if (serverMembers) {
        const userIds = serverMembers.map((member) => member.user_id)
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified, created_at")
          .in("id", userIds)

        if (profilesError) throw profilesError

        const membersWithDetails = profiles.map((profile) => {
          const memberData = serverMembers.find((member) => member.user_id === profile.id)
          return {
            ...profile,
            joined_at: memberData?.joined_at || "",
            created_at: profile.created_at,
            role: profile.id === server.owner_id ? "owner" : "member",
          }
        })

        setMembers(membersWithDetails)
      }
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKickMember = async (userId: string) => {
    try {
      const { error } = await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", userId)

      if (error) throw error

      setMembers((prev) => prev.filter((member) => member.id !== userId))
    } catch (error) {
      console.error("Error kicking member:", error)
    }
  }

  const handleOpenProfile = (userId: string) => {
    setSelectedProfile(userId)
  }

  const filteredMembers = members.filter(
    (member) =>
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <SimpleLoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949BA4]" />
        <Input
          placeholder="Member Search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-[#1E1F22] border-none text-white placeholder-[#949BA4]"
        />
      </div>
      <div className="space-y-2">
        {filteredMembers.map((member) => (
          <MemberRow key={member.id} member={member} onKick={handleKickMember} onOpenProfile={handleOpenProfile} />
        ))}
      </div>
      <div className="text-[#949BA4] text-sm pt-2">
        {filteredMembers.length} {filteredMembers.length === 1 ? "participant" : "participants"}
      </div>
      {selectedProfile && (
        <UserProfileModal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          userId={selectedProfile}
          currentUserId={null}
        />
      )}
    </div>
  )
}
