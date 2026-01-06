"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import UserProfileModal from "./UserProfileModal"
import MiniUserProfile from "./MiniUserProfile"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import StatusIndicator from "./StatusIndicator"

interface Role {
  id: number
  name: string
  color: string
  gradient_color?: string | null
  display_separately: boolean
  position: number
}

interface MemberRole {
  user_id: string
  role_id: number
  role: Role
}

interface UserStatus {
  user_id: string
  online: boolean
  status: "online" | "idle" | "dnd" | "offline"
  last_seen: string
}

interface Member {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified?: boolean
  roleColor?: string
  online: boolean
  status: "online" | "idle" | "dnd" | "offline"
}

interface ServerMembersListProps {
  serverId: number
}

export default function ServerMembersList({ serverId }: ServerMembersListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const [miniProfileUser, setMiniProfileUser] = useState<string | null>(null)
  const [miniProfilePosition, setMiniProfilePosition] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState("")
  const [serverOwnerId, setServerOwnerId] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [memberRoles, setMemberRoles] = useState<Record<string, MemberRole[]>>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchMembers()
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [serverId])

  useEffect(() => {
    if (serverId) {
      fetchRolesAndMemberRoles()
    }
  }, [serverId])

  const fetchRolesAndMemberRoles = async () => {
    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("server_roles")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true })

      if (rolesError) throw rolesError

      // Fetch role members
      const { data: roleMembersData, error: roleMembersError } = await supabase
        .from("role_members")
        .select(`
        user_id,
        role_id,
        role:server_roles(*)
      `)
        .in("role_id", rolesData?.map((r) => r.id) || [])

      if (roleMembersError) throw roleMembersError

      setRoles(rolesData || [])

      // Group role members by user_id
      const memberRolesMap: Record<string, MemberRole[]> = {}
      roleMembersData?.forEach((rm) => {
        if (!memberRolesMap[rm.user_id]) {
          memberRolesMap[rm.user_id] = []
        }
        memberRolesMap[rm.user_id].push(rm as MemberRole)
      })

      setMemberRoles(memberRolesMap)
    } catch (error) {
      console.error("Error fetching roles and member roles:", error)
    }
  }

  const fetchMembers = async () => {
    try {
      setIsLoading(true)

      // First fetch the server to get the owner ID
      const { data: serverData, error: serverError } = await supabase
        .from("servers")
        .select("owner_id")
        .eq("id", serverId)
        .single()

      if (serverError) throw serverError
      setServerOwnerId(serverData.owner_id)

      // Fetch server members
      const { data: serverMembers, error: membersError } = await supabase
        .from("server_members")
        .select("user_id")
        .eq("server_id", serverId)

      if (membersError) throw membersError

      if (serverMembers && serverMembers.length > 0) {
        const userIds = serverMembers.map((member) => member.user_id)

        // Fetch profiles for all members
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified")
          .in("id", userIds)

        if (profilesError) throw profilesError

        // Fetch user statuses
        const { data: statuses, error: statusesError } = await supabase
          .from("user_status")
          .select("user_id, online, status, last_seen")
          .in("user_id", userIds)

        if (statusesError) throw statusesError

        // Create a map of user statuses
        const statusMap: Record<string, UserStatus> = {}
        statuses?.forEach((status) => {
          statusMap[status.user_id] = status
        })

        // Combine profiles with status
        const membersWithStatus = profiles.map((profile) => {
          const userStatus = statusMap[profile.id] || {
            user_id: profile.id,
            online: false,
            status: "offline" as const,
            last_seen: new Date().toISOString(),
          }

          return {
            ...profile,
            online: userStatus.online,
            status: userStatus.status,
          }
        })

        setMembers(membersWithStatus)
      } else {
        setMembers([])
      }
    } catch (error) {
      console.error("Error fetching server members:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMemberClick = (userId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const miniProfileWidth = 300
    const miniProfileHeight = 400 // примерная высота мини-профиля

    // Проверяем, помещается ли профиль справа от списка
    const spaceOnRight = window.innerWidth - rect.right
    const spaceOnLeft = rect.left
    const spaceBelow = window.innerHeight - rect.top

    let x = rect.right + 20 // увеличил отступ от края списка
    let y = rect.top // выравниваем верхушку профиля с верхушкой пользователя

    // Если не помещается справа, показываем слева
    if (spaceOnRight < miniProfileWidth && spaceOnLeft > miniProfileWidth) {
      x = rect.left - miniProfileWidth - 20
    }

    // Если не помещается снизу, корректируем позицию по Y
    if (spaceBelow < miniProfileHeight) {
      y = Math.max(10, window.innerHeight - miniProfileHeight - 10)
    }

    setMiniProfilePosition({ x, y })

    // Сначала закрываем текущий профиль, если он открыт
    setMiniProfileUser(null)

    // Затем в следующем тике открываем новый, чтобы обеспечить перерисовку
    setTimeout(() => {
      setMiniProfileUser(userId)
    }, 10)
  }

  const handleOpenFullProfile = () => {
    if (miniProfileUser) {
      setSelectedProfile(miniProfileUser)
      setMiniProfileUser(null)
    }
  }

  // Filter members based on search query
  const filteredMembers = members.filter(
    (member) =>
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="w-60 flex flex-col h-full bg-[#313338]">
        <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] bg-[#313338]" />
        <div className="flex-1 flex items-center justify-center border-l border-[#1e1f22]">
          <SimpleLoadingSpinner />
        </div>
      </div>
    )
  }

  // Group members by role and online status
  const membersByCategory: Record<
    string,
    {
      members: Member[]
      position: number
      displayName: string
    }
  > = {}

  // Add categories for roles that should be displayed separately (only for online users)
  roles
    .filter((role) => role.display_separately)
    .forEach((role) => {
      membersByCategory[role.name.toLowerCase()] = {
        members: [],
        position: role.position,
        displayName: role.name,
      }
    })

  // Add "Online" and "Offline" categories
  membersByCategory["online"] = {
    members: [],
    position: 9000,
    displayName: "Online",
  }

  membersByCategory["offline"] = {
    members: [],
    position: 10000,
    displayName: "Offline",
  }

  // Assign members to their categories and set colors
  filteredMembers.forEach((member) => {
    const userRoles = memberRoles[member.id] || []
    const isOnline = member.online && member.status !== "offline"

    // Set the member's color based on their highest role
    const highestRole = userRoles.sort((a, b) => b.role.position - a.role.position)[0]
    if (highestRole) {
      if (highestRole.role.gradient_color) {
        member.roleColor = `linear-gradient(135deg, ${highestRole.role.color} 0%, ${highestRole.role.gradient_color} 100%)`
      } else {
        member.roleColor = highestRole.role.color
      }
    }

    // If user is offline, they go to the offline category regardless of role
    if (!isOnline) {
      membersByCategory["offline"].members.push(member)
      return
    }

    // For online users, check if they have a role with display_separately=true
    const separateRole = userRoles
      .filter((rm) => rm.role.display_separately)
      .sort((a, b) => b.role.position - a.role.position)[0]

    if (separateRole) {
      const categoryKey = separateRole.role.name.toLowerCase()
      if (membersByCategory[categoryKey]) {
        membersByCategory[categoryKey].members.push(member)
      }
    } else {
      // Regular online members go to the online category
      membersByCategory["online"].members.push(member)
    }
  })

  // Sort categories by position
  const sortedCategories = Object.entries(membersByCategory)
    .sort(([, a], [, b]) => a.position - b.position)
    .filter(([, { members }]) => members.length > 0)

  return (
    <div className="w-60 bg-[#313338] flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] bg-[#313338]">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949BA4]" />
          <Input
            placeholder="Search Members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1E1F22] border-none text-white placeholder-[#949BA4] h-8 text-sm w-full"
          />
        </div>
      </div>

      <div className="flex-1 border-l border-[#1e1f22] p-3 overflow-y-auto">
        {sortedCategories.map(([categoryKey, { members: categoryMembers, displayName }], index) => (
          <div key={categoryKey} className={index > 0 ? "mt-4" : ""}>
            <div className="text-xs font-semibold text-[#949BA4] mb-1 px-2">
              {displayName} — {categoryMembers.length}
            </div>
            {[...categoryMembers]
              .sort((a, b) =>
                a.display_name.localeCompare(b.display_name, undefined, {
                  sensitivity: "base",
                  numeric: true,
                }),
              )
              .map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center py-1 px-2 rounded hover:bg-[#36373d] cursor-pointer ${
                    categoryKey === "offline" ? "opacity-40 hover:opacity-100 transition-opacity" : ""
                  }`}
                  onClick={(e) => handleMemberClick(member.id, e)}
                >
                  <div className="relative mr-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar_url ?? undefined} />
                      <AvatarFallback>{member.display_name[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {categoryKey !== "offline" && member.status !== "offline" && (
                      <StatusIndicator
                        status={member.status}
                        size="medium"
                        className="absolute -bottom-0.5 -right-0.5 border-[3px]"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium flex items-center gap-1">
                      <span
                        style={
                          member.roleColor?.includes("linear-gradient")
                            ? {
                                background: member.roleColor,
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                backgroundClip: "text",
                                display: "inline-block",
                              }
                            : { color: member.roleColor || "white" }
                        }
                      >
                        {member.display_name}
                      </span>
                      {member.id === serverOwnerId && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 267.5 267.5"
                                xmlns="http://www.w3.org/2000/svg"
                                className="ml-1"
                              >
                                <path
                                  d="M256.975,100.34c0.041,0.736-0.013,1.485-0.198,2.229l-16.5,66c-0.832,3.325-3.812,5.663-7.238,5.681l-99,0.5c-0.013,0-0.025,0-0.038,0H35c-3.444,0-6.445-2.346-7.277-5.688l-16.5-66.25c-0.19-0.764-0.245-1.534-0.197-2.289C4.643,98.512,0,92.539,0,85.5c0-8.685,7.065-15.75,15.75-15.75S31.5,76.815,31.5,85.5c0,4.891-2.241,9.267-5.75,12.158l20.658,20.814c5.221,5.261,12.466,8.277,19.878,8.277c8.764,0,17.12-4.162,22.382-11.135l33.95-44.984C119.766,67.78,118,63.842,118,59.5c0-8.685,7.065-15.75,15.75-15.75s15.75,7.065,15.75,15.75c0,4.212-1.672,8.035-4.375,10.864c0.009,0.012,0.02,0.022,0.029,0.035l33.704,45.108c5.26,7.04,13.646,11.243,22.435,11.243c7.48,0,14.514-2.913,19.803-8.203l20.788-20.788C238.301,94.869,236,90.451,236,85.5c0-8.685,7.065-15.75,15.75-15.75s15.75,7.065,15.75,15.75C267.5,92.351,263.095,98.178,256.975,100.34zM238.667,198.25c0-4.142-3.358-7.5-7.5-7.5h-194c-4.142,0-7.5,3.358-7.5,7.5v18c0,4.142,3.358,7.5,7.5,7.5h194c4.142,0,7.5-3.358,7.5-7.5V198.25z"
                                  fill="#DDB00E"
                                />
                              </svg>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="bg-[#1e1f22] text-white border-none">
                              <p>Server Owner</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="text-[#949BA4] text-xs">@{member.username}</div>
                  </div>
                </div>
              ))}
          </div>
        ))}
        {filteredMembers.length === 0 && (
          <div className="text-center py-4 text-[#949BA4] text-sm">
            {searchQuery ? "No members found" : "No members in this server"}
          </div>
        )}
      </div>

      {/* Mini Profile */}
      <MiniUserProfile
        isOpen={!!miniProfileUser}
        onClose={() => setMiniProfileUser(null)}
        onOpenFullProfile={handleOpenFullProfile}
        userId={miniProfileUser || undefined}
        serverId={serverId}
        currentUserId={currentUserId}
        position={miniProfilePosition}
      />

      {/* Full Profile Modal */}
      {selectedProfile && (
        <UserProfileModal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          userId={selectedProfile}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
