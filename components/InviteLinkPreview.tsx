"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import SimpleLoadingSpinner from "./SimpleLoadingSpinner"
import Image from "next/image"

interface InviteLinkPreviewProps {
  inviteCode: string
}

type InviteStatus = "loading" | "invalid" | "valid" | "joined" | "paused"

interface ServerInfo {
  id: number
  name: string
  avatar_url: string | null
  is_verified?: boolean
  memberCount: number
  paused_invites?: boolean
}

export default function InviteLinkPreview({ inviteCode }: InviteLinkPreviewProps) {
  const [status, setStatus] = useState<InviteStatus>("loading")
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    const checkInvite = async () => {
      try {
        // First check if it's a default invite code
        let { data: serverData, error: serverError } = await supabase
          .from("servers")
          .select("*, paused_invites")
          .eq("default_invite_code", inviteCode)
          .single()

        if (serverError && serverError.code === "PGRST116") {
          // If not found in servers table, check the invite_links table
          const { data: inviteLinkData, error: inviteLinkError } = await supabase
            .from("invite_links")
            .select("*, servers(*)")
            .eq("code", inviteCode)
            .single()

          if (inviteLinkError) {
            if (inviteLinkError.code === "PGRST116") {
              // Invite link not found
              setStatus("invalid")
              return
            }
            throw inviteLinkError
          }

          // Check if the invite link has expired
          if (inviteLinkData.expires_at && new Date(inviteLinkData.expires_at) < new Date()) {
            setStatus("invalid")
            return
          }

          serverData = inviteLinkData.servers
        } else if (serverError) {
          throw serverError
        }

        // Get member count
        const { count, error: countError } = await supabase
          .from("server_members")
          .select("*", { count: "exact", head: true })
          .eq("server_id", serverData.id)

        if (countError) throw countError

        // Check if the current user is already a member
        const { data: user } = await supabase.auth.getUser()
        if (user) {
          const { data: memberData, error: memberError } = await supabase
            .from("server_members")
            .select("*")
            .eq("server_id", serverData.id)
            .eq("user_id", user.user.id)
            .single()

          if (!memberError && memberData) {
            setStatus("joined")
          } else if (serverData.paused_invites) {
            setStatus("paused")
          } else {
            setStatus("valid")
          }
        } else {
          if (serverData.paused_invites) {
            setStatus("paused")
          } else {
            setStatus("valid")
          }
        }

        setServerInfo({
          id: serverData.id,
          name: serverData.name,
          avatar_url: serverData.avatar_url,
          is_verified: serverData.is_verified,
          memberCount: count || 0,
          paused_invites: serverData.paused_invites,
        })
      } catch (error) {
        console.error("Error checking invite:", error)
        setStatus("invalid")
      }
    }

    checkInvite()
  }, [inviteCode, supabase])

  const handleJoinServer = async () => {
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      if (serverInfo?.paused_invites) {
        return
      }

      const { error } = await supabase.from("server_members").insert({
        server_id: serverInfo?.id,
        user_id: user.user.id,
      })

      if (error) throw error

      // Increment the uses count for the invite link
      await supabase.rpc("increment_invite_link_uses", { p_code: inviteCode })

      setStatus("joined")
    } catch (error) {
      console.error("Error joining server:", error)
    }
  }

  if (status === "loading") {
    return (
      <div className="bg-[#18191c] rounded-md p-4 my-2 w-full max-w-md">
        <div className="flex justify-center">
          <SimpleLoadingSpinner className="w-6 h-6 text-[#5865F2]" />
        </div>
      </div>
    )
  }

  if (status === "invalid") {
    return (
      <div className="bg-[#18191c] rounded-md p-4 my-2 w-full max-w-md">
        <div className="flex items-start">
          <div className="w-10 h-10 bg-[#36393f] rounded-full flex items-center justify-center mr-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 15H13V17H11V15ZM11 7H13V13H11V7Z"
                fill="#ED4245"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-medium">Вы отправили приглашение, но...</h3>
            <p className="text-[#ED4245] font-medium">Приглашение недействительно</p>
            <p className="text-[#B9BBBE] text-sm">Попробуйте отправить новое приглашение!</p>
          </div>
        </div>
      </div>
    )
  }

  if (!serverInfo) return null

  return (
    <div className="bg-[#18191c] rounded-md p-4 my-2 w-full max-w-md">
      <h3 className="text-[#B9BBBE] text-sm mb-2">Вы отправили приглашение</h3>
      <div className="flex items-center mb-3">
        <Avatar className="w-12 h-12 mr-3">
          <AvatarImage src={serverInfo.avatar_url || undefined} />
          <AvatarFallback className="bg-[#36393f] text-white">{serverInfo.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center">
            <h3 className="text-white font-medium">{serverInfo.name}</h3>
            {serverInfo.is_verified && (
              <div className="w-[18px] h-[18px] relative flex items-center ml-1">
                <Image
                  src="/images/free-icon-verified-7264008.png"
                  alt="Verified"
                  width={16}
                  height={16}
                  className="invert"
                />
              </div>
            )}
          </div>
          <div className="flex items-center text-[#B9BBBE] text-sm">
            <Users className="w-4 h-4 mr-1" />
            {serverInfo.memberCount} участников
          </div>
        </div>
      </div>
      {status === "joined" ? (
        <Button className="w-full bg-[#4E5058] text-white cursor-not-allowed" disabled>
          Присоединился
        </Button>
      ) : status === "paused" ? (
        <Button className="w-full bg-[#4E5058] text-white cursor-not-allowed" disabled>
          Приглашения приостановлены
        </Button>
      ) : (
        <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white" onClick={handleJoinServer}>
          Присоединиться
        </Button>
      )}
    </div>
  )
}
