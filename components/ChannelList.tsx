"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Hash, Plus, Settings, UserPlus, LogOut, Volume2, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import CategorySettings from "./CategorySettings"
import ChannelSettings from "./ChannelSettings"

type Channel = {
  id: number
  name: string
  description?: string
  channel_type: "text" | "voice"
  category_id?: number
  allow_messages?: boolean
}

type Category = {
  id: number
  name: string
  position: number
  channels: Channel[]
}

type ChannelListProps = {
  serverId: number | null
  onSelectChannel: (
    channelId: number | null,
    channelName: string | null,
    serverId: number,
    channelType?: "text" | "voice",
  ) => void
  onInvite: () => void
  isServerOwner: boolean
  selectedChannelId: number | null
  onLeaveServer: (serverId: number) => void
}

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
  const [uncategorizedChannels, setUncategorizedChannels] = useState<Channel[]>([])
  const [serverName, setServerName] = useState("")
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false)
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false)
  const [newChannelName, setNewChannelName] = useState("")
  const [newChannelType, setNewChannelType] = useState<"text" | "voice">("text")
  const [newChannelDescription, setNewChannelDescription] = useState("")
  const [newChannelCategory, setNewChannelCategory] = useState<string>("")
  const [newChannelAllowMessages, setNewChannelAllowMessages] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set())
  const [selectedCategoryForSettings, setSelectedCategoryForSettings] = useState<number | null>(null)
  const [selectedChannelForSettings, setSelectedChannelForSettings] = useState<number | null>(null)
  const [voiceUsers, setVoiceUsers] = useState<Record<number, number>>({}) // channelId -> user count

  const supabase = createClientComponentClient()
  const { toast } = useToast()

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
      toast({
        title: "Error",
        description: "Failed to load channels",
        variant: "destructive",
      })
    }
  }, [serverId, supabase, toast])

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

  const createChannel = async () => {
    if (!newChannelName.trim() || !serverId) return

    try {
      const channelData = {
        name: newChannelName.trim(),
        server_id: serverId,
        channel_type: newChannelType,
        description: newChannelDescription.trim() || null,
        category_id: newChannelCategory ? Number.parseInt(newChannelCategory) : null,
        allow_messages: newChannelType === "text" ? newChannelAllowMessages : null,
      }

      const { error } = await supabase.from("channels").insert(channelData)

      if (error) throw error

      setNewChannelName("")
      setNewChannelType("text")
      setNewChannelDescription("")
      setNewChannelCategory("")
      setNewChannelAllowMessages(true)
      setIsCreateChannelOpen(false)
      fetchChannels()

      toast({
        title: "Success",
        description: `${newChannelType === "voice" ? "Voice" : "Text"} channel created successfully`,
      })
    } catch (error) {
      console.error("Error creating channel:", error)
      toast({
        title: "Error",
        description: "Failed to create channel",
        variant: "destructive",
      })
    }
  }

  const createCategory = async () => {
    if (!newCategoryName.trim() || !serverId) return

    try {
      const { error } = await supabase.from("channel_categories").insert({
        name: newCategoryName.trim(),
        server_id: serverId,
        position: categories.length,
      })

      if (error) throw error

      setNewCategoryName("")
      setIsCreateCategoryOpen(false)
      fetchChannels()

      toast({
        title: "Success",
        description: "Category created successfully",
      })
    } catch (error) {
      console.error("Error creating category:", error)
      toast({
        title: "Error",
        description: "Failed to create category",
        variant: "destructive",
      })
    }
  }

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
    if (!serverId) return

    if (confirm("Are you sure you want to leave this server?")) {
      try {
        const { error } = await supabase
          .from("server_members")
          .delete()
          .eq("server_id", serverId)
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)

        if (error) throw error

        onLeaveServer(serverId)
        toast({
          title: "Success",
          description: "Left server successfully",
        })
      } catch (error) {
        console.error("Error leaving server:", error)
        toast({
          title: "Error",
          description: "Failed to leave server",
          variant: "destructive",
        })
      }
    }
  }

  const renderChannel = (channel: Channel) => {
    const isSelected = selectedChannelId === channel.id
    const userCount = voiceUsers[channel.id] || 0

    return (
      <div
        key={channel.id}
        className={`flex items-center px-2 py-1 mx-2 rounded cursor-pointer group ${
          isSelected ? "bg-[#404249] text-white" : "text-[#949ba4] hover:bg-[#35373c] hover:text-[#dcddde]"
        }`}
        onClick={() => onSelectChannel(channel.id, channel.name, serverId!, channel.channel_type)}
      >
        {channel.channel_type === "voice" ? (
          <Volume2 className="w-4 h-4 mr-2 flex-shrink-0" />
        ) : (
          <Hash className="w-4 h-4 mr-2 flex-shrink-0" />
        )}
        <span className="flex-1 truncate text-sm">{channel.name}</span>

        {/* Voice channel user count */}
        {channel.channel_type === "voice" && userCount > 0 && (
          <span className="text-xs bg-[#5865f2] text-white px-1.5 py-0.5 rounded-full ml-2">{userCount}</span>
        )}

        {isServerOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 p-1 h-auto ml-1"
            onClick={(e) => {
              e.stopPropagation()
              setSelectedChannelForSettings(channel.id)
            }}
          >
            <Settings className="w-3 h-3" />
          </Button>
        )}
      </div>
    )
  }

  if (!serverId) {
    return (
      <div className="w-60 bg-[#2b2d31] flex items-center justify-center">
        <p className="text-[#949ba4]">Select a server</p>
      </div>
    )
  }

  return (
    <div className="w-60 bg-[#2b2d31] flex flex-col">
      {/* Server header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-[#1e1f22] shadow-sm">
        <h1 className="font-semibold text-white truncate">{serverName}</h1>
        <div className="flex items-center space-x-1">
          {isServerOwner && (
            <Button variant="ghost" size="sm" onClick={onInvite} className="p-1 h-auto">
              <UserPlus className="w-4 h-4 text-[#949ba4] hover:text-white" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLeaveServer} className="p-1 h-auto">
            <LogOut className="w-4 h-4 text-[#949ba4] hover:text-white" />
          </Button>
        </div>
      </div>

      {/* Channels list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Uncategorized channels */}
        {uncategorizedChannels.length > 0 && <div className="mb-2">{uncategorizedChannels.map(renderChannel)}</div>}

        {/* Categories */}
        {categories.map((category) => (
          <div key={category.id} className="mb-2">
            <div
              className="flex items-center px-2 py-1 mx-2 text-xs font-semibold text-[#949ba4] uppercase tracking-wide cursor-pointer hover:text-[#dcddde] group"
              onClick={() => toggleCategory(category.id)}
            >
              {collapsedCategories.has(category.id) ? (
                <ChevronRight className="w-3 h-3 mr-1" />
              ) : (
                <ChevronDown className="w-3 h-3 mr-1" />
              )}
              <span className="flex-1">{category.name}</span>
              {isServerOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 p-1 h-auto"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedCategoryForSettings(category.id)
                  }}
                >
                  <Settings className="w-3 h-3" />
                </Button>
              )}
            </div>

            {!collapsedCategories.has(category.id) && (
              <div className="ml-2">{category.channels.map(renderChannel)}</div>
            )}
          </div>
        ))}

        {/* Create channel/category buttons */}
        {isServerOwner && (
          <div className="px-2 mt-4 space-y-2">
            <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-[#949ba4] hover:text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Channel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="channel-type">Channel Type</Label>
                    <Select
                      value={newChannelType}
                      onValueChange={(value: "text" | "voice") => setNewChannelType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">
                          <div className="flex items-center">
                            <Hash className="w-4 h-4 mr-2" />
                            Text Channel
                          </div>
                        </SelectItem>
                        <SelectItem value="voice">
                          <div className="flex items-center">
                            <Volume2 className="w-4 h-4 mr-2" />
                            Voice Channel
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="channel-name">Channel Name</Label>
                    <Input
                      id="channel-name"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      placeholder="Enter channel name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="channel-description">Description (Optional)</Label>
                    <Textarea
                      id="channel-description"
                      value={newChannelDescription}
                      onChange={(e) => setNewChannelDescription(e.target.value)}
                      placeholder="Enter channel description"
                      rows={3}
                    />
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <Label htmlFor="channel-category">Category (Optional)</Label>
                      <Select value={newChannelCategory} onValueChange={setNewChannelCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Category</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {newChannelType === "text" && (
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="allow-messages"
                        checked={newChannelAllowMessages}
                        onCheckedChange={setNewChannelAllowMessages}
                      />
                      <Label htmlFor="allow-messages">Allow messages</Label>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateChannelOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createChannel} disabled={!newChannelName.trim()}>
                      Create Channel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start text-[#949ba4] hover:text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createCategory} disabled={!newCategoryName.trim()}>
                      Create Category
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Category Settings Modal */}
      {selectedCategoryForSettings && (
        <CategorySettings
          isOpen={!!selectedCategoryForSettings}
          onClose={() => setSelectedCategoryForSettings(null)}
          categoryId={selectedCategoryForSettings}
          serverId={serverId}
          onUpdate={fetchChannels}
        />
      )}

      {/* Channel Settings Modal */}
      {selectedChannelForSettings && (
        <ChannelSettings
          isOpen={!!selectedChannelForSettings}
          onClose={() => setSelectedChannelForSettings(null)}
          channelId={selectedChannelForSettings}
          serverId={serverId}
          onUpdate={fetchChannels}
        />
      )}
    </div>
  )
}
