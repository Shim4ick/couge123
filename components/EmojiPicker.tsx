"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Search, Clock, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"

interface CustomEmoji {
  id: number
  name: string
  image_url: string
  server_id: number
  server?: {
    name: string
    avatar_url: string | null
  }
}

interface Server {
  id: number
  name: string
  avatar_url: string | null
  custom_emojis: CustomEmoji[]
}

interface EmojiPickerProps {
  isOpen: boolean
  onClose: () => void
  onEmojiSelect: (emoji: string, isCustom?: boolean, customEmojiData?: CustomEmoji) => void
  currentServerId: number
  position: { x: number; y: number }
}

export default function EmojiPicker({ isOpen, onClose, onEmojiSelect, currentServerId, position }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [servers, setServers] = useState<Server[]>([])
  const [frequentlyUsed, setFrequentlyUsed] = useState<string[]>([])
  const [hoveredEmoji, setHoveredEmoji] = useState<{
    emoji: string
    name: string
    server?: { name: string; avatar_url: string | null }
    isCustom: boolean
  } | null>(null)
  const [activeCategoryIcon, setActiveCategoryIcon] = useState<string | null>(null)
  const [collapsedServers, setCollapsedServers] = useState<Set<number>>(new Set())
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createBrowserClient()
  const pickerRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      Promise.all([fetchServersWithEmojis(), fetchFrequentlyUsed()]).finally(() => {
        setIsLoading(false)
      })
    } else {
      // Reset state when menu closes
      setSearchQuery("")
      setIsSearchFocused(false)
      setHoveredEmoji(null)
      setActiveCategoryIcon(null)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen, onClose])

  const fetchServersWithEmojis = async () => {
    try {
      const { data: userServers, error: serversError } = await supabase
        .from("server_members")
        .select(`
          server:servers(
            id,
            name,
            avatar_url,
            custom_emojis(id, name, image_url, server_id)
          )
        `)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)

      if (serversError) throw serversError

      const serversWithEmojis =
        userServers
          ?.map((item) => item.server)
          .filter((server) => server && server.custom_emojis && server.custom_emojis.length > 0)
          .map((server) => ({
            ...server,
            custom_emojis: server.custom_emojis.map((emoji) => ({
              ...emoji,
              server: { name: server.name, avatar_url: server.avatar_url },
            })),
          })) || []

      setServers(serversWithEmojis as Server[])
    } catch (error) {
      console.error("Error fetching servers with emojis:", error)
    }
  }

  const fetchFrequentlyUsed = async () => {
    try {
      const { data, error } = await supabase
        .from("emoji_usage")
        .select("emoji_unicode, usage_count")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .eq("emoji_type", "unicode")
        .not("emoji_unicode", "is", null)
        .order("usage_count", { ascending: false })
        .order("last_used_at", { ascending: false })
        .limit(30)

      if (error) throw error

      setFrequentlyUsed(data?.map((item) => item.emoji_unicode).filter(Boolean) || [])
    } catch (error) {
      console.error("Error fetching frequently used emojis:", error)
      setFrequentlyUsed([]) // Set empty array on error
    }
  }

  const handleEmojiClick = async (emoji: string, isCustom = false, customEmojiData?: CustomEmoji) => {
    // Для кастомных эмодзи передаем формат :название:айди:, для обычных - сам эмодзи
    if (isCustom && customEmojiData) {
      onEmojiSelect(`:${customEmojiData.name}:${customEmojiData.id}:`, isCustom, customEmojiData)

      // Track custom emoji usage
      try {
        await supabase.rpc("upsert_emoji_usage", {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_emoji_type: "custom",
          p_emoji_unicode: null,
          p_emoji_id: customEmojiData.id,
          p_server_id: currentServerId,
        })
      } catch (error) {
        console.error("Error tracking custom emoji usage:", error)
      }
    } else {
      onEmojiSelect(emoji, isCustom, customEmojiData)

      // Track unicode emoji usage
      try {
        await supabase.rpc("upsert_emoji_usage", {
          p_user_id: (await supabase.auth.getUser()).data.user?.id,
          p_emoji_type: "unicode",
          p_emoji_unicode: emoji,
          p_emoji_id: null,
          p_server_id: currentServerId,
        })
      } catch (error) {
        console.error("Error tracking unicode emoji usage:", error)
      }
    }

    onClose()
  }

  const scrollToCategory = (categoryId: string) => {
    // Clear search and remove focus
    setSearchQuery("")
    setIsSearchFocused(false)
    if (searchInputRef.current) {
      searchInputRef.current.blur()
    }

    const element = document.getElementById(`category-${categoryId}`)
    if (element && scrollAreaRef.current) {
      element.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const toggleServerCollapse = (serverId: number) => {
    const newCollapsed = new Set(collapsedServers)
    if (newCollapsed.has(serverId)) {
      newCollapsed.delete(serverId)
    } else {
      newCollapsed.add(serverId)
    }
    setCollapsedServers(newCollapsed)
  }

  const filteredEmojis = useMemo(() => {
    if (!searchQuery) return null

    const query = searchQuery.toLowerCase()
    const results: Array<{
      emoji: string
      name: string
      isCustom: boolean
      customData?: CustomEmoji
    }> = []

    // Search custom emojis
    servers.forEach((server) => {
      server.custom_emojis.forEach((customEmoji) => {
        if (customEmoji.name.toLowerCase().includes(query)) {
          results.push({
            emoji: customEmoji.image_url,
            name: customEmoji.name,
            isCustom: true,
            customData: customEmoji,
          })
        }
      })
    })

    return results
  }, [searchQuery, servers])

  // Set initial hovered emoji when picker opens or when data changes
  useEffect(() => {
    if (isOpen && !searchQuery && !isLoading) {
      if (frequentlyUsed.length > 0) {
        setHoveredEmoji({
          emoji: frequentlyUsed[0],
          name: frequentlyUsed[0],
          isCustom: false,
        })
      } else if (servers.length > 0 && servers[0].custom_emojis.length > 0) {
        const firstCustomEmoji = servers[0].custom_emojis[0]
        setHoveredEmoji({
          emoji: firstCustomEmoji.image_url,
          name: firstCustomEmoji.name,
          server: firstCustomEmoji.server,
          isCustom: true,
        })
      }
    }
  }, [isOpen, frequentlyUsed, servers, searchQuery, isLoading])

  if (!isOpen) return null

  const categoryIcons = [
    ...(frequentlyUsed.length > 0 ? [{ id: "frequently-used", icon: Clock, name: "Frequently Used" }] : []),
    ...servers.map((server) => ({
      id: `server-${server.id}`,
      icon: null,
      name: server.name,
      avatar: server.avatar_url,
    })),
  ]

  return (
    <div
      ref={pickerRef}
      className="fixed bg-[#2b2d31] rounded-lg shadow-xl border border-[#1e1f22] z-[9999] w-[520px] h-[450px] overflow-hidden flex flex-col"
      style={{
        left: `${Math.max(10, position.x - 520 + 40)}px`,
        top: Math.max(10, position.y - 460),
      }}
    >
      {/* Header with search */}
      <div className="p-3 border-b border-[#1e1f22] bg-[#252529]">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#949ba4]" />
          <Input
            ref={searchInputRef}
            placeholder="Find the perfect emoji"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className={`bg-[#212126] text-white placeholder-[#949ba4] pr-10 rounded-lg transition-all duration-200 ${
              isSearchFocused ? "border-none" : "border border-gray-500 border-opacity-40"
            }`}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar with category anchors */}
        <div className="w-[44px] bg-[#1a1a1e] border-r border-[#1e1f22] flex flex-col items-center py-2">
          <div className="space-y-2 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1e1f22]">
            {categoryIcons.map((category) => (
              <div key={category.id} className="relative">
                <button
                  onClick={() => scrollToCategory(category.id)}
                  onMouseEnter={() => setActiveCategoryIcon(category.id)}
                  onMouseLeave={() => setActiveCategoryIcon(null)}
                  className={`group relative w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-3xl bg-[#313338] text-[#949ba4] hover:bg-[#5865F2] hover:text-white ${activeCategoryIcon === category.id ? "!rounded-xl bg-[#5865F2] text-white" : "hover:rounded-xl"}`}
                  title={category.name}
                >
                  {category.icon ? (
                    <category.icon className="w-4 h-4" />
                  ) : category.avatar ? (
                    <div
                      className={`w-full h-full transition-all duration-200 rounded-md overflow-hidden bg-[#313338] ${activeCategoryIcon === category.id ? "rounded-xl" : "rounded-3xl group-hover:rounded-xl"}`}
                    >
                      <img
                        src={category.avatar || "/placeholder.svg"}
                        alt={category.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-full h-full transition-all duration-200 rounded-md overflow-hidden bg-[#313338] flex items-center justify-center text-white text-xs ${activeCategoryIcon === category.id ? "rounded-xl" : "rounded-3xl group-hover:rounded-xl"}`}
                    >
                      {category.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#252529]">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <SimpleLoadingSpinner />
            </div>
          ) : (
            <div
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#1e1f22] hover:scrollbar-thumb-[#2e3035]"
            >
              {filteredEmojis ? (
                filteredEmojis.length > 0 ? (
                  <div className="grid grid-cols-8 gap-1">
                    {filteredEmojis.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiClick(item.emoji, item.isCustom, item.customData)}
                        onMouseEnter={() =>
                          setHoveredEmoji({
                            emoji: item.emoji,
                            name: item.name,
                            server: item.customData?.server,
                            isCustom: item.isCustom,
                          })
                        }
                        className="relative w-10 h-10 flex items-center justify-center p-0 rounded-md hover:bg-[#35373c] transition-colors"
                      >
                        <img src={item.emoji || "/placeholder.svg"} alt={item.name} className="w-8 h-8" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-[#949ba4] text-sm">No emojis found for your search</p>
                  </div>
                )
              ) : (
                <>
                  {/* Frequently Used */}
                  {frequentlyUsed.length > 0 && (
                    <div id="category-frequently-used">
                      <h3 className="text-white text-xs font-semibold mb-3 uppercase tracking-wide">FREQUENTLY USED</h3>
                      <div className="grid grid-cols-8 gap-1">
                        {frequentlyUsed.map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => handleEmojiClick(emoji)}
                            onMouseEnter={() =>
                              setHoveredEmoji({
                                emoji,
                                name: emoji,
                                isCustom: false,
                              })
                            }
                            className={`relative w-10 h-10 flex items-center justify-center p-0 rounded-md transition-colors ${
                              hoveredEmoji?.emoji === emoji && !hoveredEmoji.isCustom
                                ? "bg-[#35373c]"
                                : "hover:bg-[#35373c]"
                            }`}
                          >
                            <span className="text-2xl">{emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Server emojis */}
                  {servers.map((server) => (
                    <div key={server.id} id={`category-server-${server.id}`}>
                      <div className="flex items-center mb-2">
                        <div className="w-4 h-4 mr-2 rounded-md overflow-hidden bg-[#313338]">
                          {server.avatar_url ? (
                            <img
                              src={server.avatar_url || "/placeholder.svg"}
                              alt={server.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-[#313338] flex items-center justify-center text-white text-xs">
                              {server.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <h3 className="text-white text-xs font-semibold uppercase tracking-wide flex-1">
                          {server.name.toUpperCase()}
                        </h3>
                        <button
                          onClick={() => toggleServerCollapse(server.id)}
                          className="ml-1 p-1 hover:bg-[#35373c] rounded transition-all duration-200"
                        >
                          <div
                            className={`transition-transform duration-200 ${
                              collapsedServers.has(server.id) ? "rotate-0" : "rotate-90"
                            }`}
                          >
                            <ChevronRight className="w-3 h-3 text-[#b5bac1]" />
                          </div>
                        </button>
                      </div>
                      {!collapsedServers.has(server.id) && (
                        <div className="grid grid-cols-8 gap-1">
                          {server.custom_emojis.map((emoji) => (
                            <button
                              key={emoji.id}
                              onClick={() => handleEmojiClick(emoji.image_url, true, emoji)}
                              onMouseEnter={() =>
                                setHoveredEmoji({
                                  emoji: emoji.image_url,
                                  name: emoji.name,
                                  server: emoji.server,
                                  isCustom: true,
                                })
                              }
                              className={`relative w-10 h-10 flex items-center justify-center p-0 rounded-md transition-colors ${
                                hoveredEmoji?.emoji === emoji.image_url && hoveredEmoji.isCustom
                                  ? "bg-[#35373c]"
                                  : "hover:bg-[#35373c]"
                              }`}
                            >
                              <img src={emoji.image_url || "/placeholder.svg"} alt={emoji.name} className="w-8 h-8" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Footer with hovered emoji info */}
          {hoveredEmoji && !isLoading && (
            <div className="p-3 border-t border-[#1e1f22] bg-[#1a1a1e] flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                {hoveredEmoji.isCustom ? (
                  <img src={hoveredEmoji.emoji || "/placeholder.svg"} alt={hoveredEmoji.name} className="w-8 h-8" />
                ) : (
                  <span className="text-2xl">{hoveredEmoji.emoji}</span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">:{hoveredEmoji.name}:</span>
                {hoveredEmoji.server && <span className="text-[#949ba4] text-xs">from {hoveredEmoji.server.name}</span>}
              </div>
              {hoveredEmoji.server && (
                <div className="w-8 h-8 ml-auto rounded-md overflow-hidden bg-[#313338]">
                  {hoveredEmoji.server.avatar_url ? (
                    <img
                      src={hoveredEmoji.server.avatar_url || "/placeholder.svg"}
                      alt={hoveredEmoji.server.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#313338] flex items-center justify-center text-white text-xs">
                      {hoveredEmoji.server.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-track-transparent {
          scrollbar-color: transparent transparent;
        }
        .scrollbar-thumb-\\[\\#1e1f22\\] {
          scrollbar-color: #1e1f22 transparent;
        }
        .hover\\:scrollbar-thumb-\\[\\#2e3035\\]:hover {
          scrollbar-color: #2e3035 transparent;
        }
        
        /* Webkit scrollbar styles */
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #1e1f22;
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #2e3035;
        }
      `}</style>
    </div>
  )
}
