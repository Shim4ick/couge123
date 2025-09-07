"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Key, Mail, Pencil, X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Database } from "@/types/supabase"
import type { SupabaseClient } from "@supabase/supabase-js"
import { useUser } from "@/components/providers/UserProvider"
import FormattedText from "./FormattedText"
import { Badge, BadgeContainer, type BadgeType } from "./Badge"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { HexColorPicker, HexColorInput } from "react-colorful"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import CustomColorPicker from "./CustomColorPicker"
// Import the default avatar utilities at the top of the file
import { isDefaultAvatar, getRandomDefaultAvatar } from "@/utils/defaultAvatars"

interface UserSettingsProps {
  isOpen: boolean
  onClose: () => void
}

// Update the Tab type to include all the new options
type Tab = "Account" | "Profile" | "Plus" | "Subscriptions" | "Billing" | "Desktop App"

const uploadFile = async (file: File, bucket: string, userId: string, supabase: SupabaseClient<Database>) => {
  const fileExt = file.name.split(".").pop()
  const fileName = `${userId}-${Date.now()}.${fileExt}`
  const { error: uploadError, data: uploadData } = await supabase.storage.from(bucket).upload(fileName, file)
  if (uploadError) throw uploadError
  if (!uploadData) throw new Error(`Failed to upload file to ${bucket}`)
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uploadData.path)
  return urlData.publicUrl
}

const CustomColorPickerComponent = ({
  color,
  onChange,
  label,
}: { color: string; onChange: (color: string) => void; label: string }) => {
  const presetColors = ["#5865F2", "#57F287", "#FEE75C", "#EB459E", "#ED4245", "#ffffff"]

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full border border-white/10" style={{ backgroundColor: color }} />
          <span className="text-sm text-white/80">{color}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 bg-[#2f3136] border-none shadow-xl">
        <HexColorPicker color={color} onChange={onChange} />
        <div className="mt-3 flex items-center gap-2">
          <span className="text-white text-sm">#</span>
          <HexColorInput
            color={color}
            onChange={onChange}
            prefixed={false}
            className="bg-[#1e1f22] border-none text-white p-1 text-sm w-full"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {presetColors.map((presetColor) => (
            <button
              key={presetColor}
              className="w-6 h-6 rounded-full border border-white/10"
              style={{ backgroundColor: presetColor }}
              onClick={() => onChange(presetColor)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default function UserSettings({ isOpen, onClose }: UserSettingsProps) {
  // Update the activeTab initialization to use the first tab
  const [activeTab, setActiveTab] = useState<Tab>("Account")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [initialUsername, setInitialUsername] = useState("")
  const [initialDisplayName, setInitialDisplayName] = useState("")
  const [initialBio, setInitialBio] = useState("")
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [isEmailVisible, setIsEmailVisible] = useState(false)
  const [userPassword, setUserPassword] = useState("••••••••")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)
  const [isBannerUploading, setIsBannerUploading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const supabase = createClientComponentClient()
  const { currentUser } = useUser()
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [registrationDate, setRegistrationDate] = useState<Date | null>(null)
  const [profileColor1, setProfileColor1] = useState<string | null>(null)
  const [profileColor2, setProfileColor2] = useState<string | null>(null)
  const [initialProfileColor1, setInitialProfileColor1] = useState<string | null>(null)
  const [initialProfileColor2, setInitialProfileColor2] = useState<string | null>(null)
  const [originalAvatarUrl, setOriginalAvatarUrl] = useState<string | null>(null)
  const [originalBannerUrl, setOriginalBannerUrl] = useState<string | null>(null)
  const [isAvatarDeleting, setIsAvatarDeleting] = useState(false)
  const [isBannerDeleting, setIsBannerDeleting] = useState(false)
  // Add a state variable to check if we're running in the Electron app
  // Add this after the other useState declarations
  // Add this after the other useState declarations
  const [isElectronApp, setIsElectronApp] = useState(false)
  const [appSettings, setAppSettings] = useState({
    keepInTray: true,
    autoLaunch: true,
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  // Add this useEffect to detect if we're running in Electron and fetch settings
  // Add this after the other useEffect hooks
  // Add this useEffect to detect if we're running in Electron and fetch settings
  // Add this after the other useEffect hooks
  useEffect(() => {
    // Check if we're running in Electron
    const isApp = typeof window !== "undefined" && window.cougeAppAPI?.isApp === true
    setIsElectronApp(isApp)

    // If we're in Electron, get the current settings
    if (isApp) {
      window.cougeAppAPI
        .getSettings()
        .then((settings) => {
          setAppSettings(settings)
        })
        .catch((err) => {
          console.error("Failed to get app settings:", err)
        })
    }
  }, [])

  useEffect(() => {
    // Helper function to compare values including null/undefined
    const isDifferent = (a: any, b: any) => {
      if (a === null && b === null) return false
      if (a === undefined && b === undefined) return false
      if (a === null && b === undefined) return false
      if (a === undefined && b === null) return false
      return a !== b
    }

    const isChanged =
      isDifferent(username, initialUsername) ||
      isDifferent(displayName, initialDisplayName) ||
      isDifferent(bio, initialBio) ||
      avatarFile !== null ||
      bannerFile !== null ||
      (isDifferent(avatarPreview, originalAvatarUrl) && !avatarFile) ||
      (isDifferent(bannerPreview, originalBannerUrl) && !bannerFile) ||
      isDifferent(profileColor1, initialProfileColor1) ||
      isDifferent(profileColor2, initialProfileColor2)

    setHasUnsavedChanges(isChanged)
  }, [
    username,
    displayName,
    bio,
    avatarFile,
    bannerFile,
    initialUsername,
    initialDisplayName,
    initialBio,
    profileColor1,
    profileColor2,
    initialProfileColor1,
    initialProfileColor2,
    avatarPreview,
    bannerPreview,
    originalAvatarUrl,
    originalBannerUrl,
  ])

  const fetchUserProfile = async () => {
    setIsInitialLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        if (error) throw error

        setUsername(data.username || "")
        setEmail(user.email || "")
        setDisplayName(data.display_name || "")
        setBio(data.bio || "")
        setAvatarPreview(data.avatar_url)
        setBannerPreview(data.banner_url)
        setOriginalAvatarUrl(data.avatar_url)
        setOriginalBannerUrl(data.banner_url)
        setBadges(data.badges || [])
        setRegistrationDate(new Date(data.created_at))
        setProfileColor1(data.profile_color_1 || null)
        setProfileColor2(data.profile_color_2 || null)
        setInitialProfileColor1(data.profile_color_1 || null)
        setInitialProfileColor2(data.profile_color_2 || null)

        setInitialUsername(data.username || "")
        setInitialDisplayName(data.display_name || "")
        setInitialBio(data.bio || "")
        setUserPassword("•".repeat(8))
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      toast({
        title: "Error",
        description: "Failed to load user profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsInitialLoading(false)
    }
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  // Replace the existing handleAvatarChange function with this updated version:

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size should not exceed 5MB",
          variant: "destructive",
        })
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Add a new function to handle avatar removal
  const handleRemoveAvatar = () => {
    // Immediately mark as deleting to hide the button
    setIsAvatarDeleting(true)

    // If there's an unsaved uploaded avatar, just revert to original
    if (avatarFile) {
      setAvatarFile(null)
      setAvatarPreview(originalAvatarUrl)
      setIsAvatarDeleting(false)
      return
    }

    // Otherwise, set a random default avatar but don't save to DB yet
    setIsAvatarUploading(true)
    const defaultAvatar = getRandomDefaultAvatar()

    // Simulate loading for a moment
    setTimeout(() => {
      setAvatarPreview(defaultAvatar)
      setIsAvatarUploading(false)
      setHasUnsavedChanges(true)
      // Keep isAvatarDeleting true since we now have a default avatar
    }, 500)
  }

  // Add a new function to handle banner removal
  const handleRemoveBanner = () => {
    // Immediately mark as deleting to hide the button
    setIsBannerDeleting(true)

    // If there's an unsaved uploaded banner, just revert to original
    if (bannerFile) {
      setBannerFile(null)
      setBannerPreview(originalBannerUrl)
      setIsBannerDeleting(false)
      return
    }

    // Otherwise, set banner to null but don't save to DB yet
    setBannerPreview(null)
    setHasUnsavedChanges(true)
    // Keep isBannerDeleting true since we now have no banner
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      let avatarUrl = avatarPreview
      const bannerUrl = bannerPreview

      const uploadPromises = []

      if (avatarFile) {
        setIsAvatarUploading(true)
        const avatarPromise = uploadFile(avatarFile, "avatars", user.id, supabase).then((url) => {
          avatarUrl = url
          setIsAvatarUploading(false)
        })
        uploadPromises.push(avatarPromise)
      } else if (!avatarPreview && !isDefaultAvatar(avatarPreview)) {
        avatarUrl = getRandomDefaultAvatar()
      }

      await Promise.all(uploadPromises)

      const sanitizeUsername = (username: string) => {
        return username.replace(/[*_~`]/g, "")
      }

      const sanitizedUsername = sanitizeUsername(username)
      const finalDisplayName = displayName.trim() === "" || displayName.trim() === username ? "" : displayName.trim()

      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          display_name: finalDisplayName || username,
        },
      })

      if (updateAuthError) throw updateAuthError

      if ((profileColor1 && !profileColor2) || (!profileColor1 && profileColor2)) {
        toast({
          title: "Error",
          description: "You need to set both profile colors or none.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username: sanitizedUsername,
          display_name: finalDisplayName,
          bio,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          profile_color_1: profileColor1,
          profile_color_2: profileColor2,
        })
        .eq("id", user.id)

      if (updateError) throw updateError

      // Update all state variables to match the saved values
      setInitialUsername(sanitizedUsername)
      setInitialDisplayName(finalDisplayName)
      setInitialBio(bio)
      setInitialProfileColor1(profileColor1)
      setInitialProfileColor2(profileColor2)
      setOriginalAvatarUrl(avatarUrl)
      setOriginalBannerUrl(bannerUrl)
      setAvatarFile(null)
      setBannerFile(null)
      setIsAvatarDeleting(false)
      setIsBannerDeleting(false)
      setDisplayName(finalDisplayName)

      // Force hasUnsavedChanges to false after a successful save
      setHasUnsavedChanges(false)

      toast({
        title: "Success",
        description: "User profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating user profile:", error)
      toast({
        title: "Error",
        description: "Failed to update user profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setIsConfirmDialogOpen(true)
    } else {
      onClose()
    }
  }

  const handleConfirmClose = () => {
    setIsConfirmDialogOpen(false)
    fetchUserProfile()
    setHasUnsavedChanges(false)
    setIsAvatarDeleting(false)
    setIsBannerDeleting(false)
    onClose()
  }

  const handleUsernameChange = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ username: newUsername })
        .eq("id", (await supabase.auth.getUser()).data.user?.id)

      if (updateError) throw updateError

      setUsername(newUsername)
      setInitialUsername(newUsername)
      setIsUsernameModalOpen(false)
      setPassword("")
      toast({
        title: "Success",
        description: "Username updated successfully",
      })
    } catch (error) {
      console.error("Error updating username:", error)
      toast({
        title: "Error",
        description: "Failed to update username. Please check your password and try again.",
        variant: "destructive",
      })
    }
  }

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })

      if (error) throw error

      setIsPasswordModalOpen(false)
      toast({
        title: "Success",
        description: "Password updated successfully",
      })
    } catch (error) {
      console.error("Error updating password:", error)
      toast({
        title: "Error",
        description: "Failed to update password. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "File size should not exceed 5MB",
          variant: "destructive",
        })
        return
      }
      setBannerFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setBannerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const maskEmail = (email: string) => {
    if (!email) return ""
    const [localPart, domain] = email.split("@")
    const [domainName, domainExtension] = domain.split(".")
    const maskedLocal = "•".repeat(localPart.length)
    const maskedDomain = "•".repeat(domainName.length)
    const maskedExtension = "•".repeat(domainExtension.length)
    return `${maskedLocal}@${maskedDomain}.${maskedExtension}`
  }

  const maskPassword = (password: string) => {
    return "•".repeat(password.length)
  }

  // Replace the existing tabs declaration with this updated version
  const getTabCategories = (isElectronApp: boolean) => {
    return [
      {
        category: "USER SETTINGS",
        tabs: ["Account", "Profile"],
      },
      {
        category: "BILLING SETTINGS",
        tabs: ["Plus", "Subscriptions", "Billing"],
      },
      ...(isElectronApp
        ? [
            {
              category: "APPLICATION SETTINGS",
              tabs: ["Desktop App"],
            },
          ]
        : []),
    ]
  }

  // Replace the existing tabs array in the component with this
  const tabCategories = getTabCategories(isElectronApp)

  if (!isOpen) return null

  if (isInitialLoading) {
    return (
      <div className="fixed inset-0 bg-[#313338] z-50 flex items-center justify-center">
        <SimpleLoadingSpinner className="w-8 h-8 text-[#5865F2]" />
      </div>
    )
  }

  const sortBadges = (badges: BadgeType[]) => {
    const badgeOrder: { [key in BadgeType]: number } = {
      founder: 1,
      staff: 2,
      beta: 3,
    }

    return [...badges].sort((a, b) => (badgeOrder[a] || 4) - (badgeOrder[b] || 4))
  }

  const resetProfileColors = () => {
    setProfileColor1(null)
    setProfileColor2(null)
  }

  // Function to render tab with special handling for Plus tab
  const renderTab = (tab: Tab) => {
    const isActive = activeTab === tab
    const isPlusTab = tab === "Plus"

    // Special styling for Plus tab when active
    const tabStyle = cn(
      "w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors flex justify-between items-center",
      isPlusTab && isActive
        ? "bg-[#8865F2] text-white" // Purple background when Plus is active
        : isActive
          ? "bg-[#404249] text-white" // Default active style for other tabs
          : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white", // Default inactive style
    )

    return (
      <button key={tab} className={tabStyle} onClick={() => setActiveTab(tab)}>
        <span>{tab}</span>
        {isPlusTab && (
          <img
            src={isActive ? "/images/subscription-icon-white.png" : "/images/subscription-icon-purple.png"}
            alt="Plus subscription"
            className="w-4 h-4"
          />
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 text-[#f2f3f5]">
      {isLoading && <SimpleLoadingSpinner />}
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-[232px] bg-[#2b2d31] pt-15">
          {/* Update the sidebar rendering to use the new categories */}
          {/* Replace the existing sidebar content with this */}
          <div className="px-[10px] pt-[60px]">
            {tabCategories.map((category) => (
              <div key={category.category} className="mb-4">
                <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] px-2.5">{category.category}</div>
                {category.tabs.map((tab) => renderTab(tab))}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-[#313338] relative flex flex-col">
          <div className="absolute top-0 right-0 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseAttempt}
              className="w-9 h-9 rounded-full hover:bg-[#4E5058] text-[#b5bac1] hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-10 pt-[60px] h-full overflow-y-auto pr-0">
            <div className="max-w-[740px] mr-10">
              {activeTab !== "Plus" && <h2 className="text-white text-xl font-semibold mb-8">{activeTab}</h2>}

              {/* Update the tab content rendering to match the new tab names */}
              {/* Replace the existing tab content conditions with these */}
              {activeTab === "Account" && (
                <div className="space-y-8">
                  {/* User Info */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={avatarPreview || undefined} />
                        <AvatarFallback>{(displayName || username)?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{displayName || username}</h3>
                        <p className="text-[#B9BBBE]">@{username}</p>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab("Profile")}
                      className="bg-[#18191C] text-white hover:bg-[#18191C]/90"
                    >
                      Edit User Profile
                    </Button>
                  </div>

                  {/* Username */}
                  <div className="mb-4">
                    <label htmlFor="username" className="block text-xs font-semibold text-[#B9BBBE] uppercase mb-2">
                      Username
                    </label>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b5bac1]">
                        <span className="text-sm">@</span>
                      </div>
                      <Input
                        id="username"
                        value={username}
                        readOnly
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2] pl-10 pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsUsernameModalOpen(true)}
                        className="absolute right-0 top-0 h-full hover:bg-transparent"
                      >
                        <Pencil className="h-4 w-4 text-[#b5bac1] hover:text-white" />
                      </Button>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-xs font-semibold text-[#B9BBBE] uppercase mb-2">
                      Email
                    </label>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b5bac1]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <Input
                        id="email"
                        value={email ? (isEmailVisible ? email : maskEmail(email)) : ""}
                        disabled
                        className="bg-[#1e1f22] border-none text-white pl-10 pr-20"
                      />
                      <Button
                        variant="ghost"
                        className="absolute right-0 top-0 h-full text-[#00a8fc] hover:text-[#00a8fc] hover:bg-transparent text-xs"
                        onClick={() => setIsEmailVisible(!isEmailVisible)}
                      >
                        {isEmailVisible ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label htmlFor="password" className="block text-xs font-semibold text-[#B9BBBE] uppercase mb-2">
                      Password
                    </label>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b5bac1]">
                        <Key className="h-4 w-4" />
                      </div>
                      <Input
                        id="password"
                        type="password"
                        value={maskPassword(userPassword)}
                        readOnly
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2] pl-10 pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="absolute right-0 top-0 h-full hover:bg-transparent"
                      >
                        <Pencil className="h-4 w-4 text-[#b5bac1] hover:text-white" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Profile" && (
                <>
                  <div className="space-y-8">
                    {/* Profile Preview */}
                    <div className="space-y-4">
                      <h3 className="text-[#b5bac1] text-xs font-bold uppercase">PREVIEW</h3>
                      <div
                        className="border border-[#1e1f22] rounded-lg overflow-hidden"
                        style={{ maxWidth: "400px", maxHeight: "400px" }}
                      >
                        <div className="bg-[#232428] text-white overflow-y-auto" style={{ maxHeight: "400px" }}>
                          {/* Banner */}
                          <div
                            className="h-[120px] relative bg-cover bg-center"
                            style={{ backgroundImage: `url(${bannerPreview || "/placeholder.svg"})` }}
                          />

                          {/* Profile Info */}
                          <div className="px-4 pb-4">
                            {/* Avatar */}
                            <div className="relative -mt-[60px] mb-3">
                              <div className="w-[120px] h-[120px] rounded-full border-[8px] border-[#232428] relative inline-block">
                                <Avatar className="w-full h-full">
                                  <AvatarImage src={avatarPreview || undefined} alt={displayName} />
                                  <AvatarFallback>
                                    {(displayName || username)?.charAt(0).toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            </div>

                            {/* Basic Info */}
                            <div className="bg-[#111214] rounded-lg p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h2 className="text-white font-semibold text-2xl">
                                      {displayName || username || "Display Name"}
                                    </h2>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[#B9BBBE] text-base">@{username || "username"}</p>
                                    {badges && badges.length > 0 && (
                                      <BadgeContainer>
                                        {sortBadges(badges).map((badge) => (
                                          <Badge key={badge} type={badge} />
                                        ))}
                                      </BadgeContainer>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* About */}
                            {bio && (
                              <div className="bg-[#111214] rounded-lg p-4 mt-4">
                                <h3 className="text-[#B9BBBE] uppercase text-sm font-semibold mb-2">About me</h3>
                                <div className="text-[#DBDEE1] text-base whitespace-pre-wrap">
                                  <FormattedText content={bio} serverId={0} onProfileClick={() => {}} />
                                </div>
                              </div>
                            )}

                            {/* Member Since */}
                            <div className="bg-[#111214] rounded-lg p-4 mt-4">
                              <h3 className="text-[#B9BBBE] uppercase text-sm font-semibold mb-2">
                                Couge member since
                              </h3>
                              <p className="text-[#DBDEE1] text-base">
                                {registrationDate
                                  ? registrationDate.toLocaleDateString("en-US", {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    })
                                  : "Date not specified"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-[#3f4147] my-8"></div>

                    {/* Avatar and Banner */}
                    <div className="space-y-4">
                      <div className="flex gap-4">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-2">AVATAR</h3>
                          <div
                            className={`relative group ${isAvatarUploading ? "cursor-not-allowed" : "cursor-pointer"}`}
                            onClick={isAvatarUploading ? undefined : handleAvatarClick}
                          >
                            <div className="w-[100px] h-[100px] rounded-full bg-[#1e1f22] flex items-center justify-center overflow-hidden">
                              {avatarPreview ? (
                                <img
                                  src={avatarPreview || "/placeholder.svg"}
                                  alt="User Avatar"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[#72767d] text-4xl font-bold group-hover:text-[#5865F2]">
                                  {displayName && displayName.length > 0 ? displayName.charAt(0).toUpperCase() : "?"}
                                </span>
                              )}
                              {isAvatarUploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                                  <SimpleLoadingSpinner className="w-6 h-6 text-white" />
                                </div>
                              )}
                            </div>
                            {!isAvatarUploading && (
                              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Upload className="w-8 h-8 text-white" />
                              </div>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />

                          {/* Only show remove button if avatar is not a default one and not currently deleting */}
                          {avatarPreview &&
                            !isDefaultAvatar(avatarPreview) &&
                            !isAvatarDeleting &&
                            !isAvatarUploading && (
                              <div className="mt-2">
                                <span
                                  onClick={handleRemoveAvatar}
                                  className="text-[#b5bac1] hover:text-white text-sm cursor-pointer transition-colors"
                                >
                                  Delete Avatar
                                </span>
                              </div>
                            )}
                        </div>

                        {/* Banner */}
                        <div className="flex-grow">
                          <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-2">BANNER</h3>
                          <div
                            className={`relative group ${isBannerUploading ? "cursor-not-allowed" : "cursor-pointer"}`}
                            onClick={isBannerUploading ? undefined : () => bannerFileInputRef.current?.click()}
                          >
                            <div className="w-full h-[100px] bg-[#1e1f22] rounded-lg flex items-center justify-center overflow-hidden">
                              {bannerPreview ? (
                                <img
                                  src={bannerPreview || "/placeholder.svg"}
                                  alt="User Banner"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <span className="text-[#72767d] text-xl font-bold group-hover:text-[#5865F2]">
                                  Click to upload banner
                                </span>
                              )}
                              {isBannerUploading && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                  <SimpleLoadingSpinner className="w-8 h-8 text-white" />
                                </div>
                              )}
                            </div>
                            {!isBannerUploading && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Upload className="w-8 h-8 text-white" />
                              </div>
                            )}
                            <input
                              ref={bannerFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleBannerChange}
                              className="hidden"
                            />
                          </div>
                          {/* Only show remove button if banner exists and not currently deleting */}
                          {bannerPreview && !isBannerDeleting && !isBannerUploading && (
                            <div className="mt-2">
                              <span
                                onClick={handleRemoveBanner}
                                className="text-[#b5bac1] hover:text-white text-sm cursor-pointer transition-colors"
                              >
                                Delete Banner
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                      <label htmlFor="displayName" className="block text-[#b5bac1] text-xs font-bold uppercase">
                        DISPLAY NAME
                      </label>
                      <Input
                        id="displayName"
                        value={displayName !== username ? displayName : ""}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
                        placeholder={username}
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                      <label htmlFor="bio" className="block text-[#b5bac1] text-xs font-bold uppercase">
                        ABOUT ME
                      </label>
                      <Textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2] min-h-[120px]"
                        placeholder="Write something about yourself..."
                      />
                      <div className="text-xs text-[#b5bac1] mt-1 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 32 32"
                          className="w-4 h-4 mr-1 text-[#b5bac1]"
                          fill="currentColor"
                        >
                          <path d="M29.693 25.849h-27.385c-1.271 0-2.307-1.036-2.307-2.307v-15.083c0-1.271 1.036-2.307 2.307-2.307h27.385c1.271 0 2.307 1.036 2.307 2.307v15.078c0 1.276-1.031 2.307-2.307 2.307zM7.693 21.229v-6l3.078 3.849 3.073-3.849v6h3.078v-10.458h-3.078l-3.073 3.849-3.078-3.849h-3.078v10.464zM28.307 16h-3.078v-5.229h-3.073v5.229h-3.078l4.615 5.385z" />
                        </svg>
                        The "About me" field supports Markdown formatting
                      </div>
                    </div>

                    {/* Profile Colors */}
                    <div className="space-y-4">
                      <h3 className="text-[#b5bac1] text-xs font-bold uppercase">PROFILE COLORS</h3>
                      <div className="flex gap-4">
                        <CustomColorPicker color={profileColor1} onChange={setProfileColor1} label="Primary Color" />
                        <CustomColorPicker color={profileColor2} onChange={setProfileColor2} label="Secondary Color" />
                      </div>
                      {(profileColor1 !== null || profileColor2 !== null) && (
                        <button
                          onClick={resetProfileColors}
                          className="text-[#b5bac1] hover:text-white text-sm transition-colors"
                        >
                          Reset profile colors
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-8">
                    <Button
                      onClick={handleSave}
                      disabled={!hasUnsavedChanges || isLoading}
                      className={cn(
                        "bg-[#5865F2] hover:bg-[#4752C4] text-white min-w-[120px]",
                        (!hasUnsavedChanges || isLoading) && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      {isLoading ? (
                        <>
                          <SimpleLoadingSpinner className="w-4 h-4 mr-2" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </>
              )}

              {/* Add the new Billing Settings tabs */}
              {activeTab === "Plus" && (
                <div className="flex flex-col items-center justify-center">
                  {/* Plus Banner with Logo */}
                  <div className="w-full max-w-[700px] mb-8 overflow-hidden rounded-3xl relative">
                    <img
                      src="/images/frame-142-banner.png"
                      alt="Couge Plus Banner"
                      className="w-full h-[200px] object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <img
                        src="/images/couge-plus-logo-white.svg"
                        alt="Couge Plus Logo"
                        className="w-1/2 max-w-[240px]"
                      />
                    </div>
                  </div>

                  {/* Pricing Comparison Section */}
                  <div className="w-full max-w-[700px]">
                    <h2 className="text-2xl font-bold text-white text-center mb-8">Choose the right plan</h2>

                    {/* Pricing Table Container */}
                    <div className="bg-[#2b2d31] rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="grid grid-cols-3 border-b border-[#1e1f22]">
                        {/* Features Column Header */}
                        <div className="p-6 border-r border-[#1e1f22]">
                          <div className="h-16 flex items-center justify-center">
                            <p className="text-white font-medium text-center">Prices and features</p>
                          </div>
                        </div>

                        {/* Basic Plan Header */}
                        <div className="p-6 border-r border-[#1e1f22]">
                          <div className="flex justify-center h-16 items-center">
                            <img
                              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/plus-basic-PDxJbQmWal6mb0o7r1DPUtmMoejNAO.png"
                              alt="Plus Basic"
                              className="h-10"
                            />
                          </div>
                        </div>

                        {/* Full Plan Header */}
                        <div className="p-6 relative rounded-t-lg bg-[#2b2d31]">
                          <div className="flex justify-center h-16 items-center">
                            <img
                              src="https://v0.dev/_next/image?url=https%3A%2F%2Fhebbkx1anhila5yf.public.blob.vercel-storage.com%2Fplus-full-d75PpQw6UIEXeFq2cBXkvgA8BptOYU.png&w=1920&q=75"
                              alt="Plus Full"
                              className="h-10"
                            />
                          </div>
                          {/* Best Value Tag */}
                          <div className="absolute top-0 right-0">
                            <div className="bg-[#8865F2] text-white text-xs font-bold py-1 px-3 rounded-bl-lg">
                              BEST VALUE
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3">
                        {/* Features Column */}
                        <div className="border-r border-[#1e1f22]">
                          {/* Price */}
                          <div className="py-4 px-6 border-b border-[#1e1f22]">
                            <p className="text-white">Price</p>
                          </div>

                          {/* Custom profile colors */}
                          <div className="py-4 px-6 border-b border-[#1e1f22]">
                            <p className="text-white">Custom profile colors</p>
                          </div>

                          {/* Animated profile banner */}
                          <div className="py-4 px-6 border-b border-[#1e1f22]">
                            <p className="text-white">Animated profile banner</p>
                          </div>

                          {/* HD video streaming */}
                          <div className="py-4 px-6">
                            <p className="text-white">HD video streaming</p>
                          </div>
                        </div>

                        {/* Basic Plan Column */}
                        <div className="border-r border-[#1e1f22]">
                          {/* Price */}
                          <div className="py-4 px-6 text-center border-b border-[#1e1f22]">
                            <p className="text-white font-bold">
                              $0.99<span className="text-sm font-normal">/month</span>
                            </p>
                          </div>

                          {/* Custom profile colors */}
                          <div className="py-4 px-6 flex justify-center border-b border-[#1e1f22]">
                            <svg
                              className="w-5 h-5 text-[#5865F2]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          </div>

                          {/* Animated profile banner */}
                          <div className="py-4 px-6 flex justify-center border-b border-[#1e1f22]">
                            <svg
                              className="w-5 h-5 text-[#B9BBBE]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                          </div>

                          {/* HD video streaming */}
                          <div className="py-4 px-6 flex justify-center">
                            <svg
                              className="w-5 h-5 text-[#B9BBBE]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M6 18L18 6M6 6l12 12"
                              ></path>
                            </svg>
                          </div>
                        </div>

                        {/* Full Plan Column */}
                        <div className="relative rounded-lg border-2 border-[#8865F2] bg-[#2b2d31]">
                          {/* Price */}
                          <div className="py-4 px-6 text-center border-b border-[#1e1f22]">
                            <p className="text-white font-bold">
                              $2.99<span className="text-sm font-normal">/month</span>
                            </p>
                          </div>

                          {/* Custom profile colors */}
                          <div className="py-4 px-6 flex justify-center border-b border-[#1e1f22]">
                            <svg
                              className="w-5 h-5 text-[#8865F2]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          </div>

                          {/* Animated profile banner */}
                          <div className="py-4 px-6 flex justify-center border-b border-[#1e1f22]">
                            <svg
                              className="w-5 h-5 text-[#8865F2]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          </div>

                          {/* HD video streaming */}
                          <div className="py-4 px-6 flex justify-center">
                            <svg
                              className="w-5 h-5 text-[#8865F2]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 text-center">
                      <p className="text-[#B9BBBE]">More features coming soon!</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Subscriptions" && (
                <div className="flex flex-col items-center justify-center h-64">
                  <h3 className="text-xl text-white mb-4">Subscriptions</h3>
                  <p className="text-[#B9BBBE] text-center">This feature is currently under development.</p>
                </div>
              )}

              {activeTab === "Billing" && (
                <div className="flex flex-col items-center justify-center h-64">
                  <h3 className="text-xl text-white mb-4">Billing</h3>
                  <p className="text-[#B9BBBE] text-center">This feature is currently under development.</p>
                </div>
              )}

              {/* Rename the App tab to Desktop App and update its content */}
              {activeTab === "Desktop App" && (
                <div className="space-y-8">
                  <h3 className="text-[#b5bac1] text-xs font-bold uppercase">DESKTOP APPLICATION SETTINGS</h3>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="text-white font-medium">Keep application in tray after closing</h4>
                      <p className="text-[#B9BBBE] text-sm">
                        The app will continue running in the background when you close the window
                      </p>
                    </div>
                    <div className="flex items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={appSettings.keepInTray}
                          onChange={(e) => {
                            const newValue = e.target.checked
                            setAppSettings((prev) => ({ ...prev, keepInTray: newValue }))
                            window.cougeAppAPI?.toggleTray(newValue)
                          }}
                        />
                        <div className="w-11 h-6 bg-[#4E5058] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2]"></div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <h4 className="text-white font-medium">Launch on startup</h4>
                      <p className="text-[#B9BBBE] text-sm">
                        Automatically start Couge when you log in to your computer
                      </p>
                    </div>
                    <div className="flex items-center">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={appSettings.autoLaunch}
                          onChange={(e) => {
                            const newValue = e.target.checked
                            setAppSettings((prev) => ({ ...prev, autoLaunch: newValue }))
                            window.cougeAppAPI?.toggleAutoLaunch(newValue)
                          }}
                        />
                        <div className="w-11 h-6 bg-[#4E5058] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5865F2]"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent className="bg-[#313338] border-none text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[#b5bac1]">
              You have unsaved changes. Are you sure you want to close the settings?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#4E5058] text-white hover:bg-[#6D6F78]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} className="bg-[#ED4245] hover:bg-[#A12D2F]">
              Close Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isUsernameModalOpen} onOpenChange={setIsUsernameModalOpen}>
        <DialogContent className="bg-[#313338] text-white border-none">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
            <DialogDescription className="text-[#B9BBBE]">
              Enter your new username and current password to confirm the change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="newUsername" className="text-sm font-medium text-[#B9BBBE]">
                New Username
              </label>
              <Input
                id="newUsername"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[#B9BBBE]">
                Current Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsUsernameModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUsernameChange}>Change Username</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-[#313338] text-white border-none">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription className="text-[#B9BBBE]">
              Enter your current password and a new password to change it
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-medium text-[#B9BBBE]">
                Current Password
              </label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium text-[#B9BBBE]">
                New Password
              </label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="confirmNewPassword" className="text-sm font-medium text-[#B9BBBE]">
                Confirm New Password
              </label>
              <Input
                id="confirmNewPassword"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordChange}>Change Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
