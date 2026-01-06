"use client"

import type React from "react"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import UserMenu from "./UserMenu"
import { useCallback, useState, useRef, useEffect } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

type Server = {
  id: number
  name: string
  invite_code: string
  owner_id: string
  avatar_url: string | null
  position?: number
}

type ServerListProps = {
  servers: Server[]
  selectedServer: number | null
  onServerClick: (serverId: number) => void
  onCreateServer: () => void
  onSignOut: () => void
  onDeleteServer: (serverId: number) => void
  currentUserId: string | undefined
  currentUser: any
}

export default function ServerList({
  servers,
  selectedServer,
  onServerClick,
  onCreateServer,
  onSignOut,
  onDeleteServer,
  currentUserId,
  currentUser,
}: ServerListProps) {
  const updateProfile = useCallback(() => {
    console.log("Updating profile...")
  }, [])

  const supabase = createClient()
  const [draggingServer, setDraggingServer] = useState<number | null>(null)
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState<number | null>(null)
  const [sortedServers, setSortedServers] = useState<Server[]>([])
  const serverRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const dragStartPosition = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollFade, setShowScrollFade] = useState(false)

  // Check if scrolling is needed
  useEffect(() => {
    const checkScrollNeeded = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current
        setShowScrollFade(scrollHeight > clientHeight)
      }
    }

    checkScrollNeeded()
    window.addEventListener("resize", checkScrollNeeded)

    return () => {
      window.removeEventListener("resize", checkScrollNeeded)
    }
  }, [sortedServers])

  // Fetch and sort servers with personal positions
  useEffect(() => {
    const fetchServerPositions = async () => {
      if (!currentUserId || servers.length === 0) {
        setSortedServers(servers)
        return
      }

      // Get personal positions for current user
      const { data: positions } = await supabase
        .from("server_positions")
        .select("server_id, position")
        .eq("user_id", currentUserId)

      const positionMap = new Map(positions?.map((p) => [p.server_id, p.position]) || [])

      // Sort servers by personal position, fallback to server creation order
      const sorted = [...servers].sort((a, b) => {
        const posA = positionMap.get(a.id) ?? 999999
        const posB = positionMap.get(b.id) ?? 999999
        if (posA === posB) {
          return a.id - b.id // Fallback to server ID for consistent ordering
        }
        return posA - posB
      })

      setSortedServers(sorted)
    }

    fetchServerPositions()
  }, [servers, currentUserId, supabase])

  const createDragImage = useCallback((server: Server) => {
    const dragElement = document.createElement("div")
    dragElement.style.width = "48px"
    dragElement.style.height = "48px"
    dragElement.style.borderRadius = "16px"
    dragElement.style.position = "absolute"
    dragElement.style.top = "-1000px"
    dragElement.style.left = "-1000px"
    dragElement.style.pointerEvents = "none"
    dragElement.style.zIndex = "9999"

    if (server.avatar_url) {
      // Create image element for avatar
      const img = document.createElement("img")
      img.src = server.avatar_url
      img.style.width = "100%"
      img.style.height = "100%"
      img.style.borderRadius = "16px"
      img.style.objectFit = "cover"
      dragElement.appendChild(img)
    } else {
      // Create text element for server initial
      dragElement.style.backgroundColor = "#313338"
      dragElement.style.color = "white"
      dragElement.style.display = "flex"
      dragElement.style.alignItems = "center"
      dragElement.style.justifyContent = "center"
      dragElement.style.fontSize = "20px"
      dragElement.style.fontWeight = "bold"
      dragElement.textContent = server.name.charAt(0).toUpperCase()
    }

    document.body.appendChild(dragElement)
    return dragElement
  }, [])

  const handleDragStart = useCallback(
    (e: React.DragEvent, serverId: number) => {
      if (!e || !e.dataTransfer) return

      // Set drag effect
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", "")

      // Find the server
      const server = sortedServers.find((s) => s.id === serverId)
      if (server) {
        // Create custom drag image
        const dragImage = createDragImage(server)

        // Set the drag image
        e.dataTransfer.setDragImage(dragImage, 24, 24)

        // Clean up the temporary element after a short delay
        setTimeout(() => {
          if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage)
          }
        }, 100)
      }

      setDraggingServer(serverId)
      dragStartPosition.current = sortedServers.findIndex((s) => s.id === serverId)
    },
    [sortedServers, createDragImage],
  )

  const handleDragEnd = useCallback(async () => {
    if (draggingServer !== null && dropIndicatorPosition !== null && currentUserId) {
      const draggedServerIndex = sortedServers.findIndex((s) => s.id === draggingServer)

      // Check if position actually changed
      if (draggedServerIndex !== -1 && dragStartPosition.current !== null) {
        const targetIndex =
          dropIndicatorPosition > draggedServerIndex ? dropIndicatorPosition - 1 : dropIndicatorPosition

        // Only update if position actually changed
        if (targetIndex !== draggedServerIndex) {
          const newServers = [...sortedServers]
          const [draggedServer] = newServers.splice(draggedServerIndex, 1)
          newServers.splice(targetIndex, 0, draggedServer)

          // Update local state immediately
          setSortedServers(newServers)

          // Update positions in database
          const updates = newServers.map((server, index) => ({
            user_id: currentUserId,
            server_id: server.id,
            position: index,
          }))

          // Use upsert to handle both insert and update
          try {
            for (const update of updates) {
              await supabase.from("server_positions").upsert(update, {
                onConflict: "user_id,server_id",
              })
            }
          } catch (error) {
            console.error("Failed to update server positions:", error)
          }
        }
      }
    }

    setDraggingServer(null)
    setDropIndicatorPosition(null)
    dragStartPosition.current = null
  }, [draggingServer, dropIndicatorPosition, currentUserId, sortedServers, supabase])

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"

      if (draggingServer === null) return

      const draggedServerIndex = sortedServers.findIndex((s) => s.id === draggingServer)

      const serverElement = serverRefs.current.get(sortedServers[index].id)
      if (!serverElement) return

      const rect = serverElement.getBoundingClientRect()
      const mouseY = e.clientY

      // Determine if we're in the top or bottom half of the server icon
      const isInTopHalf = mouseY < rect.top + rect.height / 2
      const newPosition = isInTopHalf ? index : index + 1

      // Don't show indicator if it would result in the same position
      const targetIndex = newPosition > draggedServerIndex ? newPosition - 1 : newPosition

      if (targetIndex === draggedServerIndex) {
        setDropIndicatorPosition(null)
        return
      }

      setDropIndicatorPosition(newPosition)
    },
    [draggingServer, sortedServers],
  )

  const handleContainerDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  const handleContainerDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleDragEnd()
    },
    [handleDragEnd],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear drop indicator if we're leaving the entire container
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setDropIndicatorPosition(null)
    }
  }, [])

  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col relative">
      {/* Scrollable servers section */}
      <div className="flex-1 flex flex-col items-center py-3 relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto custom-scrollbar px-3"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitScrollbar: { display: "none" },
          }}
        >
          <div
            ref={containerRef}
            className="space-y-2"
            onDragOver={handleContainerDragOver}
            onDrop={handleContainerDrop}
            onDragLeave={handleDragLeave}
          >
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div className="relative">
                    <Button
                      variant="ghost"
                      className={`relative w-12 h-12 rounded-[24px] bg-[#313338] text-white hover:bg-indigo-500 hover:rounded-[16px] transition-all duration-200 group mb-1 flex items-center justify-center overflow-visible
${selectedServer === 0 ? "bg-indigo-500 rounded-[16px]" : ""}
before:absolute before:-left-[12px] before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:bg-white before:rounded-r
before:transition-all before:duration-200 before:ease-in-out
${
  selectedServer === 0
    ? "before:opacity-100 before:h-10"
    : "before:opacity-0 before:h-5 hover:before:opacity-100 hover:before:h-5"
}`}
                      onClick={() => onServerClick(0)}
                    >
                      <div className="w-10 h-10 flex items-center justify-center">
                        <Image
                          src="/images/couge-logo.svg"
                          alt="Home"
                          width={64}
                          height={64}
                          className="w-full h-full scale-[2.0]"
                          priority
                        />
                      </div>
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-[#1e1f22] border-none text-white">
                  <p>Home</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="w-12 h-[2px] bg-[#35363c] rounded-lg mb-2" />

            {/* Drop indicator at the top */}
            {dropIndicatorPosition === 0 && draggingServer !== null && (
              <div className="w-12 h-1 bg-[#23a559] rounded-full mb-1" />
            )}

            {sortedServers.map((server, index) => (
              <div key={server.id} className="relative">
                <div
                  ref={(el) => {
                    if (el) serverRefs.current.set(server.id, el)
                  }}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, server.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  className="relative cursor-move"
                  style={{ userSelect: "none" }}
                >
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div className="relative">
                          <Button
                            variant="ghost"
                            className={`relative w-12 h-12 rounded-[24px] bg-[#313338] text-white transition-all duration-200 group mb-1
${selectedServer === server.id ? "bg-indigo-500 rounded-[16px]" : ""}
before:absolute before:-left-[12px] before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:bg-white before:rounded-r
before:transition-all before:duration-200 before:ease-in-out
${
  selectedServer === server.id && draggingServer !== server.id
    ? "before:opacity-100 before:h-10"
    : draggingServer === server.id
      ? "before:opacity-0"
      : "before:opacity-0 before:h-5 hover:before:opacity-100 hover:before:h-5"
}
${
  draggingServer === server.id
    ? "opacity-50 bg-[#313338] rounded-[16px] pointer-events-none"
    : "hover:bg-indigo-500 hover:rounded-[16px]"
}`}
                            onClick={() => onServerClick(server.id)}
                          >
                            {server.avatar_url && draggingServer !== server.id ? (
                              <img
                                src={server.avatar_url || "/placeholder.svg"}
                                alt={server.name}
                                className="absolute inset-0 w-full h-full rounded-[inherit] object-cover"
                                draggable={false}
                              />
                            ) : (
                              draggingServer !== server.id && <span>{server.name.charAt(0).toUpperCase()}</span>
                            )}
                          </Button>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="bg-[#1e1f22] border-none text-white"
                        sideOffset={12}
                        align="center"
                      >
                        <p>{server.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Drop indicator after each server */}
                {dropIndicatorPosition === index + 1 && draggingServer !== null && (
                  <div className="w-12 h-1 bg-[#23a559] rounded-full mt-1 mb-1" />
                )}
              </div>
            ))}

            <Button
              variant="ghost"
              className="w-12 h-12 rounded-[24px] bg-[#313338] text-[#23a559] hover:bg-[#23a559] hover:text-white hover:rounded-[16px] transition-all duration-200"
              onClick={onCreateServer}
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {/* Gradient fade overlay when scrolling is needed */}
        {showScrollFade && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#1e1f22] to-transparent pointer-events-none z-10" />
        )}
      </div>

      {/* Fixed user menu at bottom */}
      <div className="bg-[#1e1f22] py-3 flex justify-center relative z-20">
        <UserMenu user={currentUser} onSignOut={onSignOut} onUpdateProfile={updateProfile} />
      </div>
    </div>
  )
}
