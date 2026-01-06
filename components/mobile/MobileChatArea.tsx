"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Hash, Plus, X, Reply, Ban, ArrowLeft } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import { css } from "@emotion/react"
import { WarningModal } from "@/components/WarningModal"
import FileUpload from "@/components/FileUpload"
import { TypingIndicator } from "@/components/TypingIndicator"
import FormattedText from "@/components/FormattedText"
import MessageSkeleton from "@/components/MessageSkeleton"

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
  serverId: number
  onBack: () => void
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

export default function MobileChatArea({ channelId, channelName, serverId, onBack }: MobileChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isMessagesLoading, setIsMessagesLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const supabase = createBrowserClient()
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

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338] h-full">
        <p className="text-xl text-[#949ba4]">Select a channel to start chatting</p>
      </div>
    )
  }

  const messageSkeletons = Array(8)
    .fill(0)
    .map((_, index) => <MessageSkeleton key={`skeleton-${index}`} />)

  return (
    <div className="flex flex-col h-full bg-[#313338]">
      <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 text-[#949ba4]">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <Hash className="w-5 h-5 text-[#949ba4] mr-2" />
        <h2 className="font-semibold text-white">{channelName || "Select a channel"}</h2>
        {channelDescription && (
          <>
            <div className="mx-2 h-6 w-px bg-[#4f545c]"></div>
            <p className="text-[#949ba4] text-sm truncate">{channelDescription}</p>
          </>
        )}
      </div>
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
        css={scrollbarStyles}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1e1f22 #2b2d31" }}
      >
        {isMessagesLoading ? (
          <div className="space-y-6">{messageSkeletons}</div>
        ) : (
          ([...messages, ...pendingMessages] as Message[])
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .reduce((acc: React.ReactNode[], message, index, array) => {
              const messageDate = new Date(message.created_at)
              if (index === 0 || formatDate(messageDate) !== formatDate(new Date(array[index - 1].created_at))) {
                acc.push(
                  <div key={`date-${message.id}`} className="flex items-center my-4">
                    <div className="flex-grow border-t border-[#3f4147]"></div>
                    <span className="flex-shrink-0 mx-4 text-[#949ba4] text-sm">{formatDate(messageDate)}</span>
                    <div className="flex-grow border-t border-[#3f4147]"></div>
                  </div>,
                )
              }
              const isPending = message.status === "pending"

              acc.push(
                <div
                  key={message.id}
                  id={`message-${message.id}`}
                  className="group hover:bg-[#2e3035] rounded px-4 py-0.5 -mx-2"
                  onDoubleClick={() => !isPending && handleReply(message)}
                >
                  {message.reply_to && (
                    <div
                      className="flex items-center text-[#949ba4] text-xs mb-1 cursor-pointer hover:underline"
                      onClick={() => scrollToMessage(message.reply_to!)}
                    >
                      <div className="w-8 border-l-2 border-t-2 border-[#949ba4] h-3 mr-2 rounded-tl-md"></div>
                      <Avatar className="w-4 h-4 rounded-full mr-1">
                        <AvatarImage
                          src={messages.find((msg) => msg.id === message.reply_to)?.user?.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {messages
                            .find((msg) => msg.id === message.reply_to)
                            ?.user?.display_name?.charAt(0)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold mr-1">
                        {messages.find((msg) => msg.id === message.reply_to)?.user?.display_name || "User"}
                      </span>
                      <span className="truncate max-w-[200px]">
                        {messages.find((msg) => msg.id === message.reply_to)?.content ? (
                          <FormattedText content={messages.find((msg) => msg.id === message.reply_to)?.content || ""} />
                        ) : messages.find((msg) => msg.id === message.reply_to)?.file_url ? (
                          "Attached File"
                        ) : (
                          ""
                        )}
                      </span>
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      <Avatar className="w-10 h-10 rounded-full">
                        <AvatarImage
                          src={isPending ? currentUser?.user_metadata.avatar_url : message.user?.avatar_url}
                        />
                        <AvatarFallback>
                          {(isPending ? currentUser?.user_metadata.display_name : message.user?.display_name)
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-medium" style={{ color: message.user?.roleColor || "white" }}>
                          {message.user?.display_name}
                        </span>
                        <span className="text-xs text-[#949ba4]">
                          {formatMessageTime(new Date(message.created_at))}
                        </span>
                      </div>
                      <>
                        {message.file_url ? (
                          <div className="mt-2">
                            <a
                              href={message.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline"
                            >
                              Attached file
                            </a>
                          </div>
                        ) : message.status === "pending" ? (
                          <div className="text-[#72767d]">{message.content}</div>
                        ) : (
                          <FormattedText content={message.content} serverId={serverId} onProfileClick={() => {}} />
                        )}
                        {message.updated_at && message.updated_at !== message.created_at && (
                          <span className="text-xs text-[#949ba4] mt-1 block">(edited)</span>
                        )}
                      </>
                    </div>
                  </div>
                </div>,
              )
              return acc
            }, [])
        )}
      </div>
      <div className="px-4 pb-1">
        <TypingIndicator typingUsers={typingUsers.filter((user) => user !== currentUser?.user_metadata.display_name)} />
      </div>
      <form onSubmit={sendMessage} className="px-4 pb-6">
        {replyingToMessage && (
          <div className="flex items-center bg-[#2b2d31] rounded-t-lg px-4 py-2 text-[#949ba4]">
            <div className="flex items-center flex-grow">
              <Reply className="w-4 h-4 mr-2 text-[#949ba4]" />
              <span className="font-medium text-[#949ba4] mr-2">Replying to</span>
              <Avatar className="w-5 h-5 mr-2">
                <AvatarImage src={replyingToMessage.user?.avatar_url || undefined} />
                <AvatarFallback>{replyingToMessage.user?.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-[#a7a8ab] truncate">{replyingToMessage.user?.display_name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#949ba4] hover:text-white p-0 h-auto"
              onClick={handleCancelReply}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
        <div className="flex items-center space-x-2 bg-[#383a40] rounded-lg">
          {allowMessages ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#b5bac1] hover:text-white"
                onClick={handleAttachmentClick}
                disabled={isUploading}
              >
                <Plus className="w-5 h-5" />
              </Button>
              <Input
                ref={inputRef}
                type="text"
                placeholder={`Message #${channelName || "channel"}`}
                value={newMessage}
                onChange={handleMessageChange}
                className="flex-1 bg-transparent text-white placeholder-[#949ba4] focus:outline-none border-none text-base py-6"
                disabled={isSending || isUploading}
              />
              <FileUpload
                ref={fileInputRef}
                channelId={channelId}
                onUploadStart={() => setIsUploading(true)}
                onUploadComplete={(fileUrl) => {
                  setIsUploading(false)
                  handleFileUpload(fileUrl)
                }}
                onUploadError={(error) => {
                  setIsUploading(false)
                  toast({
                    title: "Upload Error",
                    description: error,
                    variant: "destructive",
                  })
                }}
              />
            </>
          ) : (
            <div className="flex items-center flex-1 py-3 px-3 text-[#949ba4] select-none">
              <Ban className="w-5 h-5 mr-2" />
              You do not have permission to send messages in this channel.
            </div>
          )}
        </div>
      </form>
      <WarningModal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        type="character"
        characterCount={newMessage.trim().length}
      />
      <style jsx>{`
        .highlight {
          background-color: rgba(255, 255, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
