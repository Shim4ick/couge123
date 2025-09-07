"use client"

import { useState, useEffect, useMemo } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Badge, BadgeContainer, type BadgeType } from "./Badge"
import { extractColors } from "@/utils/colorExtractor"
import StatusIndicator from "./StatusIndicator"
import type { UserStatus as UserStatusType } from "@/types/supabase" // Renamed to avoid conflict
import { Plus, Check, X } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"

interface MiniUserProfileProps {
  isOpen: boolean
  onClose: () => void
  onOpenFullProfile: () => void
  userId: string | undefined
  serverId: number
  position: { x: number; y: number }
  currentUserId: string | null // Added current user ID
}

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified?: boolean
  badges?: BadgeType[]
  banner_url?: string | null
  profile_color_1?: string | null
  profile_color_2?: string | null
  status?: UserStatusType
  online?: boolean
}

interface Role {
  id: number
  name: string
  color: string
  gradient_color?: string | null
  position: number
}

const DEFAULT_COLOR = "#2f3136"

const lightenColor = (color: string, amount: number) => {
  const num = Number.parseInt(color.replace("#", ""), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const interpolateColor = (color1: string, color2: string, factor: number) => {
  const c1 = Number.parseInt(color1.replace("#", ""), 16)
  const c2 = Number.parseInt(color2.replace("#", ""), 16)
  const r1 = (c1 >> 16) & 0xff
  const g1 = (c1 >> 8) & 0xff
  const b1 = c1 & 0xff
  const r2 = (c2 >> 16) & 0xff
  const g2 = (c2 >> 8) & 0xff
  const b2 = c2 & 0xff
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

const getProfileStyle = (color1: string | null, color2: string | null) => {
  if (!color1 && !color2) {
    return {
      background: DEFAULT_COLOR,
      color: "#fff",
      theme: "dark",
      avatarBorderColor: DEFAULT_COLOR,
      hasBorder: false,
      borderColor: DEFAULT_COLOR,
    }
  }
  const bgColor1 = color1 || DEFAULT_COLOR
  const bgColor2 = color2 || bgColor1
  const brightness1 = getBrightness(bgColor1)
  const brightness2 = getBrightness(bgColor2)
  const averageBrightness = (brightness1 + brightness2) / 2
  const isLightTheme = averageBrightness > 128
  const borderColor1 = lightenColor(bgColor1, 40)
  const borderColor2 = lightenColor(bgColor2, 40)
  const avatarPosition = 80 / 280
  const avatarBorderColor = interpolateColor(bgColor1, bgColor2, avatarPosition)
  return {
    background: `linear-gradient(to bottom, ${bgColor1}, ${bgColor2})`,
    color: isLightTheme ? "#000" : "#fff",
    theme: isLightTheme ? "light" : "dark",
    avatarBorderColor: avatarBorderColor,
    hasBorder: true,
    borderColor: `linear-gradient(to bottom, ${borderColor1}, ${borderColor2})`,
  }
}

const getContentBlockStyle = () => {
  return {
    background: "rgba(0, 0, 0, 0.3)",
    color: "rgba(255, 255, 255, 0.9)",
  }
}

function getBrightness(hex: string): number {
  const rgb = Number.parseInt(hex.slice(1), 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  return (r * 299 + g * 587 + b * 114) / 1000
}

export default function MiniUserProfile({
  isOpen,
  onClose,
  onOpenFullProfile,
  userId,
  serverId,
  position,
  currentUserId,
}: MiniUserProfileProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userRoles, setUserRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [bannerColors, setBannerColors] = useState<string[]>([])
  const [serverOwnerId, setServerOwnerId] = useState<string | null>(null)
  const [allServerRoles, setAllServerRoles] = useState<Role[]>([])
  const [isRolePopoverOpen, setIsRolePopoverOpen] = useState(false)
  const [roleSearchQuery, setRoleSearchQuery] = useState("")
  const [roleBeingRemoved, setRoleBeingRemoved] = useState<number | null>(null)

  const supabase = createClientComponentClient()

  // Исправленная логика: только владелец сервера может управлять ролями других пользователей
  const canManageRoles = useMemo(() => {
    // Владелец сервера может управлять ролями всех пользователей
    if (currentUserId === serverOwnerId && !!userId && currentUserId !== null) {
      return true
    }
    // Обычные пользователи НЕ могут управлять своими ролями
    return false
  }, [currentUserId, serverOwnerId, userId])

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true)
      setBannerColors([])
      setUserProfile(null)
      setUserRoles([])
      setAllServerRoles([])
      fetchUserProfileAndServerDetails()
    }
  }, [isOpen, userId, serverId])

  useEffect(() => {
    if (userProfile?.avatar_url && !userProfile.banner_url) {
      extractColors(userProfile.avatar_url)
        .then((colors) => setBannerColors(colors))
        .catch((error) => {
          console.error("Error extracting colors:", error)
          setBannerColors([DEFAULT_COLOR, DEFAULT_COLOR])
        })
    } else if (userProfile?.banner_url) {
      setBannerColors([])
    }
  }, [userProfile?.avatar_url, userProfile?.banner_url])

  const fetchUserProfileAndServerDetails = async () => {
    if (!userId) return
    setIsLoading(true)
    try {
      // Fetch server details (including owner_id and all roles)
      const { data: serverData, error: serverError } = await supabase
        .from("servers")
        .select("owner_id")
        .eq("id", serverId)
        .single()
      if (serverError) throw serverError
      setServerOwnerId(serverData.owner_id)

      const { data: allRolesData, error: allRolesError } = await supabase
        .from("server_roles")
        .select("id, name, color, gradient_color, position")
        .eq("server_id", serverId)
        .order("position", { ascending: false }) // Highest position first
      if (allRolesError) throw allRolesError
      setAllServerRoles(allRolesData || [])

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      if (profileError) throw profileError

      // Fetch user status
      const { data: statusData, error: statusError } = await supabase
        .from("user_status")
        .select("*")
        .eq("user_id", userId)
        .single()
      if (statusError && statusError.code !== "PGRST116") console.error("Error fetching user status:", statusError)

      // Fetch user's current roles on this server
      const { data: roleMemberData, error: roleMemberError } = await supabase
        .from("role_members")
        .select("role:server_roles(id, name, color, gradient_color, position)")
        .eq("user_id", userId)
        .eq("role.server_id", serverId) // Ensure roles are for the current server
      if (roleMemberError) console.error("Error fetching user roles:", roleMemberError)

      const currentRoles = (roleMemberData?.map((rm) => rm.role).filter(Boolean) as Role[]) || []
      currentRoles.sort((a, b) => b.position - a.position) // Sort by position, highest first
      setUserRoles(currentRoles)

      setUserProfile({
        ...profileData,
        status: statusData?.status || "offline",
        online: statusData?.online || false,
      })
    } catch (error) {
      console.error("Error fetching user profile or server details:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRole = async (roleId: number) => {
    if (!userId || !canManageRoles) return
    const hasRole = userRoles.some((r) => r.id === roleId)

    try {
      if (hasRole) {
        setRoleBeingRemoved(roleId)
        // Remove role
        const { error } = await supabase.from("role_members").delete().match({ user_id: userId, role_id: roleId })
        if (error) throw error
        setUserRoles((prevRoles) => prevRoles.filter((r) => r.id !== roleId))
      } else {
        // Add role
        const { error } = await supabase.from("role_members").insert({ user_id: userId, role_id: roleId })
        if (error) throw error
        const roleToAdd = allServerRoles.find((r) => r.id === roleId)
        if (roleToAdd) {
          setUserRoles((prevRoles) => [...prevRoles, roleToAdd].sort((a, b) => b.position - a.position))
        }
      }
    } catch (error) {
      console.error("Error toggling role:", error)
    } finally {
      setRoleBeingRemoved(null)
    }
  }

  const filteredPopoverRoles = useMemo(() => {
    if (!roleSearchQuery) return allServerRoles
    return allServerRoles.filter((role) => role.name.toLowerCase().includes(roleSearchQuery.toLowerCase()))
  }, [allServerRoles, roleSearchQuery])

  const sortBadges = (badges: BadgeType[]) => {
    const badgeOrder: { [key in BadgeType]: number } = { founder: 1, staff: 2, beta: 3 }
    return [...badges].sort((a, b) => (badgeOrder[a] || 4) - (badgeOrder[b] || 4))
  }

  const profileStyle = getProfileStyle(userProfile?.profile_color_1, userProfile?.profile_color_2)
  const contentBlockStyle = getContentBlockStyle()

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[300px] rounded-xl shadow-2xl"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          background: profileStyle.hasBorder && userProfile && !isLoading ? profileStyle.borderColor : "transparent",
          padding: profileStyle.hasBorder && userProfile && !isLoading ? "3px" : "0",
        }}
      >
        <div
          className="w-full overflow-hidden rounded-xl"
          style={{ background: isLoading ? DEFAULT_COLOR : profileStyle.background }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px]">
              <SimpleLoadingSpinner className="w-6 h-6 text-[#5865F2]" />
            </div>
          ) : userProfile ? (
            <>
              <div
                className="h-[80px] relative"
                style={{
                  background: userProfile?.banner_url
                    ? `url(${userProfile.banner_url}) center/cover`
                    : bannerColors.length > 0
                      ? `linear-gradient(to right, ${bannerColors[0]}, ${bannerColors[1]})`
                      : profileStyle.background,
                }}
              />
              <div className="px-4 pb-4">
                <div className="relative -mt-[40px] mb-3">
                  <div
                    className="w-[80px] h-[80px] rounded-full relative inline-block cursor-pointer group"
                    style={{ background: profileStyle.avatarBorderColor, padding: "4px" }}
                    onClick={onOpenFullProfile}
                  >
                    <div className="relative w-full h-full">
                      <img
                        src={userProfile.avatar_url || "/placeholder.svg"}
                        alt={userProfile.display_name}
                        className="w-full h-full rounded-full object-cover transition-all duration-200 group-hover:brightness-75"
                      />
                      {userProfile.status && userProfile.status !== "offline" && (
                        <StatusIndicator
                          status={userProfile.status}
                          size="large"
                          className="absolute -bottom-1 -right-1"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg p-3 mb-3" style={contentBlockStyle}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h2 className="font-semibold text-lg">{userProfile.display_name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm opacity-80">@{userProfile.username}</p>
                    {userProfile.badges && userProfile.badges.length > 0 && (
                      <BadgeContainer>
                        {sortBadges(userProfile.badges).map((badge) => (
                          <Badge key={badge} type={badge} />
                        ))}
                      </BadgeContainer>
                    )}
                  </div>
                </div>

                {(userRoles.length > 0 || canManageRoles) && (
                  <div className="rounded-lg p-3" style={contentBlockStyle}>
                    <h3 className="uppercase text-xs font-semibold mb-2 opacity-80">Roles</h3>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {userRoles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs font-medium border"
                          style={{
                            color: "#fff",
                            borderColor: "rgba(128, 128, 128, 0.4)",
                            background: "rgba(0, 0, 0, 0.15)",
                          }}
                        >
                          <div className="relative group/color">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{
                                background: role.gradient_color
                                  ? `linear-gradient(135deg, ${role.color} 0%, ${role.gradient_color} 100%)`
                                  : role.color,
                              }}
                            />
                            {canManageRoles && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleRole(role.id)
                                }}
                                className="hidden group-hover/color:flex items-center justify-center absolute inset-0 w-2.5 h-2.5 rounded-full transition-all"
                                aria-label={`Remove role ${role.name}`}
                                disabled={roleBeingRemoved === role.id}
                              >
                                {roleBeingRemoved === role.id ? (
                                  <SimpleLoadingSpinner className="w-2 h-2 text-white" />
                                ) : (
                                  <X className="w-2 h-2 text-white drop-shadow-sm" />
                                )}
                              </button>
                            )}
                          </div>
                          <span>{role.name}</span>
                        </div>
                      ))}
                      {canManageRoles && (
                        <DropdownMenu open={isRolePopoverOpen} onOpenChange={setIsRolePopoverOpen}>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg text-xs font-medium border border-[rgba(128,128,128,0.4)] bg-[rgba(0,0,0,0.15)] text-white hover:border-[rgba(255,255,255,0.3)] transition-colors min-h-[21px]"
                              aria-label="Manage roles"
                            >
                              <Plus className="w-3 h-3" />
                              {userRoles.length === 0 && <span>Add role</span>}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-60 bg-[#18191C] border-[#2D2F34] text-[#DCDDDE] shadow-xl rounded-xl"
                            side="right"
                            align="start"
                            sideOffset={5}
                            autoFocus={false}
                          >
                            <div className="p-2">
                              <Input
                                placeholder="Search roles"
                                value={roleSearchQuery}
                                onChange={(e) => setRoleSearchQuery(e.target.value)}
                                className="bg-[#202225] border-none h-8 text-sm placeholder-[#72767D] focus:ring-0"
                                autoFocus
                              />
                            </div>
                            <DropdownMenuSeparator className="bg-[#2D2F34]" />
                            <div className="max-h-48 overflow-y-auto p-1 custom-scrollbar">
                              {filteredPopoverRoles.map((role) => (
                                <DropdownMenuItem
                                  key={role.id}
                                  className="flex items-center justify-between text-sm rounded-lg hover:bg-[#5865F2] hover:text-white focus:bg-[#5865F2] focus:text-white cursor-pointer"
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    handleToggleRole(role.id)
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{
                                        background: role.gradient_color
                                          ? `linear-gradient(135deg, ${role.color} 0%, ${role.gradient_color} 100%)`
                                          : role.color,
                                      }}
                                    />
                                    <span>{role.name}</span>
                                  </div>
                                  {userRoles.some((ur) => ur.id === role.id) && <Check className="w-4 h-4" />}
                                </DropdownMenuItem>
                              ))}
                              {filteredPopoverRoles.length === 0 && (
                                <p className="text-xs text-center p-2 text-[#72767D]">
                                  {roleSearchQuery ? "No roles found" : "No roles to assign"}
                                </p>
                              )}
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-[#B9BBBE]">Failed to load user profile</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
