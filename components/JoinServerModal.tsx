"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import { AnimatePresence, motion } from "framer-motion"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Users } from "lucide-react"
import Image from "next/image"

interface Server {
  id: number
  name: string
  avatar_url: string | null
  is_verified?: boolean
  paused_invites?: boolean
}

interface JoinServerModalProps {
  isOpen: boolean
  onClose: () => void
  inviteCode: string
  fetchServers: () => Promise<void>
}

export default function JoinServerModal({ isOpen, onClose, inviteCode, fetchServers }: JoinServerModalProps) {
  const [server, setServer] = useState<Server | null>(null)
  const [memberCount, setMemberCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [inviter, setInviter] = useState<any>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (isOpen) {
      fetchServerDetails()
    }
  }, [isOpen])

  const fetchServerDetails = async () => {
    setIsLoading(true)
    try {
      // First, check the servers table for the default invite code
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
            setServer(null)
            return
          }
          throw inviteLinkError
        }

        // Check if the invite link has expired
        if (inviteLinkData.expires_at && new Date(inviteLinkData.expires_at) < new Date()) {
          setServer(null)
          return
        }

        serverData = inviteLinkData.servers

        // Fetch inviter details
        const { data: inviterData, error: inviterError } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", inviteLinkData.created_by)
          .single()

        if (inviterError) throw inviterError
        setInviter(inviterData)
      } else if (serverError) {
        throw serverError
      }

      setServer(serverData)

      const { count, error: countError } = await supabase
        .from("server_members")
        .select("*", { count: "exact", head: true })
        .eq("server_id", serverData.id)

      if (countError) throw countError

      setMemberCount(count || 0)

      const { data: user } = await supabase.auth.getUser()
      if (user) {
        const { data: memberData, error: memberError } = await supabase
          .from("server_members")
          .select("*")
          .eq("server_id", serverData.id)
          .eq("user_id", user.user.id)
          .single()

        if (memberError && memberError.code !== "PGRST116") throw memberError

        setIsMember(!!memberData)
      }
    } catch (error) {
      console.error("Error fetching server details:", error)
      setServer(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinServer = async () => {
    setIsJoining(true)
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      if (server?.paused_invites) {
        toast({
          title: "Invites Paused",
          description: "This server is not accepting new members at the moment.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("server_members").insert({
        server_id: server?.id,
        user_id: user.user.id,
      })

      if (error) throw error

      // Increment the uses count for the invite link
      await supabase.rpc("increment_invite_link_uses", { p_code: inviteCode })

      toast({
        title: "Success",
        description: "You have joined the server!",
      })
      await fetchServers()
      onClose()
    } catch (error) {
      console.error("Error joining server:", error)
      toast({
        title: "Error",
        description: "Failed to join the server. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="bg-[#18191c] border-none p-6 max-w-md w-full">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-start text-left"
            >
              {isLoading ? (
                <SimpleLoadingSpinner />
              ) : server ? (
                <>
                  <h3 className="text-white font-semibold mb-4 text-lg">Join a Server</h3>
                  <div className="flex items-center mb-4">
                    <Avatar className="w-16 h-16 mr-4">
                      <AvatarImage src={server.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{server.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-semibold text-white flex items-center gap-1">
                        {server.name}
                        {server.is_verified && (
                          <div className="w-[18px] h-[18px] relative flex items-center">
                            <Image
                              src="/images/free-icon-verified-7264008.png"
                              alt="Verified"
                              width={16}
                              height={16}
                              className="invert"
                            />
                          </div>
                        )}
                      </h3>
                      <div className="flex items-center text-sm text-[#B9BBBE]">
                        <Users className="w-4 h-4 mr-1" />
                        {memberCount} members
                      </div>
                    </div>
                  </div>
                  {inviter && (
                    <p className="text-[#B9BBBE] mb-4">
                      <span className="font-semibold">{inviter.username}</span> invites you to join this server
                    </p>
                  )}
                  <Button
                    onClick={isMember || server?.paused_invites ? undefined : handleJoinServer}
                    className={`w-full ${
                      isMember || server?.paused_invites
                        ? "bg-[#4F545C] cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    } text-white font-medium`}
                    disabled={isMember || isJoining || server?.paused_invites}
                  >
                    {isMember ? (
                      "You're already a member"
                    ) : isJoining ? (
                      <SimpleLoadingSpinner className="w-6 h-6 border-white border-t-transparent" />
                    ) : server?.paused_invites ? (
                      "Invites Paused"
                    ) : (
                      "Join Server"
                    )}
                  </Button>
                </>
              ) : (
                <p className="text-[#B9BBBE]">Invite link not found or has expired.</p>
              )}
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
