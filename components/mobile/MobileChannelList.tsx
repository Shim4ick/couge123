"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Hash, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import Image from "next/image"

type Channel = {
  id: number
  name: string
  server_id: number
  category_id: number | null
  position: number
}

type Category = {
  id: number
  name: string
  server_id: number
  position: number
}

type Server = {
  id: number
  name: string
  is_verified?: boolean
  avatar_url?: string | null
  banner_url?: string | null
}

// Add the onLeaveServer prop to the component props
type MobileChannelListProps = {
  serverId: number
  onSelectChannel: (channelId: number | null, channelName: string | null, serverId: number) => void
  selectedChannelId: number | null
  onLeaveServer?: (serverId: number) => void
}

// Update the function parameters
export default function MobileChannelList({
  serverId,
  onSelectChannel,
  selectedChannelId,
  onLeaveServer,
}: MobileChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [server, setServer] = useState<Server | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [collapsedCategories, setCollapsedCategories] = useState<number[]>([])
  const supabase = createClientComponentClient()

  const fetchServer = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("servers")
        .select("id, name, is_verified, avatar_url, banner_url")
        .eq("id", serverId)
        .single()

      if (error) throw error
      setServer(data)
    } catch (error) {
      console.error("Error fetching server:", error)
    }
  }, [supabase, serverId])

  const fetchChannelsAndCategories = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("server_id", serverId)
        .order("position")

      if (categoriesError) throw categoriesError
      setCategories(categoriesData || [])

      const { data: channelsData, error: channelsError } = await supabase
        .from("channels")
        .select("*")
        .eq("server_id", serverId)
        .order("position")

      if (channelsError) throw channelsError
      setChannels(channelsData || [])

      return { categories: categoriesData, channels: channelsData }
    } catch (error) {
      console.error("Error fetching channels and categories:", error)
      return { categories: [], channels: [] }
    } finally {
      setIsLoading(false)
    }
  }, [supabase, serverId])

  useEffect(() => {
    fetchServer()
    fetchChannelsAndCategories()
  }, [fetchServer, fetchChannelsAndCategories])

  useEffect(() => {
    const channelChannel = supabase
      .channel(`custom-server-channel-${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}` },
        () => {
          fetchChannelsAndCategories()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories", filter: `server_id=eq.${serverId}` },
        () => {
          fetchChannelsAndCategories()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channelChannel)
    }
  }, [serverId, supabase, fetchChannelsAndCategories])

  const handleSelectChannel = (channelId: number, channelName: string) => {
    onSelectChannel(channelId, channelName, serverId)
  }

  const toggleCategoryCollapse = (categoryId: number) => {
    setCollapsedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#2b2d31] flex items-center justify-center">
        <SimpleLoadingSpinner />
      </div>
    )
  }

  // Pass the onLeaveServer prop to the ChannelList component
  return (
    <div className="flex-1 h-full overflow-hidden">
      <div className="flex-1 bg-[#2b2d31] flex flex-col h-full overflow-hidden">
        {server?.banner_url ? (
          // Header with banner
          <div className="relative">
            {/* Banner Image */}
            <div className="h-[100px] relative overflow-hidden">
              <img
                src={server.banner_url || "/placeholder.svg"}
                alt="Server Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[#2b2d31]" />
            </div>

            {/* Server Info */}
            <div className="absolute bottom-4 w-full px-4">
              <div className="flex items-center">
                <h1
                  className={`font-semibold text-white truncate ${server.is_verified ? "max-w-[150px]" : "max-w-[180px]"}`}
                >
                  {server.name}
                </h1>
                {server.is_verified && (
                  <div className="w-[18px] h-[18px] relative flex items-center ml-1">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/free-icon-verified-7264008-c0PjVXx2OewNOpuv9qO7qadgeOy5yh.png"
                      alt="Verified"
                      width={16}
                      height={16}
                      className="invert"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Original header without banner
          <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm">
            <div className="flex items-center">
              <h1
                className={`font-semibold text-white truncate ${server?.is_verified ? "max-w-[150px]" : "max-w-[180px]"}`}
              >
                {server?.name || "Loading..."}
              </h1>
              {server?.is_verified && (
                <div className="w-[18px] h-[18px] relative flex items-center ml-1">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/free-icon-verified-7264008-c0PjVXx2OewNOpuv9qO7qadgeOy5yh.png"
                    alt="Verified"
                    width={16}
                    height={16}
                    className="invert"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-2 pt-4 pb-20">
            {categories.map((category) => (
              <div key={category.id} className="mb-2">
                <button
                  className="flex items-center justify-between w-full px-2 group"
                  onClick={() => toggleCategoryCollapse(category.id)}
                >
                  <div className="flex items-center text-xs font-semibold text-[#949ba4] uppercase tracking-wide">
                    <ChevronDown
                      className={`w-3 h-3 mr-0.5 transition-transform ${
                        collapsedCategories.includes(category.id) ? "-rotate-90" : ""
                      }`}
                    />
                    {category.name}
                  </div>
                </button>
                {!collapsedCategories.includes(category.id) ||
                channels.some((ch) => ch.category_id === category.id && ch.id === selectedChannelId) ? (
                  <div className="mt-1 space-y-0.5">
                    {channels
                      .filter((channel) => channel.category_id === category.id)
                      .filter(
                        (channel) => !collapsedCategories.includes(category.id) || channel.id === selectedChannelId,
                      )
                      .map((channel) => (
                        <Button
                          key={channel.id}
                          variant="ghost"
                          className={`w-full h-8 justify-start px-2 py-0 text-[#949ba4] hover:text-white hover:bg-[#36373d] rounded-md ${
                            selectedChannelId === channel.id ? "bg-[#36373d] text-white" : ""
                          }`}
                          onClick={() => handleSelectChannel(channel.id, channel.name)}
                        >
                          <Hash className="w-4 h-4 mr-1 shrink-0" />
                          <span className="truncate">{channel.name}</span>
                        </Button>
                      ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
