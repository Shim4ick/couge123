"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
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
} from "@/components/ui/alert-dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MembersList from "./MembersList"
import RolesTab from "./RolesTab"
import InvitesTab from "./InvitesTab"
import EmojisTab from "./EmojisTab"
import DeleteServerModal from "./DeleteServerModal"

interface ServerSettingsProps {
  isOpen: boolean
  onClose: () => void
  serverId: number
  serverData: {
    name: string
    avatar_url: string | null
  }
  onServerUpdate: (updatedServer: { name: string; avatar_url: string | null }) => void
}

export default function ServerSettings({ isOpen, onClose, serverId, serverData, onServerUpdate }: ServerSettingsProps) {
  const [serverName, setServerName] = useState(serverData.name)
  const [serverAvatar, setServerAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(serverData.avatar_url)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    setServerName(serverData.name)
    setAvatarPreview(serverData.avatar_url)
  }, [serverData])

  useEffect(() => {
    const hasChanges = serverName !== serverData.name || serverAvatar !== null
    setHasUnsavedChanges(hasChanges)
  }, [serverName, serverAvatar, serverData])

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }
      setServerAvatar(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      let avatarUrl = serverData.avatar_url

      if (serverAvatar) {
        const fileExt = serverAvatar.name.split(".").pop()
        const fileName = `${serverId}/${Date.now()}${fileExt ? `.${fileExt}` : ""}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("server-avatars")
          .upload(fileName, serverAvatar, { upsert: true })

        if (uploadError) {
          console.error("Avatar upload error:", uploadError)
          toast({
            title: "Avatar Upload Failed",
            description: "Could not upload the server avatar.",
            variant: "destructive",
          })
        } else if (uploadData) {
          const { data: urlData } = supabase.storage.from("server-avatars").getPublicUrl(uploadData.path)
          avatarUrl = urlData.publicUrl
        }
      }

      const { error } = await supabase
        .from("servers")
        .update({ name: serverName, avatar_url: avatarUrl })
        .eq("id", serverId)

      if (error) throw error

      onServerUpdate({ name: serverName, avatar_url: avatarUrl })
      setServerAvatar(null)
      setHasUnsavedChanges(false)

      toast({
        title: "Success",
        description: "Server settings updated successfully",
      })
    } catch (error) {
      console.error("Error updating server:", error)
      toast({
        title: "Error",
        description: "Failed to update server settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
    } else {
      onClose()
    }
  }

  const handleDiscardChanges = () => {
    setServerName(serverData.name)
    setServerAvatar(null)
    setAvatarPreview(serverData.avatar_url)
    setHasUnsavedChanges(false)
    setShowUnsavedDialog(false)
    onClose()
  }

  const handleDeleteSuccess = () => {
    setIsDeleteModalOpen(false)
    onClose()
    window.location.href = "/"
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 text-[#f2f3f5]">
      <div className="flex h-full">
        {/* Left sidebar */}
        <div className="w-[232px] bg-[#2b2d31] pt-15">
          <div className="px-[10px] pt-[60px]">
            <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] px-2.5 uppercase">
              {serverData.name.length > 20 ? serverData.name.substring(0, 20) + "..." : serverData.name}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-col items-stretch bg-transparent h-auto space-y-0.5 p-0">
                <TabsTrigger
                  value="overview"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white rounded"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="roles"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white rounded"
                >
                  Roles
                </TabsTrigger>
                <TabsTrigger
                  value="emojis"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white rounded"
                >
                  Emoji
                </TabsTrigger>
                <TabsTrigger
                  value="members"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white rounded"
                >
                  Members
                </TabsTrigger>
                <TabsTrigger
                  value="invites"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white rounded"
                >
                  Invites
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="mt-4 pt-4 border-t border-[#3f4147]">
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full px-2.5 py-[6px] text-[16px] text-left text-[#ED4245] hover:bg-[#ED4245]/10 rounded transition-colors"
              >
                Delete Server
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 bg-[#313338] relative flex flex-col">
          <div className="absolute top-0 right-0 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="w-9 h-9 rounded-full hover:bg-[#4E5058] text-[#b5bac1] hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-10 pt-[60px] h-full overflow-y-auto pr-0">
            <div className="max-w-[740px] mr-10">
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <h2 className="text-white text-xl font-semibold">Server Overview</h2>

                  <div className="flex items-start gap-8">
                    {/* Avatar upload */}
                    <div className="flex flex-col items-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-[100px] h-[100px] rounded-full flex items-center justify-center overflow-hidden cursor-pointer group border-2 border-dashed border-[#40444B] bg-[#2F3136] transition-all duration-200 hover:border-[#5865F2] hover:bg-[#36393F]"
                      >
                        {avatarPreview ? (
                          <img
                            src={avatarPreview || "/placeholder.svg"}
                            alt="Server Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#72767D] text-4xl font-bold group-hover:text-[#5865F2] transition-colors">
                            {serverName ? serverName.charAt(0).toUpperCase() : "S"}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      <p className="text-[#B9BBBE] text-sm mt-2">Upload Image</p>
                    </div>

                    {/* Server name */}
                    <div className="flex-1 space-y-2">
                      <label htmlFor="serverName" className="block text-xs font-semibold text-[#B9BBBE] uppercase">
                        Server Name
                      </label>
                      <Input
                        id="serverName"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={isLoading || !hasUnsavedChanges}
                    className={cn(
                      "bg-[#5865F2] hover:bg-[#4752C4] text-white min-w-[120px]",
                      !hasUnsavedChanges && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {isLoading ? <SimpleLoadingSpinner /> : "Save Changes"}
                  </Button>
                </div>
              )}

              {activeTab === "roles" && <RolesTab serverId={serverId} />}

              {activeTab === "emojis" && <EmojisTab serverId={serverId} />}

              {activeTab === "members" && <MembersList serverId={serverId} />}

              {activeTab === "invites" && <InvitesTab serverId={serverId} />}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Server Modal */}
      <DeleteServerModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        serverId={serverId}
        serverName={serverData.name}
        onDeleteSuccess={handleDeleteSuccess}
      />

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="bg-[#313338] border-none text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription className="text-[#B9BBBE]">
              You have unsaved changes. Are you sure you want to leave without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel className="bg-[#4E5058] text-white hover:bg-[#6D6F78] border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-[#ED4245] hover:bg-[#A12D2F] border-none">
              Discard Changes
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
