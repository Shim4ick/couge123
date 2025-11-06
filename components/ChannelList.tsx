"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Hash, Plus, ChevronDown, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import InviteModal from "./InviteModal"
import ServerSettings from "./ServerSettings"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Settings, Trash } from "lucide-react"
import CategorySettings from "./CategorySettings"
import ChannelSettings from "./ChannelSettings"

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

// First, update the ChannelListProps type to include a new onLeaveServer callback
type ChannelListProps = {
  serverId: number
  onSelectChannel: (channelId: number | null, channelName: string | null, serverId: number) => void
  onInvite: () => void
  isServerOwner: boolean
  selectedChannelId: number | null
  onLeaveServer?: (serverId: number) => void
}

// Update the function parameters to include the new prop
export default function ChannelList({
  serverId,
  onSelectChannel,
  onInvite,
  isServerOwner,
  selectedChannelId,
  onLeaveServer,
}: ChannelListProps) {
  const [channels, setChannels] = useState<Channel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [server, setServer] = useState<Server | null>(null)
  const [newChannelName, setNewChannelName] = useState("")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false)
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [collapsedCategories, setCollapsedCategories] = useState<number[]>([])
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isServerSettingsOpen, setIsServerSettingsOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCategorySettingsOpen, setIsCategorySettingsOpen] = useState(false)
  const [isChannelSettingsOpen, setIsChannelSettingsOpen] = useState(false)
  const [selectedCategoryForSettings, setSelectedCategoryForSettings] = useState<Category | null>(null)
  const [selectedChannelForSettings, setSelectedChannelForSettings] = useState<Channel | null>(null)
  const [selectedChannelType, setSelectedChannelType] = useState<"text" | "voice">("text")
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
    fetchChannelsAndCategories().then(() => {
      // После загрузки каналов и категорий, проверяем нужно ли выбрать канал
      if (!selectedChannelId) {
        selectDefaultChannel()
      }
    })
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

  const createChannel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreatingChannel(true)
    if (newChannelName.trim()) {
      try {
        const { error } = await supabase.from("channels").insert({
          name: newChannelName,
          server_id: serverId,
          category_id: selectedCategoryId,
          position: channels.filter((c) => c.category_id === selectedCategoryId).length,
        })
        if (error) {
          if (error.code === "42501") {
            toast({
              title: "Permission Denied",
              description: "You don't have permission to create channels in this server.",
              variant: "destructive",
            })
          } else {
            throw error
          }
        } else {
          setNewChannelName("")
          setIsChannelDialogOpen(false)
          await fetchChannelsAndCategories()
        }
      } catch (error) {
        console.error("Error creating channel:", error)
        toast({
          title: "Error",
          description: "Failed to create channel. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsCreatingChannel(false)
      }
    }
  }

  const createCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreatingCategory(true)
    if (newCategoryName.trim()) {
      try {
        const { error } = await supabase.from("categories").insert({
          name: newCategoryName,
          server_id: serverId,
          position: categories.length,
        })
        if (error) {
          if (error.code === "42501") {
            toast({
              title: "Permission Denied",
              description: "You don't have permission to create categories in this server.",
              variant: "destructive",
            })
          } else {
            throw error
          }
        } else {
          setNewCategoryName("")
          setIsCategoryDialogOpen(false)
          await fetchChannelsAndCategories()
        }
      } catch (error) {
        console.error("Error creating category:", error)
        toast({
          title: "Error",
          description: "Failed to create category. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsCreatingCategory(false)
      }
    }
  }

  useEffect(() => {
    if (!isServerSettingsOpen) {
      fetchServer()
    }
  }, [isServerSettingsOpen, fetchServer])

  const selectDefaultChannel = useCallback(() => {
    // Сначала сортируем категории по позиции, чтобы гарантировать правильный порядок
    const sortedCategories = [...categories].sort((a, b) => a.position - b.position)

    // Находим категорию с позицией 0 или первую категорию в отсортированном списке
    const defaultCategory = sortedCategories.find((cat) => cat.position === 0) || sortedCategories[0]

    if (defaultCategory) {
      // Сортируем каналы в этой категории по позиции
      const categoryChannels = channels
        .filter((ch) => ch.category_id === defaultCategory.id)
        .sort((a, b) => a.position - b.position)

      // Находим канал с позицией 0 или первый канал в отсортированном списке
      const defaultChannel = categoryChannels.find((ch) => ch.position === 0) || categoryChannels[0]

      if (defaultChannel) {
        // Выбираем этот канал
        onSelectChannel(defaultChannel.id, defaultChannel.name, serverId)
        return
      }
    }

    // Если не нашли канал в категории с позицией 0, просто берем первый канал
    if (channels.length > 0) {
      const firstChannel = channels[0]
      onSelectChannel(firstChannel.id, firstChannel.name, serverId)
    }
  }, [categories, channels, onSelectChannel, serverId])

  useEffect(() => {
    if (channels.length === 0) {
      onSelectChannel(null, null, serverId)
      return
    }

    if (!selectedChannelId && !isLoading) {
      // Вызываем selectDefaultChannel тоько когда к��налы загружены и нет выбранного канала
      selectDefaultChannel()
    }
  }, [channels, selectedChannelId, isLoading, onSelectChannel, serverId, selectDefaultChannel])

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
      <div className="w-60 bg-[#2b2d31] flex items-center justify-center rounded-l-lg">
        <SimpleLoadingSpinner />
      </div>
    )
  }

  const handleDeleteCategory = async (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category? All channels in this category will be deleted.")) {
      try {
        const { error } = await supabase.from("categories").delete().eq("id", categoryId)
        if (error) throw error
        await fetchChannelsAndCategories()
        toast({
          title: "Category deleted",
          description: "The category and its channels have been deleted.",
        })
      } catch (error) {
        console.error("Error deleting category:", error)
        toast({
          title: "Error",
          description: "Failed to delete category. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleDeleteChannel = async (channelId: number) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      try {
        const { error } = await supabase.from("channels").delete().eq("id", channelId)
        if (error) throw error
        await fetchChannelsAndCategories()
        toast({
          title: "Channel deleted",
          description: "The channel has been deleted.",
        })
      } catch (error) {
        console.error("Error deleting channel:", error)
        toast({
          title: "Error",
          description: "Failed to delete channel. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  // Update the handleLeaveServer function to call the onLeaveServer callback
  const handleLeaveServer = async () => {
    if (confirm("Are you sure you want to leave this server?")) {
      try {
        const { error } = await supabase
          .from("server_members")
          .delete()
          .eq("server_id", serverId)
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)

        if (error) throw error

        // Redirect to home page
        onSelectChannel(null, null, 0)

        // Call the onLeaveServer callback to update the server list
        if (onLeaveServer) {
          onLeaveServer(serverId)
        }

        toast({
          title: "Success",
          description: "You have left the server.",
        })
      } catch (error) {
        console.error("Error leaving server:", error)
        toast({
          title: "Error",
          description: "Failed to leave the server. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col min-h-screen rounded-l-lg">
      {server?.banner_url ? (
        // Header with banner
        <div className="relative">
          {/* Banner Image */}
          <div className="h-[120px] relative overflow-hidden rounded-tl-lg">
            <img
              src={server.banner_url || "/placeholder.svg"}
              alt="Server Banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-[#2b2d31]" />
          </div>

          {/* Server Info */}
          <div className="absolute bottom-4 w-full px-4 flex justify-between items-center">
            <div className="flex items-center">
              <h1
                className={`font-semibold text-white truncate ${server.is_verified ? "max-w-[150px]" : "max-w-[180px]"}`}
              >
                {server.name}
              </h1>
              {server.is_verified && (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="w-[18px] h-[18px] relative flex items-center ml-1">
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/free-icon-verified-7264008-c0PjVXx2OewNOpuv9qO7qadgeOy5yh.png"
                          alt="Verified"
                          className="w-4 h-4 invert"
                          style={{ filter: "brightness(0) invert(1)" }}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-[#1e1f22] text-white border-none">
                      <p>The official community</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Settings Button */}
            <DropdownMenu onOpenChange={setIsDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="text-white/80 hover:text-white">
                  <ChevronDown className={`w-5 h-5 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-[#1e1f22] border-none text-[#b9bbbe]">
                {isServerOwner && (
                  <DropdownMenuItem
                    className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                    onClick={() => setIsServerSettingsOpen(true)}
                  >
                    Server Settings
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                  onClick={() => setIsInviteModalOpen(true)}
                >
                  Invite people
                </DropdownMenuItem>
                {isServerOwner && (
                  <DropdownMenuItem
                    className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                    onClick={() => setIsCategoryDialogOpen(true)}
                  >
                    Create Category
                  </DropdownMenuItem>
                )}
                {!isServerOwner && (
                  <DropdownMenuItem
                    className="focus:bg-[#ED4245] focus:text-white cursor-pointer text-[#ED4245]"
                    onClick={handleLeaveServer}
                  >
                    Leave Server
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ) : (
        // Original header without banner
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e1f22] shadow-sm">
          <div className="flex items-center">
            <h1
              className={`font-semibold text-white truncate ${server?.is_verified ? "max-w-[150px]" : "max-w-[180px]"}`}
            >
              {server?.name || "Loading..."}
            </h1>
            {server?.is_verified && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="w-[18px] h-[18px] relative flex items-center ml-1">
                      <img
                        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/free-icon-verified-7264008-c0PjVXx2OewNOpuv9qO7qadgeOy5yh.png"
                        alt="Verified"
                        className="w-4 h-4 invert"
                        style={{ filter: "brightness(0) invert(1)" }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-[#1e1f22] text-white border-none">
                    <p>The official community</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="text-[#b9bbbe] hover:text-white">
                <ChevronDown className={`w-5 h-5 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#1e1f22] border-none text-[#b9bbbe]">
              {isServerOwner && (
                <DropdownMenuItem
                  className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                  onClick={() => setIsServerSettingsOpen(true)}
                >
                  Server Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                onClick={() => setIsInviteModalOpen(true)}
              >
                Invite people
              </DropdownMenuItem>
              {isServerOwner && (
                <DropdownMenuItem
                  className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                  onClick={() => setIsCategoryDialogOpen(true)}
                >
                  Create Category
                </DropdownMenuItem>
              )}
              {!isServerOwner && (
                <DropdownMenuItem
                  className="focus:bg-[#ED4245] focus:text-white cursor-pointer text-[#ED4245]"
                  onClick={handleLeaveServer}
                >
                  Leave Server
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 pt-4">
          {categories.map((category) => (
            <ContextMenu key={category.id}>
              <ContextMenuTrigger>
                <div className="mb-2">
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
                    {isServerOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-4 h-4 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedCategoryId(category.id)
                          setIsChannelDialogOpen(true)
                        }}
                      >
                        <Plus className="w-4 h-4 text-[#949ba4]" />
                      </Button>
                    )}
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
                          <ContextMenu key={channel.id}>
                            <ContextMenuTrigger>
                              <Button
                                variant="ghost"
                                className={`w-full h-8 justify-start px-2 py-0 text-[#949ba4] hover:text-white hover:bg-[#36373d] rounded-md ${
                                  selectedChannelId === channel.id ? "bg-[#36373d] text-white" : ""
                                }`}
                                onClick={() => handleSelectChannel(channel.id, channel.name)}
                              >
                                <Hash className="w-4 h-4 mr-1 shrink-0" />
                                <span className="truncate">{channel.name}</span>
                              </Button>
                            </ContextMenuTrigger>
                            {isServerOwner && (
                              <ContextMenuContent className="w-56 bg-[#1e1f22] border-none text-[#b9bbbe]">
                                <ContextMenuItem
                                  className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                                  onClick={() => {
                                    setSelectedChannelForSettings(channel)
                                    setIsChannelSettingsOpen(true)
                                  }}
                                >
                                  <Settings className="w-4 h-4 mr-2" />
                                  Channel Settings
                                </ContextMenuItem>
                                <ContextMenuItem
                                  className="focus:bg-[#ED4245] focus:text-white cursor-pointer text-[#ED4245]"
                                  onClick={() => handleDeleteChannel(channel.id)}
                                >
                                  <Trash className="w-4 h-4 mr-2" />
                                  Delete Channel
                                </ContextMenuItem>
                              </ContextMenuContent>
                            )}
                          </ContextMenu>
                        ))}
                    </div>
                  ) : null}
                </div>
              </ContextMenuTrigger>
              {isServerOwner && (
                <ContextMenuContent className="w-56 bg-[#1e1f22] border-none text-[#b9bbbe]">
                  <ContextMenuItem
                    className="focus:bg-[#5865F2] focus:text-white cursor-pointer"
                    onClick={() => {
                      setSelectedCategoryForSettings(category)
                      setIsCategorySettingsOpen(true)
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Category Settings
                  </ContextMenuItem>
                  <ContextMenuItem
                    className="focus:bg-[#ED4245] focus:text-white cursor-pointer text-[#ED4245]"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash className="w-4 h-4 mr-2" />
                    Delete Category
                  </ContextMenuItem>
                </ContextMenuContent>
              )}
            </ContextMenu>
          ))}
        </div>
      </div>

      {isServerOwner && server && (
        <ServerSettings
          isOpen={isServerSettingsOpen}
          onClose={() => setIsServerSettingsOpen(false)}
          serverId={serverId}
          serverData={{
            name: server?.name || "",
            avatar_url: server?.avatar_url || null,
          }}
          onServerUpdate={(updatedServer) => {
            setServer((prevServer) => ({
              ...prevServer!,
              name: updatedServer.name,
              avatar_url: updatedServer.avatar_url,
            }))
          }}
        />
      )}

      <TooltipProvider>
        <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
          <DialogContent className="bg-[#313338] text-white border-none max-w-md">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-semibold">Create Channel</DialogTitle>
              <p className="text-[#B9BBBE] text-xs">
                in {categories.find((c) => c.id === selectedCategoryId)?.name || "Text Channels"}
              </p>
            </DialogHeader>
            <form onSubmit={createChannel} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#B9BBBE] uppercase block">CHANNEL TYPE</label>
                  <div
                    className={`bg-[#2B2D31] rounded-md p-3 cursor-pointer relative transition-colors duration-200 ease-in-out ${
                      selectedChannelType === "text" ? "" : "hover:bg-[#2F3136]"
                    }`}
                    onClick={() => setSelectedChannelType("text")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <Hash className="w-6 h-6 mr-2 text-[#B9BBBE]" />
                        <div>
                          <h3 className="text-white font-medium">Text</h3>
                          <p className="text-[#B9BBBE] text-sm">
                            Send messages, images, GIFs, emoji, opinions, and puns
                          </p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ml-4">
                        {selectedChannelType === "text" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#2B2D31] rounded-md p-3 cursor-not-allowed relative opacity-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <Volume2 className="w-6 h-6 mr-2 text-[#B9BBBE]" />
                        <div>
                          <h3 className="text-white font-medium">Voice</h3>
                          <p className="text-[#B9BBBE] text-sm">
                            Hang out together with voice, video, and screen share
                          </p>
                        </div>
                      </div>
                      <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ml-4">
                        {selectedChannelType === "voice" && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="channelName" className="text-xs font-semibold text-[#B9BBBE] uppercase block">
                    CHANNEL NAME
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#B9BBBE]" />
                    <Input
                      id="channelName"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      className="bg-[#1E1F22] border-none text-white pl-9 h-10"
                      placeholder="new-channel"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsChannelDialogOpen(false)}
                  className="text-white hover:bg-[#4E5058] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingChannel || !newChannelName.trim()}
                  className={`text-white transition-colors duration-200 ease-in-out ${
                    !newChannelName.trim() ? "bg-[#5865F2]/50 cursor-not-allowed" : "bg-[#5865F2] hover:bg-[#4752C4]"
                  }`}
                >
                  {isCreatingChannel ? <SimpleLoadingSpinner /> : "Create Channel"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent className="bg-[#313338] text-white border-none max-w-md">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-semibold">Create Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={createCategory} className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="categoryName" className="text-xs font-semibold text-[#B9BBBE] uppercase block">
                  CATEGORY NAME
                </label>
                <div className="relative">
                  <Input
                    id="categoryName"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="bg-[#1E1F22] border-none text-white h-10"
                    placeholder="New Category"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCategoryDialogOpen(false)}
                  className="text-white hover:bg-[#4E5058] hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  className={`text-white transition-colors duration-200 ease-in-out ${
                    !newCategoryName.trim() ? "bg-[#5865F2]/50 cursor-not-allowed" : "bg-[#5865F2] hover:bg-[#4752C4]"
                  }`}
                >
                  {isCreatingCategory ? <SimpleLoadingSpinner /> : "Create Category"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </TooltipProvider>

      {isInviteModalOpen && (
        <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} serverId={serverId} />
      )}
      {isCategorySettingsOpen && selectedCategoryForSettings && (
        <CategorySettings
          isOpen={isCategorySettingsOpen}
          onClose={() => setIsCategorySettingsOpen(false)}
          category={selectedCategoryForSettings}
          onCategoryUpdate={fetchChannelsAndCategories}
        />
      )}
      {isChannelSettingsOpen && selectedChannelForSettings && (
        <ChannelSettings
          isOpen={isChannelSettingsOpen}
          onClose={() => setIsChannelSettingsOpen(false)}
          channel={selectedChannelForSettings}
          onChannelUpdate={fetchChannelsAndCategories}
        />
      )}
    </div>
  )
}
