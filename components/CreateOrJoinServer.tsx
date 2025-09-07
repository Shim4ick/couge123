"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Upload } from "lucide-react"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { useUser } from "@/components/providers/UserProvider"

type CreateOrJoinServerProps = {
  isOpen: boolean
  onClose: () => void
  onServerCreated: () => void
}

export default function CreateOrJoinServer({ isOpen, onClose, onServerCreated }: CreateOrJoinServerProps) {
  const [serverName, setServerName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [serverAvatar, setServerAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()
  const { currentUser } = useUser()
  const [placeholderName, setPlaceholderName] = useState("")

  useEffect(() => {
    if (currentUser?.user_metadata?.display_name) {
      setPlaceholderName(`${currentUser.user_metadata.display_name}'s server`)
    }
  }, [currentUser])

  useEffect(() => {
    if (!isOpen) {
      setServerName("")
      setServerAvatar(null)
      setAvatarPreview(null)
    }
  }, [isOpen])

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

  const handleCreateServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      try {
        let avatarUrl = null
        if (serverAvatar) {
          const fileExt = serverAvatar.name.split(".").pop()
          const fileName = `${Date.now()}${fileExt ? `.${fileExt}` : ""}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("server-avatars")
            .upload(fileName, serverAvatar)

          if (uploadError) {
            console.error("Avatar upload error:", uploadError)
            toast({
              title: "Avatar Upload Failed",
              description: "We couldn't upload the server avatar. The server will be created without an avatar.",
              variant: "destructive",
            })
          } else if (uploadData) {
            const { data: urlData } = supabase.storage.from("server-avatars").getPublicUrl(uploadData.path)
            avatarUrl = urlData.publicUrl
          }
        }

        const finalServerName = serverName.trim() || placeholderName

        // Create the server
        const { data: serverData, error: serverError } = await supabase
          .from("servers")
          .insert({ name: finalServerName, owner_id: user.id, avatar_url: avatarUrl })
          .select()
          .single()

        if (serverError) throw serverError

        if (serverData) {
          // Create "Text Channels" category
          const { data: categoryData, error: categoryError } = await supabase
            .from("categories")
            .insert({ name: "Text Channels", server_id: serverData.id, position: 0 })
            .select()
            .single()

          if (categoryError) throw categoryError

          // Create "general" channel in the "Text Channels" category
          const { data: channelData, error: channelError } = await supabase
            .from("channels")
            .insert({ name: "general", server_id: serverData.id, category_id: categoryData.id, position: 0 })
            .select()
            .single()

          if (channelError) throw channelError

          // Add the creator as a server member
          await supabase.from("server_members").insert({
            server_id: serverData.id,
            user_id: user.id,
          })

          toast({
            title: "Server created",
            description: `Your new server "${finalServerName}" has been created with a "Text Channels" category and #general channel.`,
          })
          onServerCreated()
          onClose()
        }
      } catch (error) {
        console.error("Error creating server:", error)
        toast({
          title: "Error",
          description: "Failed to create server. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18191c] border-none p-0 max-w-md w-full overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-center text-white mb-2">Create a server</DialogTitle>
          <p className="text-[#B9BBBE] text-sm text-center mb-4">
            Create a unique look for your server by giving it a name and selecting an icon. Don't worry, you can change
            them later.
          </p>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleCreateServer} className="space-y-6">
            <div className="flex flex-col items-center">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
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
                    {serverName ? serverName.charAt(0).toUpperCase() : placeholderName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-[#B9BBBE] text-sm mt-4">Upload an image</p>
            </div>

            <div>
              <label htmlFor="server-name" className="block text-sm font-medium text-[#B9BBBE] mb-2">
                Server Name
              </label>
              <Input
                id="server-name"
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                placeholder={placeholderName}
                className="bg-[#1E1F22] border-none text-white placeholder-[#72767D] h-10 px-3"
              />
              <p className="text-[#B9BBBE] text-xs mt-2">
                By creating a server, you accept{" "}
                <a href="#" className="text-[#00A8FC] hover:underline">
                  community rules
                </a>
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium h-12 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? <SimpleLoadingSpinner /> : "Create a server"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
