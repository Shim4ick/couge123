"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X, Check, Pencil } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface CustomEmoji {
  id: number
  name: string
  image_url: string
  created_at: string
  created_by: string | null
  profiles?: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  }
}

interface EmojisTabProps {
  serverId: number
}

export default function EmojisTab({ serverId }: EmojisTabProps) {
  const [emojis, setEmojis] = useState<CustomEmoji[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteEmojiId, setDeleteEmojiId] = useState<number | null>(null)
  const [editingEmojiId, setEditingEmojiId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchEmojis()
  }, [serverId])

  const fetchEmojis = async () => {
    setIsLoading(true)
    try {
      const { data: emojisData, error } = await supabase
        .from("custom_emojis")
        .select("*")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Fetch profile data separately for each emoji
      const emojisWithProfiles = await Promise.all(
        (emojisData || []).map(async (emoji) => {
          if (emoji.created_by) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("id", emoji.created_by)
              .single()

            return {
              ...emoji,
              profiles: profileData,
            }
          }
          return emoji
        }),
      )

      setEmojis(emojisWithProfiles)
    } catch (error) {
      console.error("Error fetching emojis:", error)
      toast({
        title: "Error",
        description: "Failed to load custom emojis",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    if (file.size > 256 * 1024) {
      toast({
        title: "Error",
        description: "Image must be smaller than 256KB",
        variant: "destructive",
      })
      return
    }

    // Get emoji name from filename (without extension)
    const fileName = file.name.split(".")[0]
    const emojiName = fileName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()

    if (emojiName.length < 2 || emojiName.length > 32) {
      toast({
        title: "Error",
        description: "Emoji name must be between 2 and 32 characters",
        variant: "destructive",
      })
      return
    }

    // Check if emoji name already exists
    const existingEmoji = emojis.find((emoji) => emoji.name === emojiName)
    if (existingEmoji) {
      toast({
        title: "Error",
        description: `An emoji with the name "${emojiName}" already exists`,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Upload image to storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${serverId}/${emojiName}.${fileExt}`

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("custom-emojis")
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("custom-emojis").getPublicUrl(fileName)

      // After inserting the emoji, fetch the profile data separately
      const { data: insertedEmoji, error: dbError } = await supabase
        .from("custom_emojis")
        .insert({
          server_id: serverId,
          name: emojiName,
          image_url: publicUrl,
          created_by: user.id,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", user.id)
        .single()

      const emojiWithProfile = {
        ...insertedEmoji,
        profiles: profileData,
      }

      setEmojis((prev) => [emojiWithProfile, ...prev])

      toast({
        title: "Success",
        description: `Emoji :${emojiName}: has been added`,
      })

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error uploading emoji:", error)
      toast({
        title: "Error",
        description: "Failed to upload emoji",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteEmoji = async (emojiId: number) => {
    try {
      const emoji = emojis.find((e) => e.id === emojiId)
      if (!emoji) return

      // Delete from database
      const { error } = await supabase.from("custom_emojis").delete().eq("id", emojiId)

      if (error) throw error

      // Delete from storage
      const fileName = emoji.image_url.split("/").pop()
      if (fileName) {
        await supabase.storage.from("custom-emojis").remove([`${serverId}/${fileName}`])
      }

      setEmojis((prev) => prev.filter((e) => e.id !== emojiId))

      toast({
        title: "Success",
        description: `Emoji :${emoji.name}: has been deleted`,
      })
    } catch (error) {
      console.error("Error deleting emoji:", error)
      toast({
        title: "Error",
        description: "Failed to delete emoji",
        variant: "destructive",
      })
    } finally {
      setDeleteEmojiId(null)
    }
  }

  const handleEditEmoji = async (emojiId: number, newName: string) => {
    try {
      const cleanName = newName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase()

      if (cleanName.length < 2 || cleanName.length > 32) {
        toast({
          title: "Error",
          description: "Emoji name must be between 2 and 32 characters",
          variant: "destructive",
        })
        return
      }

      // Check if emoji name already exists (excluding current emoji)
      const existingEmoji = emojis.find((emoji) => emoji.name === cleanName && emoji.id !== emojiId)
      if (existingEmoji) {
        toast({
          title: "Error",
          description: `An emoji with the name "${cleanName}" already exists`,
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("custom_emojis").update({ name: cleanName }).eq("id", emojiId)

      if (error) throw error

      setEmojis((prev) => prev.map((emoji) => (emoji.id === emojiId ? { ...emoji, name: cleanName } : emoji)))

      toast({
        title: "Success",
        description: `Emoji name updated to :${cleanName}:`,
      })
    } catch (error) {
      console.error("Error updating emoji:", error)
      toast({
        title: "Error",
        description: "Failed to update emoji name",
        variant: "destructive",
      })
    } finally {
      setEditingEmojiId(null)
      setEditingName("")
    }
  }

  const startEditing = (emoji: CustomEmoji) => {
    setEditingEmojiId(emoji.id)
    setEditingName(emoji.name)
  }

  const cancelEditing = () => {
    setEditingEmojiId(null)
    setEditingName("")
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <SimpleLoadingSpinner className="w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-[#b5bac1] text-sm mb-4">
          Add custom emojis for everyone on this server. Express yourself with unique emojis that represent your
          community.
        </p>

        {/* File Requirements */}
        <div className="mb-6">
          <h4 className="text-[#b5bac1] text-xs font-bold uppercase mb-3">FILE REQUIREMENTS</h4>
          <ul className="text-[#b5bac1] text-sm space-y-1 list-disc list-inside">
            <li>File type: JPEG, PNG, GIF, WEBP, AVIF</li>
            <li>Max file size: 256 KB</li>
            <li>Recommended size: 128x128</li>
            <li>
              Name: emoji names must be at least 2 characters and can only contain Latin letters, numbers and
              underscores
            </li>
          </ul>
        </div>

        {/* Upload Button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white mb-6"
        >
          {isUploading ? (
            <>
              <SimpleLoadingSpinner className="w-4 h-4 mr-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Emoji
            </>
          )}
        </Button>

        {/* Separator */}
        <div className="border-t border-[#3f4147] mb-6"></div>
      </div>

      {/* Emojis List */}
      {emojis.length > 0 ? (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="grid grid-cols-2 gap-4 pb-2">
            <div className="text-[#b5bac1] text-xs font-bold uppercase">IMAGE/NAME</div>
            <div className="text-[#b5bac1] text-xs font-bold uppercase">UPLOADED BY</div>
          </div>

          {/* Emojis */}
          <div className="space-y-2">
            {emojis.map((emoji) => (
              <div
                key={emoji.id}
                className="grid grid-cols-2 gap-4 py-3 hover:bg-[#35373c] rounded px-2 group transition-colors"
              >
                {/* Image/Name Column */}
                <div className="flex items-center gap-3">
                  <img src={emoji.image_url || "/placeholder.svg"} alt={emoji.name} className="w-8 h-8 rounded" />
                  <div className="flex items-center gap-2 flex-1">
                    {editingEmojiId === emoji.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-[#b5bac1]">:</span>
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="bg-[#1e1f22] border-none text-white text-sm h-6 px-2 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleEditEmoji(emoji.id, editingName)
                            } else if (e.key === "Escape") {
                              cancelEditing()
                            }
                          }}
                          autoFocus
                        />
                        <span className="text-[#b5bac1]">:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEmoji(emoji.id, editingName)}
                          className="h-6 w-6 p-0 text-[#00d26a] hover:text-[#00d26a] hover:bg-[#00d26a]/10"
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelEditing}
                          className="h-6 w-6 p-0 text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-1 cursor-pointer hover:text-[#5865F2] transition-colors"
                        onClick={() => startEditing(emoji)}
                      >
                        <span className="text-[#b5bac1]">:</span>
                        <span className="text-white">{emoji.name}</span>
                        <span className="text-[#b5bac1]">:</span>
                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Uploaded By Column */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src={emoji.profiles?.avatar_url || "/placeholder.svg"}
                      alt="User avatar"
                      className="w-6 h-6 rounded-full"
                    />
                    <div className="flex flex-col">
                      <span className="text-white text-sm">
                        {emoji.profiles?.display_name || emoji.profiles?.username || "Unknown User"}
                      </span>
                      {emoji.profiles?.display_name && emoji.profiles?.username && (
                        <span className="text-[#b5bac1] text-xs">@{emoji.profiles.username}</span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteEmojiId(emoji.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#ed4245] hover:text-[#ed4245] hover:bg-[#ed4245]/10 p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-[#949ba4]">No custom emojis</p>
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteEmojiId !== null} onOpenChange={() => setDeleteEmojiId(null)}>
        <AlertDialogContent className="bg-[#313338] border-none text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Emoji</AlertDialogTitle>
            <AlertDialogDescription className="text-[#b5bac1]">
              Are you sure you want to delete this emoji? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel className="bg-[#4E5058] text-white hover:bg-[#6D6F78] border-none">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEmojiId && handleDeleteEmoji(deleteEmojiId)}
              className="bg-[#ED4245] hover:bg-[#A12D2F] border-none"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
