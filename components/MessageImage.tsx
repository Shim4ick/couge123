"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { X, Download } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion, AnimatePresence } from "framer-motion"

interface MessageImageProps {
  url: string
  alt?: string
  user?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
  }
  timestamp?: string
}

const MessageImage: React.FC<MessageImageProps> = ({ url, alt = "Attached image", user, timestamp }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()

    // Create a fetch request to get the image as a blob
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        // Create a blob URL for the image
        const blobUrl = URL.createObjectURL(blob)

        // Create an anchor element
        const link = document.createElement("a")

        // Set download attribute to force download instead of navigation
        link.download = url.split("/").pop() || "image"
        link.href = blobUrl

        // Hide the element
        link.style.display = "none"

        // Add to DOM, click it, and remove it
        document.body.appendChild(link)
        link.click()

        // Clean up by removing the element and revoking the blob URL
        setTimeout(() => {
          document.body.removeChild(link)
          URL.revokeObjectURL(blobUrl)
        }, 100)
      })
      .catch((error) => {
        console.error("Error downloading image:", error)
      })
  }

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(false)
  }

  const formatMessageTime = (dateString?: string) => {
    if (!dateString) return ""

    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${time}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${time}`
    } else {
      return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${date.getFullYear()} ${time}`
    }
  }

  // Prevent context menu on the expanded image
  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    return false
  }, [])

  return (
    <div className="mt-2 relative">
      <div className="inline-block max-w-xs cursor-pointer" onClick={toggleExpand}>
        <img
          src={url || "/placeholder.svg"}
          alt={alt}
          className="rounded-md max-h-80 hover:opacity-90 transition-opacity"
        />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleExpand}
            onContextMenu={preventContextMenu}
          >
            {/* Floating header elements without black background */}
            <div className="fixed top-0 left-0 right-0 flex justify-between items-center p-4 z-10">
              <div className="flex items-center">
                {user && (
                  <>
                    <Avatar className="w-8 h-8 mr-2">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="text-white">
                      <div className="font-medium">{user.display_name}</div>
                      <div className="text-xs opacity-80">{formatMessageTime(timestamp)}</div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={handleDownload} className="text-white hover:text-gray-300 transition-colors">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={handleClose} className="text-white hover:text-gray-300 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Image container */}
            <motion.div
              className="w-full h-full flex items-center justify-center"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <img
                src={url || "/placeholder.svg"}
                alt={alt}
                className="max-h-[calc(100vh-120px)] max-w-[90vw] object-contain"
                onContextMenu={preventContextMenu}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MessageImage
