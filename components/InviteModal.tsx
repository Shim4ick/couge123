"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  serverId: number
}

interface InviteLink {
  code: string
  created_by: string
  created_at: string
  expires_at: string | null
}

interface Server {
  id: number
  name: string
}

export default function InviteModal({ isOpen, onClose, serverId }: InviteModalProps) {
  const [currentInviteLink, setCurrentInviteLink] = useState<InviteLink | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [newLinkExpiration, setNewLinkExpiration] = useState("7d")
  const [isCreatingLink, setIsCreatingLink] = useState(false)
  const [server, setServer] = useState<Server | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (isOpen) {
      setIsInitialLoading(true)
      Promise.all([fetchServerDetails(), fetchCurrentInviteLink()])
        .then(() => setIsInitialLoading(false))
        .catch((error) => {
          console.error("Error fetching data:", error)
          setIsInitialLoading(false)
        })
    }
  }, [isOpen])

  const fetchServerDetails = async () => {
    try {
      const { data, error } = await supabase.from("servers").select("id, name").eq("id", serverId).single()

      if (error) throw error
      setServer(data)
    } catch (error) {
      console.error("Error fetching server details:", error)
    }
  }

  const fetchCurrentInviteLink = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data, error } = await supabase
        .from("invite_links")
        .select("*")
        .eq("server_id", serverId)
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        // Check if the invite link has expired
        const now = new Date()
        const expiresAt = data.expires_at ? new Date(data.expires_at) : null
        if (expiresAt && expiresAt < now) {
          setCurrentInviteLink(null)
        } else {
          setCurrentInviteLink(data)
        }
      } else {
        setCurrentInviteLink(null)
      }
    } catch (error) {
      console.error("Error fetching invite link:", error)
      setCurrentInviteLink(null)
    }
  }

  const createInviteLink = async () => {
    setIsCreatingLink(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      let expiresAt = null
      if (newLinkExpiration !== "never") {
        const duration = {
          "30m": 30 * 60,
          "1h": 60 * 60,
          "6h": 6 * 60 * 60,
          "12h": 12 * 60 * 60,
          "1d": 24 * 60 * 60,
          "7d": 7 * 24 * 60 * 60,
          "30d": 30 * 24 * 60 * 60,
        }[newLinkExpiration]
        expiresAt = new Date(Date.now() + duration * 1000)
      }

      const { data, error } = await supabase.rpc("create_invite_link", {
        p_server_id: serverId,
        p_created_by: user.id,
        p_expires_at: expiresAt,
      })

      if (error) throw error

      await fetchCurrentInviteLink()
      setIsSettingsOpen(false)
    } catch (error) {
      console.error("Error creating invite link:", error)
      toast({
        title: "Error",
        description: "Failed to create invite link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingLink(false)
    }
  }

  const copyInviteLink = (code: string) => {
    const inviteLink = `https://couge.cc/${code}`
    navigator.clipboard.writeText(inviteLink)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast({
      title: "Copied!",
      description: "The invitation link has been copied to the clipboard.",
    })
  }

  const getExpirationText = (expiresAt: string | null) => {
    if (!expiresAt) return "Your invitation link will never expire"

    const timeLeft = new Date(expiresAt).getTime() - Date.now()
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60))

    if (days > 0) {
      return `Your invitation link will expire after ${days} ${getDaysText(days)}`
    } else if (hours > 0) {
      return `Your invitation link will expire after ${hours} ${getHoursText(hours)}`
    } else {
      return `Your invitation link will expire after ${minutes} ${getMinutesText(minutes)}`
    }
  }

  const getDaysText = (days: number) => {
    if (days === 1) return "day"
    return "days"
  }

  const getHoursText = (hours: number) => {
    if (hours === 1) return "hour"
    return "hours"
  }

  const getMinutesText = (minutes: number) => {
    if (minutes === 1) return "minute"
    return "minutes"
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#18191c] text-white border-none p-0 max-w-[480px] w-full">
        {isInitialLoading ? (
          <div className="flex items-center justify-center h-[200px]">
            <SimpleLoadingSpinner className="w-8 h-8 text-[#5865F2]" />
          </div>
        ) : (
          <>
            {!isSettingsOpen ? (
              <div>
                <div className="p-4 pb-0">
                  <h2 className="text-[16px] font-semibold text-white">
                    Invite people to{" "}
                    {server?.name && server.name.length > 20 ? server.name.substring(0, 20) + "..." : server?.name}
                  </h2>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[13px] text-[#b9bbbe] mb-2">The invitation link to the server</p>
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center w-full bg-[#1e1f22] rounded-md transition-all duration-300 ${
                          isCopied ? "ring-1 ring-green-500" : ""
                        }`}
                      >
                        <div className="flex-1 px-3 py-1.5 overflow-hidden">
                          <div className="text-[#dbdee1] text-sm overflow-hidden text-ellipsis">
                            {currentInviteLink
                              ? `https://couge.cc/${currentInviteLink.code}`
                              : "Your invite link has expired"}
                          </div>
                        </div>
                        {currentInviteLink ? (
                          <Button
                            className={`h-8 px-3 rounded-md text-white text-xs font-medium transition-all duration-300 ${
                              isCopied ? "bg-green-500 hover:bg-green-600" : "bg-[#5865F2] hover:bg-[#4752C4]"
                            }`}
                            onClick={() => copyInviteLink(currentInviteLink.code)}
                          >
                            {isCopied ? "Copied" : "Copy"}
                          </Button>
                        ) : (
                          <Button
                            className="h-8 px-3 rounded-md text-white text-xs font-medium bg-[#5865F2] hover:bg-[#4752C4]"
                            onClick={() => setIsSettingsOpen(true)}
                          >
                            Create New
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {currentInviteLink ? (
                    <div className="flex items-center gap-1 pb-1">
                      <span className="text-[13px] text-[#b9bbbe]">
                        {getExpirationText(currentInviteLink.expires_at)}.
                      </span>
                      <Button
                        variant="link"
                        className="text-[13px] text-[#00a8fc] hover:underline p-0 h-auto"
                        onClick={() => setIsSettingsOpen(true)}
                      >
                        Change the link parameters
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[13px] text-[#b9bbbe]">
                      Your invite link has expired. Create a new one to invite people.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="p-4 pb-0">
                  <h2 className="text-[16px] font-semibold text-white">
                    {currentInviteLink ? "Invitation link parameters" : "Create a new invitation"}
                  </h2>
                </div>

                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[13px] text-[#b9bbbe]">It will become obsolete after</label>
                    <Select defaultValue="7d" onValueChange={setNewLinkExpiration}>
                      <SelectTrigger className="w-full bg-[#1e1f22] border-none text-[#dbdee1]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1e1f22] border-[#2b2d31] text-[#dbdee1]">
                        <SelectItem value="30m">30 minutes</SelectItem>
                        <SelectItem value="1h">1 hour</SelectItem>
                        <SelectItem value="6h">6 hours</SelectItem>
                        <SelectItem value="12h">12 hours</SelectItem>
                        <SelectItem value="1d">1 day</SelectItem>
                        <SelectItem value="7d">7 days</SelectItem>
                        <SelectItem value="30d">30 days</SelectItem>
                        <SelectItem value="never">Indefinitely</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="ghost"
                      className="hover:bg-[#2b2d31] text-white text-[14px]"
                      onClick={() => setIsSettingsOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createInviteLink}
                      disabled={isCreatingLink}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-[14px]"
                    >
                      {currentInviteLink ? "Generate a new link" : "Create an invitation"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
