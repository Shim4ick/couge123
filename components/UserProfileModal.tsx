"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Badge, BadgeContainer, type BadgeType } from "./Badge"
import { extractColors } from "@/utils/colorExtractor"
import FormattedText from "./FormattedText"
import StatusIndicator from "./StatusIndicator"
import type { UserStatus } from "@/types/supabase"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string | undefined
  currentUserId: string | undefined
}

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  bio?: string | null
  is_verified?: boolean
  badges?: BadgeType[]
  created_at: string
  banner_url?: string | null
  profile_color_1?: string | null
  profile_color_2?: string | null
  status?: UserStatus
  online?: boolean
}

// Определяем цвет по умолчанию
const DEFAULT_COLOR = "#2f3136"

// Функция для осветления цвета
const lightenColor = (color: string, amount: number) => {
  const num = Number.parseInt(color.replace("#", ""), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}

// Функция для интерполяции цвета в градиенте
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

// Обновляем функцию для создания стилей профиля
const getProfileStyle = (color1: string | null, color2: string | null) => {
  if (!color1 && !color2) {
    return {
      background: DEFAULT_COLOR,
      color: "#fff",
      theme: "dark",
      avatarBorderColor: DEFAULT_COLOR,
      hasBorder: false,
    }
  }

  const bgColor1 = color1 || DEFAULT_COLOR
  const bgColor2 = color2 || bgColor1

  const brightness1 = getBrightness(bgColor1)
  const brightness2 = getBrightness(bgColor2)
  const averageBrightness = (brightness1 + brightness2) / 2

  const isLightTheme = averageBrightness > 128

  // Осветляем цвета для обводки
  const borderColor1 = lightenColor(bgColor1, 30)
  const borderColor2 = lightenColor(bgColor2, 30)

  // Вычисляем позицию аватара в градиенте для полного профиля
  // Баннер: 120px, аватар центр на -60px + 60px (радиус) = 120px от верха
  // Общая высота контента примерно: баннер 120px + контент ~400px = 520px
  // Позиция центра аватара: 120px / 520px = 0.23 (23% от верха)
  const avatarPosition = 120 / 520 // 0.23
  const avatarBorderColor = interpolateColor(bgColor1, bgColor2, avatarPosition)

  return {
    background: `linear-gradient(to bottom, ${bgColor1}, ${bgColor2})`,
    color: isLightTheme ? "#000" : "#fff",
    theme: isLightTheme ? "light" : "dark",
    avatarBorderColor: avatarBorderColor,
    hasBorder: true,
    borderBackground: `linear-gradient(to bottom, ${borderColor1}, ${borderColor2})`,
  }
}

// Обновляем функцию для создания стилей контентных блоков
const getContentBlockStyle = () => {
  return {
    background: "rgba(0, 0, 0, 0.3)",
    color: "rgba(255, 255, 255, 0.9)", // Делаем текст немного серее
  }
}

export default function UserProfileModal({ isOpen, onClose, userId, currentUserId }: UserProfileModalProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [bannerColors, setBannerColors] = useState<string[]>([])
  const supabase = createClient()
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 200) // 200ms для анимации закрытия
  }

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true)
      setBannerColors([]) // Reset banner colors
      setUserProfile(null) // Reset user profile
      const fetchUserProfile = async () => {
        try {
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

          if (statusError && statusError.code !== "PGRST116") {
            console.error("Error fetching user status:", statusError)
          }

          setUserProfile({
            ...profileData,
            status: statusData?.status || "offline",
            online: statusData?.online || false,
          })
        } catch (error) {
          console.error("Error fetching user profile:", error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchUserProfile()
    }
  }, [isOpen, userId, supabase, onClose])

  useEffect(() => {
    if (userProfile?.avatar_url && !userProfile.banner_url) {
      extractColors(userProfile.avatar_url)
        .then((colors) => {
          setBannerColors(colors)
        })
        .catch((error) => {
          console.error("Error extracting colors:", error)
          setBannerColors([DEFAULT_COLOR, DEFAULT_COLOR]) // Default fallback colors
        })
    } else if (userProfile?.banner_url) {
      setBannerColors([]) // Reset banner colors if there's a banner URL
    }
  }, [userProfile?.avatar_url, userProfile?.banner_url])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const sortBadges = (badges: BadgeType[]) => {
    return badges.sort((a, b) => {
      if (a === "founder") return -1
      if (b === "founder") return 1
      if (a === "staff") return -1
      if (b === "staff") return 1
      return 0
    })
  }

  const profileStyle = getProfileStyle(userProfile?.profile_color_1, userProfile?.profile_color_2)
  const contentBlockStyle = getContentBlockStyle()

  if (!isOpen && !isClosing) return null

  return (
    <Dialog open={isOpen && !isClosing} onOpenChange={handleClose}>
      <DialogContent className="p-0 bg-transparent border-none max-w-[480px] overflow-hidden" hideCloseButton>
        <div
          className="relative w-full overflow-hidden rounded-2xl"
          style={{
            background:
              profileStyle.hasBorder && userProfile && !isLoading ? profileStyle.borderBackground : "transparent",
            padding: profileStyle.hasBorder && userProfile && !isLoading ? "3px" : "0",
          }}
        >
          {/* Main Content */}
          <div
            className="w-full overflow-hidden rounded-2xl shadow-xl relative"
            style={{
              background: isLoading ? DEFAULT_COLOR : profileStyle.background,
            }}
          >
            {/* Banner */}
            <div
              className="h-[120px] relative"
              style={{
                background: isLoading
                  ? DEFAULT_COLOR
                  : userProfile?.banner_url
                    ? `url(${userProfile.banner_url}) center/cover`
                    : bannerColors.length > 0
                      ? `linear-gradient(to right, ${bannerColors[0]}, ${bannerColors[1]})`
                      : profileStyle.background,
              }}
            >
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Profile Info */}
            <div className="px-6 pb-6">
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <SimpleLoadingSpinner />
                </div>
              ) : userProfile ? (
                <>
                  {/* Avatar and Basic Info */}
                  <div className="mb-4">
                    {/* Avatar */}
                    <div className="relative -mt-[60px] mb-3">
                      <div
                        className="w-[120px] h-[120px] rounded-full relative inline-block"
                        style={{
                          background: profileStyle.avatarBorderColor,
                          padding: "6px",
                        }}
                      >
                        <div className="relative w-full h-full">
                          <img
                            src={userProfile.avatar_url || "/placeholder.svg"}
                            alt={userProfile.display_name}
                            className="w-full h-full rounded-full object-cover"
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

                    {/* Basic Info */}
                    <div className="rounded-lg p-4" style={contentBlockStyle}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="font-semibold text-2xl">{userProfile.display_name}</h2>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-base opacity-80">@{userProfile.username}</p>
                            {userProfile.badges && userProfile.badges.length > 0 && (
                              <BadgeContainer>
                                {sortBadges(userProfile.badges).map((badge) => (
                                  <Badge key={badge} type={badge} />
                                ))}
                              </BadgeContainer>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* About */}
                  {userProfile.bio && (
                    <div className="rounded-lg p-4 mb-4" style={contentBlockStyle}>
                      <h3 className="uppercase text-sm font-semibold mb-2 opacity-80">About me</h3>
                      <div className="text-base whitespace-pre-wrap">
                        <FormattedText content={userProfile.bio} />
                      </div>
                    </div>
                  )}

                  {/* Member Since */}
                  <div className="rounded-lg p-4" style={contentBlockStyle}>
                    <h3 className="uppercase text-sm font-semibold mb-2 opacity-80">Couge member since</h3>
                    <p className="text-base">{formatDate(userProfile.created_at)}</p>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[300px]">
                  <p className="text-[#B9BBBE]">Failed to load user profile</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
