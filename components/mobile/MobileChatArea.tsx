"use client"

import type React from "react"
import { Volume2 } from "lucide-react"
import ChatArea from "../ChatArea"
import VoiceArea from "../VoiceArea"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { css } from "@emotion/react"

type Message = {
  id: number
  content: string
  created_at: string
  user_id: string
  channel_id: number
  file_url?: string
  status?: "pending" | "sent"
  user?: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    is_verified?: boolean
    roleColor?: string
  }
  reply_to?: number | null
  updated_at?: string
  mentions?: string[]
  mention_in_reply?: boolean
}

type MobileChatAreaProps = {
  channelId: number | null
  channelName: string | null
  serverId: number | null
  onBack: () => void
  channelType?: "text" | "voice"
  onLeaveVoice?: () => void
}

const scrollbarStyles = css`
  &::-webkit-scrollbar {
    width: 4px;
    background-color: #2b2d31;
  }

  &::-webkit-scrollbar-track {
    background-color: #2b2d31;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #1e1f22;
    border-radius: 2px;
    border: 1px solid #2b2d31;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #18191c;
  }
`

const formatMessageTime = (date: Date) => {
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

export default function MobileChatArea({
  channelId,
  channelName,
  serverId,
  onBack,
  channelType = "text",
  onLeaveVoice,
}: MobileChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isMessagesLoading, setIsMessagesLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const supabase = createClientComponentClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingMessages, setPendingMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null)
  const { toast } = useToast()
  const [channelDescription, setChannelDescription] = useState<string | null>(null)
  const [allowMessages, setAllowMessages] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<any[]>([])

  // If this is a voice channel, render VoiceArea instead
  const renderVoiceArea = () => {
    if (channelType === "voice" && channelId) {
      return (
        <div className="flex flex-col h-full bg-[#313338]">
          <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm">
            <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-[#949ba4]">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
          <VoiceArea
            channelId={channelId}
            channelName={channelName || "Voice Channel"}
            serverId={serverId}
            onLeave={onLeaveVoice || onBack}
          />
        </div>
      )
    }
    return null
  }

  const fetchMessages = useCallback(async () => {
    if (!channelId) return
    setIsMessagesLoading(true)
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })

      if (error) throw error

      // Fetch user information separately
      const userIds = [...new Set(data.map((message) => message.user_id))]
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", userIds)

      if (usersError) throw usersError

      const messagesWithUsers = data.map((message) => {
        const user = usersData.find((user) => user.id === message.user_id)
        return {
          ...message,
          user: user ? { ...user } : undefined,
        }
      })

      setMessages(messagesWithUsers)
    } catch (error) {
      console.error("Error fetching messages:", error)
      toast({
        title: "Error",
        description: "Could not load messages. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsMessagesLoading(false)
    }
  }, [channelId, supabase, toast])

  const fetchChannelInfo = useCallback(async () => {
    if (!channelId) return

    try {
      const { data: channelData, error: channelError } = await supabase
        .from("channels")
        .select("description, allow_messages")
        .eq("id", channelId)
        .single()

      if (channelError) throw channelError

      setChannelDescription(channelData.description)
      setAllowMessages(channelData.allow_messages !== false)
    } catch (error) {
      console.error("Error fetching channel info:", error)
    }
  }, [channelId, supabase])

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchUser()
  }, [supabase])

  useEffect(() => {
    if (!channelId) return

    fetchChannelInfo()
    fetchMessages()

    const channel = supabase
      .channel(`public:messages:channel_id=eq.${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: newMessage, error } = await supabase
            .from("messages")
            .select("*")
            .eq("id", payload.new.id)
            .single()

          if (error) {
            console.error("Error fetching new message:", error)
            return
          }

          const { data: userData, error: userError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url, is_verified")
            .eq("id", newMessage.user_id)
            .single()

          if (userError) {
            console.error("Error fetching user data:", userError)
            return
          }

          const messageWithUser = {
            ...newMessage,
            user: {
              ...userData,
            },
          }

          setPendingMessages((prev) =>
            prev.filter(
              (msg) =>
                !(
                  msg.content === messageWithUser.content &&
                  msg.user_id === messageWithUser.user_id &&
                  Math.abs(new Date(msg.created_at).getTime() - new Date(messageWithUser.created_at).getTime()) < 5000
                ),
            ),
          )

          setMessages((currentMessages) => [...currentMessages, messageWithUser])

          if (isAtBottom) {
            scrollToBottom()
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, supabase, fetchMessages, fetchChannelInfo, isAtBottom])

  useEffect(() => {
    // Clear attached files when changing channels
    setAttachedFiles([])
  }, [channelId, serverId])

  const scrollToBottom = useCallback((smooth = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      })
    }
  }, [])

  const formatDate = (date: Date) => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [scrollToBottom])

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!channelId || !newMessage.trim() || !currentUser) {
      return
    }

    const messageContent = newMessage.trim()

    if (messageContent.length > 2000) {
      setIsWarningModalOpen(true)
      return
    }

    setIsSending(true)

    try {
      let mentions: string[] = []

      if (messageContent.includes("@")) {
        try {
          const response = await fetch("/api/process-mentions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: messageContent,
              channelId,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            mentions = data.mentions || []
          }
        } catch (error) {
          console.error("Error processing mentions:", error)
        }
      }

      if (replyingToMessage && replyingToMessage.user_id) {
        if (!mentions.includes(replyingToMessage.user_id)) {
          mentions.push(replyingToMessage.user_id)
        }
      }

      const tempMessage: Message = {
        id: Date.now(),
        content: messageContent,
        created_at: new Date().toISOString(),
        user_id: currentUser.id,
        channel_id: channelId,
        status: "pending",
        reply_to: replyingToMessage ? replyingToMessage.id : null,
        mention_in_reply: true,
        user: {
          id: currentUser.id,
          username: currentUser.user_metadata.username || currentUser.email?.split("@")[0],
          display_name: currentUser.user_metadata.display_name || currentUser.email?.split("@")[0],
          avatar_url: currentUser.user_metadata.avatar_url,
          is_verified: currentUser.user_metadata.is_verified,
        },
        mentions: mentions,
      }

      setPendingMessages((prev) => [...prev, tempMessage])

      const { error } = await supabase.from("messages").insert({
        content: messageContent,
        channel_id: channelId,
        user_id: currentUser.id,
        reply_to: replyingToMessage ? replyingToMessage.id : null,
        mentions: mentions,
        mention_in_reply: true,
      })

      if (error) throw error

      setNewMessage("")
      setReplyingToMessage(null)
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
      setPendingMessages((prev) => prev.filter((msg) => msg.id !== Date.now()))
    } finally {
      setIsSending(false)
    }
  }

  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
      setIsAtBottom(isNearBottom)
    }
  }, [])

  useEffect(() => {
    const container = chatContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  const handleFileUpload = async (fileUrl: string) => {
    if (!channelId || !currentUser) return

    try {
      const { error } = await supabase.from("messages").insert({
        content: "Attached a file",
        channel_id: channelId,
        user_id: currentUser.id,
        file_url: fileUrl,
      })

      if (error) throw error
    } catch (error) {
      console.error("Error sending file message:", error)
      toast({
        title: "Upload Error",
        description: error,
        variant: "destructive",
      })
    }
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleTyping = useCallback(() => {
    if (!currentUser || !channelId) return

    const username = currentUser.user_metadata.display_name || currentUser.email?.split("@")[0] || "User"

    supabase
      .from("typing_status")
      .upsert(
        { user_id: currentUser.id, channel_id: channelId, username, is_typing: true },
        { onConflict: "user_id, channel_id" },
      )
      .then(() => {
        if (typingTimeoutRef.current[currentUser.id]) {
          clearTimeout(typingTimeoutRef.current[currentUser.id])
        }

        typingTimeoutRef.current[currentUser.id] = setTimeout(() => {
          supabase
            .from("typing_status")
            .upsert(
              { user_id: currentUser.id, channel_id: channelId, username, is_typing: false },
              { onConflict: "user_id, channel_id" },
            )
            .then(() => {
              delete typingTimeoutRef.current[currentUser.id]
            })
        }, 1000)
      })
  }, [currentUser, channelId, supabase])

  useEffect(() => {
    if (!channelId) return

    const typingChannel = supabase
      .channel(`typing_channel_${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_status",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const { user_id, username, is_typing } = payload.new
          setTypingUsers((prev) => {
            if (is_typing && !prev.includes(username)) {
              return [...prev, username]
            } else if (!is_typing) {
              return prev.filter((u) => u !== username)
            }
            return prev
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(typingChannel)
    }
  }, [channelId, supabase])

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    handleTyping()
  }

  const handleReply = (message: Message) => {
    setReplyingToMessage(message)
    inputRef.current?.focus()
  }

  const handleCancelReply = () => {
    setReplyingToMessage(null)
  }

  const scrollToMessage = useCallback((messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
      messageElement.classList.add("highlight")
      setTimeout(() => messageElement.classList.remove("highlight"), 2000)
    }
  }, [])

  useEffect(() => {
    if (messages.length > 0 && isAtBottom) {
      scrollToBottom()
    }
  }, [messages, isAtBottom, scrollToBottom])

  if (!channelId || !serverId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338]">
        <p className="text-xl text-[#949ba4]">Select a channel</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      {/* Mobile header */}
      <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm bg-[#313338]">
        <Button variant="ghost" size="sm" onClick={onBack} className="mr-2 p-1 h-auto text-[#949ba4] hover:text-white">
          ←
        </Button>
        {channelType === "voice" ? (
          <Volume2 className="w-5 h-5 text-[#949ba4] mr-2" />
        ) : (
          <span className="text-[#949ba4] mr-2">#</span>
        )}
        <h2 className="font-semibold text-white">{channelName}</h2>
      </div>

      {/* Render appropriate component based on channel type */}
      {channelType === "voice" ? (
        <VoiceArea
          channelId={channelId}
          channelName={channelName || ""}
          serverId={serverId}
          onLeave={onLeaveVoice || onBack}
        />
      ) : (
        <ChatArea
          channelId={channelId}
          channelName={channelName}
          serverId={serverId}
          channelType={channelType}
          onLeaveVoice={onLeaveVoice}
        />
      )}
    </div>
  )
}
