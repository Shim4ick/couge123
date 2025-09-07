"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

interface InvitesTabProps {
  serverId: number
}

// Интерфейс для приглашений
interface InviteLink {
  id: number
  code: string
  created_by: string
  created_at: string
  expires_at: string | null
  uses: number
  creator?: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

export default function InvitesTab({ serverId }: InvitesTabProps) {
  const [invitesPaused, setInvitesPaused] = useState(false)
  const [isServerStatusLoading, setIsServerStatusLoading] = useState(true)
  const [isInvitesLoading, setIsInvitesLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [invites, setInvites] = useState<InviteLink[]>([])
  const [isDeletingInvite, setIsDeletingInvite] = useState<number | null>(null)
  const [hoverInviteId, setHoverInviteId] = useState<number | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchServerInviteStatus()
    fetchInvites()
  }, [])

  const fetchServerInviteStatus = async () => {
    try {
      const { data, error } = await supabase.from("servers").select("paused_invites").eq("id", serverId).single()

      if (error) throw error
      setInvitesPaused(data.paused_invites)
    } catch (error) {
      console.error("Error fetching server invite status:", error)
    } finally {
      setIsServerStatusLoading(false)
      updateLoadingState()
    }
  }

  const fetchInvites = async () => {
    try {
      // Получаем все приглашения для сервера
      const { data: inviteData, error: inviteError } = await supabase
        .from("invite_links")
        .select("*")
        .eq("server_id", serverId)
        .order("created_at", { ascending: false })

      if (inviteError) throw inviteError

      // Фильтруем истекшие приглашения
      const now = new Date()
      const activeInvites = inviteData.filter((invite) => !invite.expires_at || new Date(invite.expires_at) > now)

      // Получаем информацию о создателях приглашений
      const creatorIds = activeInvites.map((invite) => invite.created_by)
      const { data: creatorData, error: creatorError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", creatorIds)

      if (creatorError) throw creatorError

      // Объединяем данные
      const invitesWithCreators = activeInvites.map((invite) => ({
        ...invite,
        creator: creatorData.find((creator) => creator.id === invite.created_by),
      }))

      setInvites(invitesWithCreators)
    } catch (error) {
      console.error("Error fetching invites:", error)
    } finally {
      setIsInvitesLoading(false)
      updateLoadingState()
    }
  }

  const updateLoadingState = () => {
    if (!isServerStatusLoading && !isInvitesLoading) {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    updateLoadingState()
  }, [isServerStatusLoading, isInvitesLoading])

  const toggleInvitePause = async () => {
    try {
      const { error } = await supabase.from("servers").update({ paused_invites: !invitesPaused }).eq("id", serverId)

      if (error) throw error

      setInvitesPaused(!invitesPaused)
      toast({
        title: invitesPaused ? "Invites Resumed" : "Invites Paused",
        description: invitesPaused
          ? "New members can now join using invite links."
          : "New members cannot join using invite links.",
      })
    } catch (error) {
      console.error("Error toggling invite pause:", error)
      toast({
        title: "Error",
        description: "Failed to update invite settings.",
        variant: "destructive",
      })
    }
  }

  const deleteInvite = async (inviteId: number) => {
    setIsDeletingInvite(inviteId)
    try {
      const { error } = await supabase.from("invite_links").delete().eq("id", inviteId)

      if (error) throw error

      // Обновляем список приглашений после удаления
      setInvites((prevInvites) => prevInvites.filter((invite) => invite.id !== inviteId))

      toast({
        title: "Invite Deleted",
        description: "The invite link has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting invite:", error)
      toast({
        title: "Error",
        description: "Failed to delete invite link.",
        variant: "destructive",
      })
    } finally {
      setIsDeletingInvite(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <SimpleLoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Pause Invites</h3>
          <p className="text-sm text-[#B9BBBE]">Temporarily disable all invites to prevent new members from joining.</p>
        </div>
        <Switch checked={invitesPaused} onCheckedChange={toggleInvitePause} />
      </div>

      {/* Сепаратор */}
      <div className="border-t border-[#3f4147] my-6"></div>

      {/* Список активных приглашений */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Active Invites</h3>

        {invites.length === 0 ? (
          <p className="text-sm text-[#B9BBBE]">No active invites found.</p>
        ) : (
          <div className="space-y-1">
            {/* Заголовки таблицы */}
            <div className="grid grid-cols-3 text-[#B9BBBE] text-sm px-4 py-2">
              <div>Inviter</div>
              <div>Invite Code</div>
              <div className="text-center">Expires</div>
            </div>

            <AnimatePresence>
              {invites.map((invite) => (
                <motion.div
                  key={invite.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0, overflow: "hidden" }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                  onMouseEnter={() => setHoverInviteId(invite.id)}
                  onMouseLeave={() => setHoverInviteId(null)}
                >
                  {/* Кнопка удаления, появляющаяся при наведении */}
                  {hoverInviteId === invite.id && (
                    <button
                      onClick={() => deleteInvite(invite.id)}
                      className="absolute -top-2 -right-2 bg-[#2D2F33] text-[#ED4245] hover:bg-[#ED4245] hover:text-white p-1 rounded-full transition-colors z-10 border border-[#404249]"
                      disabled={isDeletingInvite === invite.id}
                    >
                      {isDeletingInvite === invite.id ? (
                        <SimpleLoadingSpinner className="w-4 h-4" />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-trash-2"
                        >
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          <line x1="10" x2="10" y1="11" y2="17" />
                          <line x1="14" x2="14" y1="11" y2="17" />
                        </svg>
                      )}
                    </button>
                  )}

                  <div
                    className={`grid grid-cols-3 items-center px-4 py-3 border ${
                      hoverInviteId === invite.id
                        ? "bg-[#2D2F33] border-[#404249] rounded-md"
                        : "bg-transparent border-transparent"
                    } transition-all duration-200 outline-none`}
                  >
                    {/* Приглашающий */}
                    <div className="flex items-center">
                      {invite.creator && (
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={invite.creator.avatar_url || undefined} />
                            <AvatarFallback>{invite.creator.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-white text-sm">{invite.creator.display_name}</span>
                            <span className="text-[#B9BBBE] text-xs">@{invite.creator.username}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Код приглашения */}
                    <div className="text-white font-mono text-sm">{invite.code}</div>

                    {/* Истекает */}
                    <div className="text-white text-center">
                      {invite.expires_at ? (
                        formatExpirationDate(invite.expires_at)
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mx-auto"
                        >
                          <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

// Function to format expiration date
function formatExpirationDate(expiresAt: string): string {
  const expirationDate = new Date(expiresAt)
  const now = new Date()

  // Difference in milliseconds
  const diff = expirationDate.getTime() - now.getTime()

  // Difference in days
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days > 0) {
    return `${days} d.`
  }

  // Difference in hours
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours > 0) {
    return `${hours} h.`
  }

  // Difference in minutes
  const minutes = Math.floor(diff / (1000 * 60))
  return `${minutes} min.`
}
