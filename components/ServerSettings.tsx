"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { X, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
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
import MembersList from "./MembersList"
import InvitesTab from "./InvitesTab"
import DeleteServerModal from "./DeleteServerModal"
import RolesTab from "./RolesTab"
import EmojisTab from "./EmojisTab"
import { Switch } from "@/components/ui/switch"

interface ServerSettingsProps {
  isOpen: boolean
  onClose: () => void
  serverId: number
  serverData: {
    name: string
    avatar_url: string | null
    banner_url?: string | null
    description?: string | null
    is_private?: boolean
  }
  onServerUpdate: (updatedServer: {
    name: string
    avatar_url: string | null
    banner_url?: string | null
    description?: string | null
    is_private?: boolean
  }) => void
}

type Tab = "Overview" | "Members" | "Invitations" | "Roles" | "Emojis"

export default function ServerSettings({ isOpen, onClose, serverId, serverData, onServerUpdate }: ServerSettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [serverName, setServerName] = useState(serverData.name)
  const [serverDescription, setServerDescription] = useState(serverData.description || "")
  const [isPrivate, setIsPrivate] = useState(serverData.is_private || false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(serverData.avatar_url)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(serverData.banner_url)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isDeleteServerModalOpen, setIsDeleteServerModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()
  const [nameError, setNameError] = useState<string | null>(null)

  // Для отслеживания начальных значений после загрузки из БД
  const [initialServerName, setInitialServerName] = useState(serverData.name)
  const [initialServerDescription, setInitialServerDescription] = useState(serverData.description || "")
  const [initialIsPrivate, setInitialIsPrivate] = useState(serverData.is_private || false)

  // Функция для загрузки данных сервера напрямую из базы данных
  const fetchServerDataDirectly = async () => {
    setIsDataLoading(true)
    try {
      const { data, error } = await supabase.from("servers").select("*").eq("id", serverId).single()

      if (error) {
        if (error.code === "PGRST301" || error.message.includes("permission denied")) {
          toast({
            title: "Error",
            description: "You don't have permission to access this server's settings",
            variant: "destructive",
          })
        }
      } else if (data) {
        // Обновляем состояние компонента данными, полученными напрямую из БД
        setServerName(data.name || serverData.name)
        setServerDescription(data.description || "")
        setIsPrivate(data.is_private || false)
        setAvatarPreview(data.avatar_url || serverData.avatar_url)
        setBannerPreview(data.banner_url || serverData.banner_url)

        // Сохраняем начальные значения для правильного определения несохраненных изменений
        setInitialServerName(data.name || serverData.name)
        setInitialServerDescription(data.description || "")
        setInitialIsPrivate(data.is_private || false)
      }
    } catch (error) {
      // Обработка ошибок
    } finally {
      setIsDataLoading(false)
    }
  }

  // Загружаем данные при открытии модального окна
  useEffect(() => {
    if (serverId && isOpen) {
      fetchServerDataDirectly()
    }
  }, [serverId, isOpen])

  // Обновляем состояние несохраненных изменений
  useEffect(() => {
    // Используем initialValues вместо serverData для сравнения
    const isNameChanged = serverName !== initialServerName
    const isDescriptionChanged = serverDescription !== initialServerDescription
    const isPrivateChanged = isPrivate !== initialIsPrivate
    const isAvatarChanged = avatarFile !== null
    const isBannerChanged = bannerFile !== null

    setHasUnsavedChanges(
      isNameChanged || isDescriptionChanged || isPrivateChanged || isAvatarChanged || isBannerChanged,
    )
  }, [
    serverName,
    serverDescription,
    isPrivate,
    avatarFile,
    bannerFile,
    initialServerName,
    initialServerDescription,
    initialIsPrivate,
  ])

  if (!isOpen) return null

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "The file size should not exceed 5MB",
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

  const handleBannerClick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Error",
            description: "The file size should not exceed 5MB",
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
    input.click()
  }

  const handleSave = async () => {
    // Validate server name
    if (!serverName.trim()) {
      setNameError("Server name cannot be empty")
      return
    }

    setIsLoading(true)

    try {
      let avatarUrl = serverData.avatar_url
      let bannerUrl = serverData.banner_url

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop()
        const fileName = `${serverId}-avatar-${Date.now()}.${fileExt}`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("server-avatars")
          .upload(fileName, avatarFile)

        if (uploadError) throw uploadError
        if (!uploadData) throw new Error("Failed to upload avatar")
        const { data: urlData } = supabase.storage.from("server-avatars").getPublicUrl(uploadData.path)
        avatarUrl = urlData.publicUrl
      }

      if (bannerFile) {
        const fileExt = bannerFile.name.split(".").pop()
        const fileName = `${serverId}-banner-${Date.now()}.${fileExt}`
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("server-banners")
          .upload(fileName, bannerFile)

        if (uploadError) throw uploadError
        if (!uploadData) throw new Error("Failed to upload banner")
        const { data: urlData } = supabase.storage.from("server-banners").getPublicUrl(uploadData.path)
        bannerUrl = urlData.publicUrl
      }

      const { data, error: updateError } = await supabase
        .from("servers")
        .update({
          name: serverName,
          description: serverDescription,
          is_private: isPrivate,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .eq("id", serverId)
        .select("id, name, avatar_url, banner_url, description, is_private")

      if (updateError) {
        if (updateError.code === "PGRST301" || updateError.message.includes("permission denied")) {
          throw new Error("You don't have permission to update this server")
        }
        throw updateError
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from update")
      }

      const updatedServer = data[0]
      onServerUpdate({
        name: updatedServer.name,
        description: updatedServer.description,
        is_private: updatedServer.is_private,
        avatar_url: updatedServer.avatar_url,
        banner_url: updatedServer.banner_url,
      })

      // Обновляем начальные значения после сохранения
      setInitialServerName(updatedServer.name)
      setInitialServerDescription(updatedServer.description || "")
      setInitialIsPrivate(updatedServer.is_private || false)
      setHasUnsavedChanges(false)

      toast({
        title: "Successfully",
        description: "The server settings have been updated",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Couldn't update server settings",
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
    setServerName(initialServerName)
    setServerDescription(initialServerDescription)
    setIsPrivate(initialIsPrivate)
    setAvatarPreview(serverData.avatar_url)
    setAvatarFile(null)
    setBannerPreview(serverData.banner_url)
    setBannerFile(null)
    setHasUnsavedChanges(false)
    onClose()
  }

  const handleServerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setServerName(value)

    // Clear error when user starts typing
    if (nameError) {
      setNameError(null)
    }
  }

  // Функция для обрезания длинных названий серверов
  const truncateServerName = (name: string, maxLength = 20) => {
    return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
  }

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 text-[#f2f3f5]">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-[232px] bg-[#2b2d31] pt-15">
          <div className="px-[10px] pt-[60px]">
            {/* Категория с названием сервера */}
            <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] px-2.5 uppercase">
              {truncateServerName(serverData.name)}
            </div>
            <button
              className={cn(
                "w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors",
                activeTab === "Overview"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white",
              )}
              onClick={() => setActiveTab("Overview")}
            >
              Overview
            </button>

            {/* Сепаратор */}
            <div className="my-2 mx-2.5 border-t border-[#3f4147]"></div>

            {/* Категория REACTIONS */}
            <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] mt-3 px-2.5">REACTIONS</div>

            <button
              className={cn(
                "w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors",
                activeTab === "Emojis"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white",
              )}
              onClick={() => setActiveTab("Emojis")}
            >
              Emojis
            </button>

            {/* Сепаратор */}
            <div className="my-2 mx-2.5 border-t border-[#3f4147]"></div>

            {/* Категория PEOPLE */}
            <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] mt-3 px-2.5">PEOPLE</div>

            <button
              className={cn(
                "w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors",
                activeTab === "Members"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white",
              )}
              onClick={() => setActiveTab("Members")}
            >
              Members
            </button>
            <button
              className={cn(
                "w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors",
                activeTab === "Roles"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white",
              )}
              onClick={() => setActiveTab("Roles")}
            >
              Roles
            </button>
            <button
              className={cn(
                "w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors",
                activeTab === "Invitations"
                  ? "bg-[#404249] text-white"
                  : "text-[#b5bac1] hover:bg-[#35373c] hover:text-white",
              )}
              onClick={() => setActiveTab("Invitations")}
            >
              Invitations
            </button>

            {/* Разделитель и кнопка удаления сервера */}
            <div className="my-2 mx-2.5 border-t border-[#3f4147]"></div>
            <button
              className="w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors text-[#ED4245] hover:bg-[#ED4245] hover:text-white"
              onClick={() => setIsDeleteServerModalOpen(true)}
            >
              Delete the server
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-[#313338] relative overflow-hidden">
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

          <div className="p-10 pt-[60px] max-w-[740px] h-full overflow-y-auto pb-16">
            <h2 className="text-white text-xl font-semibold mb-8">
              {activeTab === "Overview"
                ? "Server Overview"
                : activeTab === "Members"
                  ? "Members"
                  : activeTab === "Invitations"
                    ? "Invitations"
                    : activeTab === "Roles"
                      ? "Roles"
                      : "Emojis"}
            </h2>

            {activeTab === "Overview" ? (
              isDataLoading ? (
                <div className="flex items-center justify-center h-64">
                  <SimpleLoadingSpinner className="w-8 h-8" />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Banner Section */}
                  <div className="space-y-4">
                    <h3 className="text-[#b5bac1] text-xs font-bold uppercase">SERVER BANNER</h3>
                    <div className="relative group cursor-pointer" onClick={handleBannerClick}>
                      <div className="w-full h-[140px] bg-[#1e1f22] rounded-lg overflow-hidden">
                        {bannerPreview ? (
                          <img
                            src={bannerPreview || "/placeholder.svg"}
                            alt="Server Banner"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-[#72767d] text-sm group-hover:text-[#5865F2]">
                              Click to upload banner
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <p className="text-[#b5bac1] text-sm">Recommended size: 960x240. Max file size: 5MB.</p>
                  </div>

                  {/* Server Icon */}
                  <div className="space-y-4">
                    <h3 className="text-[#b5bac1] text-xs font-bold uppercase">SERVER ICON</h3>
                    <div className="flex items-start gap-4">
                      <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                        <div className="w-[100px] h-[100px] rounded-full bg-[#1e1f22] flex items-center justify-center overflow-hidden">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview || "/placeholder.svg"}
                              alt="Server Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[#72767d] text-4xl font-bold group-hover:text-[#5865F2]">
                              {serverName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[#b5bac1] text-sm">
                          It is recommended to use an image with a size of at least 512x512 pixels
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Server Name */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[#b5bac1] text-xs font-bold uppercase">SERVER NAME</h3>
                      {serverName !== initialServerName && (
                        <span className="text-[#b5bac1] text-xs">Unsaved changes</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        value={serverName}
                        onChange={handleServerNameChange}
                        className={cn(
                          "bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]",
                          nameError && "border border-[#ED4245] focus:ring-[#ED4245]",
                        )}
                        maxLength={100}
                      />
                      {nameError && <p className="text-[#ED4245] text-xs">{nameError}</p>}
                    </div>
                  </div>

                  {/* Server Description */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[#b5bac1] text-xs font-bold uppercase">SERVER DESCRIPTION</h3>
                      {serverDescription !== initialServerDescription && (
                        <span className="text-[#b5bac1] text-xs">Unsaved changes</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <textarea
                        value={serverDescription}
                        onChange={(e) => setServerDescription(e.target.value)}
                        className="w-full bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2] rounded px-3 py-2 min-h-[100px] resize-y"
                        placeholder="Describe your server (optional)"
                        maxLength={500}
                      />
                      <p className="text-[#b5bac1] text-xs">{serverDescription.length}/500 characters</p>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-[#3f4147]"></div>

                  {/* Private Server Toggle */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-[#b5bac1] text-xs font-bold uppercase">PRIVATE SERVER</h3>
                      {isPrivate !== initialIsPrivate && (
                        <span className="text-[#b5bac1] text-xs">Unsaved changes</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium text-white">Private Server</div>
                        <p className="text-[#b5bac1] text-sm">
                          Controls whether this server appears in the "Journey" section on the official site.
                        </p>
                      </div>
                      <Switch
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                        className="data-[state=checked]:bg-[#5865F2]"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4">
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
                        "Save changes"
                      )}
                    </Button>
                  </div>
                </div>
              )
            ) : activeTab === "Members" ? (
              <MembersList serverId={serverId} />
            ) : activeTab === "Invitations" ? (
              <InvitesTab serverId={serverId} />
            ) : activeTab === "Roles" ? (
              <RolesTab serverId={serverId} />
            ) : (
              <EmojisTab serverId={serverId} />
            )}
          </div>
        </div>
      </div>

      <DeleteServerModal
        isOpen={isDeleteServerModalOpen}
        onClose={() => setIsDeleteServerModalOpen(false)}
        serverId={serverId}
        serverName={serverData.name}
        onDeleteSuccess={onClose}
      />
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent className="bg-[#313338] border-none text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[#b5bac1]">
              You have unsaved changes. Are you sure you want to close the settings?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#4E5058] text-white hover:bg-[#6D6F78]">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} className="bg-[#ED4245] hover:bg-[#A12D2F]">
              Close without saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
