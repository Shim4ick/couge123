"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Hash, Volume2, LogOut, ChevronDown, ChevronRight } from "lucide-react"

type Channel = {
  id: number
  name: string
  channel_type: "text" | "voice"
  category_id?: number
}

type Category = {
  id: number
  name: string
  position: number
  channels: Channel[]
}

type MobileChannelListProps = {
  serverId: number | null
  onSelectChannel: (
    channelId: number | null,
    channelName: string | null,
    serverId: number,
    channelType?: "text" | "voice",
  ) => void
  selectedChannelId: number | null
  onLeaveServer?: (serverId: number) => void
}

export default function MobileChannelList({
  serverId,
  onSelectChannel,
  selectedChannelId,
  onLeaveServer,
}: MobileChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [uncategorizedChannels, setUncategorizedChannels] = useState<Channel[]>([])
  const [serverName, setServerName] = useState("")
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set())
  const [voiceUsers, setVoiceUsers] = useState<Record<number, number>>({})

  const supabase = createClientComponentClient()

  const fetchChannels = useCallback(async () => {
    if (!serverId) return

    try {
      // Fetch server name
      const { data: serverData, error: serverError } = await supabase
        .from("servers")
        .select("name")
        .eq("id", serverId)
        .single()

      if (serverError) throw serverError
      setServerName(serverData.name)

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("channel_categories")
        .select("*")
        .eq("server_id", serverId)
        .order("position")

      if (categoriesError) throw categoriesError

      // Fetch channels
      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("name")

      if (channelsError) throw channelsError

      const allChannels = channelsData || []
      setChannels(allChannels)

      // Group channels by category
      const categoriesWithChannels = (categoriesData || []).map((category) => ({
        ...category,
        channels: allChannels.filter((channel) => channel.category_id === category.id),
      }))

      setCategories(categoriesWithChannels)
      setUncategorizedChannels(allChannels.filter((channel) => !channel.category_id))
    } catch (error) {
      console.error("Error fetching channels:", error)
    }
  }, [serverId, supabase])

  // Fetch voice channel user counts
  const fetchVoiceUsers = useCallback(async () => {
    if (!serverId) return

    try {
      const { data, error } = await supabase
        .from("voice_sessions")
        .select(`
          channel_id,
          channels!inner(server_id)
        `)
        .eq("channels.server_id", serverId)

      if (error) throw error

      const counts: Record<number, number> = {}
      data.forEach((session) => {
        counts[session.channel_id] = (counts[session.channel_id] || 0) + 1
      })

      setVoiceUsers(counts)
    } catch (error) {
      console.error("Error fetching voice users:", error)
    }
  }, [serverId, supabase])

  useEffect(() => {
    fetchChannels()
    fetchVoiceUsers()
  }, [fetchChannels, fetchVoiceUsers])

  // Subscribe to voice session changes
  useEffect(() => {
    if (!serverId) return

    const channel = supabase
      .channel(`voice_sessions_${serverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_sessions",
        },
        () => {
          fetchVoiceUsers()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [serverId, supabase, fetchVoiceUsers])

  const toggleCategory = (categoryId: number) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId)
    } else {
      newCollapsed.add(categoryId)
    }
    setCollapsedCategories(newCollapsed)
  }

  const handleLeaveServer = async () => {
    if (!serverId || !onLeaveServer) return

    if (confirm("Are you sure you want to leave this server?")) {
      try {
        const { error } = await supabase
          .from("server_members")
          .delete()
          .eq("server_id", serverId)
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)

        if (error) throw error

        onLeaveServer(serverId)
      } catch (error) {
        console.error("Error leaving server:", error)
      }
    }
  }

  const renderChannel = (channel: Channel) => {
    const isSelected = selectedChannelId === channel.id
    const userCount = voiceUsers[channel.id] || 0

    return (
      <div
        key={channel.id}
        className={`flex items-center px-3 py-2 mx-2 rounded cursor-pointer ${
          isSelected ? "bg-[#404249] text-white" : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dcddde]"
        }`}
        onClick={() => onSelectChannel(channel.id, channel.name, serverId!, channel.channel_type)}
      >
        {channel.channel_type === "voice" ? (
          <Volume2 className="w-5 h-5 mr-3 flex-shrink-0" />
        ) : (
          <Hash className="w-5 h-5 mr-3 flex-shrink-0" />
        )}
        <span className="flex-1 truncate">{channel.name}</span>

        {/* Voice channel user count */}
        {channel.channel_type === "voice" && userCount > 0 && (
          <span className="text-xs bg-[#5865f2] text-white px-2 py-1 rounded-full ml-2">{userCount}</span>
        )}
      </div>
    )
  }

  if (!serverId) {
    return (
      <div className="flex-1 bg-[#2b2d31] flex items-center justify-center">
        <p className="text-[#949ba4]">Select a server</p>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-[#2b2d31] flex flex-col">
      {/* Server header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e1f22] shadow-sm">
        <h1 className="font-semibold text-white truncate">{serverName}</h1>
        <Button variant="ghost" size="sm" onClick={handleLeaveServer} className="p-1 h-auto">
          <LogOut className="w-5 h-5 text-[#949ba4] hover:text-white" />
        </Button>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Uncategorized channels */}
        {uncategorizedChannels.length > 0 && <div className="mb-2">{uncategorizedChannels.map(renderChannel)}</div>}

        {/* Categories */}
        {categories.map((category) => (
          <div key={category.id} className="mb-2">
            <div
              className="flex items-center px-3 py-2 mx-2 text-sm font-semibold text-[#949ba4] uppercase tracking-wide cursor-pointer hover:text-[#dcddde]"
              onClick={() => toggleCategory(category.id)}
            >
              {collapsedCategories.has(category.id) ? (
                <ChevronRight className="w-4 h-4 mr-2" />
              ) : (
                <ChevronDown className="w-4 h-4 mr-2" />
              )}
              <span className="flex-1">{category.name}</span>
            </div>

            {!collapsedCategories.has(category.id) && (
              <div className="ml-2">{category.channels.map(renderChannel)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
