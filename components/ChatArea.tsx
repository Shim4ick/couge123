"use client"

import type React from "react"

import "@/app/globals.css"
import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Hash, Plus, X, Reply, Ban, Smile, ChevronUp, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import UserProfileModal from "./UserProfileModal"
import { css } from "@emotion/react"
import { WarningModal } from "@/components/WarningModal"
import FileUpload from "./FileUpload"
import { MessageContextMenu } from "./MessageContextMenu"
import { TypingIndicator } from "./TypingIndicator"
import FormattedText from "./FormattedText"
import MessageSkeleton from "./MessageSkeleton"
import FilePreview, { type AttachmentFile } from "./FilePreview"
import MessageImage from "./MessageImage"
import MiniUserProfile from "./MiniUserProfile"
import EmojiPicker from "./EmojiPicker"

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

type DraftMessage = {
  content: string
  replyingTo: Message | null
  mentionInReply: boolean
}

type ChatAreaProps = {
  channelId: number | null
  channelName: string | null
  serverId: number
}

type UserRole = {
  user_id: string
  role_id: number
  role: {
    id: number
    name: string
    color: string
    gradient_color: string | null
    position: number
  }
}

const MESSAGES_PER_PAGE = 50
const MESSAGES_LOAD_MORE = 25

const scrollbarStyles = css`
  &::-webkit-scrollbar {
    width: 8px;
    background-color: #2b2d31;
  }

  &::-webkit-scrollbar-track {
    background-color: #2b2d31;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #1e1f22;
    border-radius: 4px;
    border: 2px solid #2b2d31;
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
    return `${date.getDate().toString().padStart(2, "0")}.${(date.getMonth() + 1).toString().padStart(2, "0")}.${date.getFullYear()} ${time}`
  }
}

const isNearBottom = (container: HTMLDivElement) => {
  const threshold = 150
  return container.scrollHeight - container.scrollTop - container.clientHeight < threshold
}

export default function ChatArea({ channelId, channelName, serverId }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [hasMoreOlder, setHasMoreOlder] = useState(false)
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)
  const [totalMessageCount, setTotalMessageCount] = useState(0)

  const [newMessage, setNewMessage] = useState("")
  const [isMessagesLoading, setIsMessagesLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<any>(null)
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingMessages, setPendingMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const typingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const { toast } = useToast()
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)
  const lastScrollPositionRef = useRef(0)
  const jumpToBottomRef = useRef<HTMLDivElement>(null)
  const [draftMessages, setDraftMessages] = useState<Record<number, DraftMessage>>({})
  const [channelDescription, setChannelDescription] = useState<string | null>(null)
  const [allowMessages, setAllowMessages] = useState(true)
  const [isServerOwner, setIsServerOwner] = useState(false)
  const [userRoles, setUserRoles] = useState<Record<string, UserRole[]>>({})
  const [userMentions, setUserMentions] = useState<number[]>([])
  const [mentionInReply, setMentionInReply] = useState(true)
  const [attachedFiles, setAttachedFiles] = useState<AttachmentFile[]>([])
  const [miniProfileUser, setMiniProfileUser] = useState<string | null>(null)
  const [miniProfilePosition, setMiniProfilePosition] = useState({ x: 0, y: 0 })
  const [isUploading, setIsUploading] = useState(false)
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false)
  const [emojiPickerPosition, setEmojiPickerPosition] = useState({ x: 0, y: 0 })
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const scrollHeightBeforeLoad = useRef(0)

  const saveChannelInfoToCache = useCallback(
    (channelId: number, info: { description: string | null; allowMessages: boolean }) => {
      try {
        const cacheKey = `channel_info_${channelId}`
        localStorage.setItem(cacheKey, JSON.stringify(info))
      } catch (error) {
        console.error("Error saving channel info to localStorage:", error)
      }
    },
    [],
  )

  const getChannelInfoFromCache = useCallback(
    (channelId: number): { description: string | null; allowMessages: boolean } | null => {
      try {
        const cacheKey = `channel_info_${channelId}`
        const cachedData = localStorage.getItem(cacheKey)
        if (cachedData) {
          return JSON.parse(cachedData)
        }
        return null
      } catch (error) {
        console.error("Error getting channel info from localStorage:", error)
        return null
      }
    },
    [],
  )

  const fetchUserRoles = useCallback(
    async (userIds: string[]) => {
      if (!serverId || userIds.length === 0) return

      try {
        const { data: serverRoles, error: rolesError } = await supabase
          .from("server_roles")
          .select("*")
          .eq("server_id", serverId)
          .order("position", { ascending: true })

        if (rolesError) throw rolesError

        if (!serverRoles || serverRoles.length === 0) {
          setUserRoles({})
          return
        }

        const { data: roleMembers, error: membersError } = await supabase
          .from("role_members")
          .select(`
        user_id,
        role_id,
        role:server_roles(*)
      `)
          .in(
            "role_id",
            serverRoles.map((r) => r.id),
          )
          .in("user_id", userIds)

        if (membersError) throw membersError

        if (!roleMembers || roleMembers.length === 0) {
          setUserRoles({})
          return
        }

        const userRolesMap: Record<string, UserRole[]> = {}
        roleMembers.forEach((rm) => {
          if (!userRolesMap[rm.user_id]) {
            userRolesMap[rm.user_id] = []
          }
          userRolesMap[rm.user_id].push(rm as UserRole)
        })

        setUserRoles(userRolesMap)
      } catch (error) {
        console.error("Error fetching user roles:", error)
        setUserRoles({})
      }
    },
    [serverId, supabase],
  )

  const fetchMessages = useCallback(async () => {
    if (!channelId) return
    setIsMessagesLoading(true)
    try {
      const { data, error, count } = await supabase
        .from("messages")
        .select("*", { count: "exact" })
        .eq("channel_id", channelId)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_PER_PAGE)

      if (error) throw error

      setHasMoreOlder((count || 0) > MESSAGES_PER_PAGE)

      // Reverse to get chronological order
      const sortedData = data.reverse()

      const userIds = [...new Set(sortedData.map((message) => message.user_id))]
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", userIds)

      if (usersError) throw usersError

      const messagesWithUsers = sortedData.map((message) => {
        const user = usersData.find((user) => user.id === message.user_id)
        return {
          ...message,
          user: user ? { ...user } : undefined,
        }
      })

      setMessages(messagesWithUsers)
      setAllMessages(messagesWithUsers)

      fetchUserRoles(userIds)
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
  }, [channelId, supabase, toast, fetchUserRoles])

  const loadOlderMessages = useCallback(async () => {
    if (!channelId || isLoadingOlder || !hasMoreOlder || messages.length === 0) return

    setIsLoadingOlder(true)

    // Save current scroll height to maintain position after loading
    if (chatContainerRef.current) {
      scrollHeightBeforeLoad.current = chatContainerRef.current.scrollHeight
    }

    try {
      const oldestMessage = messages[0]

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .lt("created_at", oldestMessage.created_at)
        .order("created_at", { ascending: false })
        .limit(MESSAGES_LOAD_MORE)

      if (error) throw error

      if (data.length === 0) {
        setHasMoreOlder(false)
        return
      }

      // Reverse to get chronological order
      const sortedData = data.reverse()

      const userIds = [...new Set(sortedData.map((message) => message.user_id))]
      const { data: usersData, error: usersError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .in("id", userIds)

      if (usersError) throw usersError

      const messagesWithUsers = sortedData.map((message) => {
        const user = usersData?.find((user) => user.id === message.user_id)
        return {
          ...message,
          user: user ? { ...user } : undefined,
        }
      })

      // Prepend older messages
      setMessages((prev) => [...messagesWithUsers, ...prev])
      setAllMessages((prev) => [...messagesWithUsers, ...prev])

      // Check if there are more older messages
      setHasMoreOlder(data.length === MESSAGES_LOAD_MORE)

      // Fetch roles for new users
      fetchUserRoles(userIds)

      // Restore scroll position after DOM update
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          const newScrollHeight = chatContainerRef.current.scrollHeight
          const scrollDiff = newScrollHeight - scrollHeightBeforeLoad.current
          chatContainerRef.current.scrollTop = scrollDiff
        }
      })
    } catch (error) {
      console.error("Error loading older messages:", error)
      toast({
        title: "Error",
        description: "Could not load older messages.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingOlder(false)
    }
  }, [channelId, isLoadingOlder, hasMoreOlder, messages, supabase, toast, fetchUserRoles])

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

      saveChannelInfoToCache(channelId, {
        description: channelData.description,
        allowMessages: channelData.allow_messages !== false,
      })
    } catch (error) {
      console.error("Error fetching channel info:", error)
    }
  }, [channelId, supabase, saveChannelInfoToCache])

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

          const roleColor = undefined
          try {
            const { data: userRoleData, error: roleError } = await supabase
              .from("role_members")
              .select(`
              role:server_roles(id, name, color, gradient_color, position)
            `)
              .eq("user_id", newMessage.user_id)
              .order("position", { foreignTable: "server_roles", ascending: true })
              .limit(1)
          } catch (roleError) {
            console.error("Error fetching role for new message:", roleError)
          }

          const messageWithUser = {
            ...newMessage,
            user: {
              ...userData,
              roleColor,
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
          setAllMessages((currentMessages) => [...currentMessages, messageWithUser])

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
    if (Object.keys(userRoles).length > 0 && messages.length > 0) {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (!message.user) return message

          const roles = userRoles[message.user.id] || []
          if (roles.length === 0) return message

          const highestPriorityRole = [...roles].sort((a, b) => a.role.position - b.role.position)[0]

          const roleStyle = highestPriorityRole.role.gradient_color
            ? `linear-gradient(135deg, ${highestPriorityRole.role.color} 0%, ${highestPriorityRole.role.gradient_color} 100%)`
            : highestPriorityRole.role.color

          return {
            ...message,
            user: {
              ...message.user,
              roleColor: roleStyle,
            },
          }
        }),
      )
    }
  }, [userRoles])

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

  useEffect(() => {
    if (channelId && !draftMessages[channelId]) {
      setDraftMessages((prev) => ({
        ...prev,
        [channelId]: {
          content: "",
          replyingTo: null,
          mentionInReply: true,
        },
      }))
    }
  }, [channelId, draftMessages])

  useEffect(() => {
    if (channelId) {
      const draft = draftMessages[channelId]
      if (draft) {
        setNewMessage(draft.content)
        setReplyingToMessage(draft.replyingTo)
        setMentionInReply(draft.mentionInReply)
      } else {
        setNewMessage("")
        setReplyingToMessage(null)
        setMentionInReply(true)
      }
    }
  }, [channelId, draftMessages])

  const uploadFilesToStorage = async (files: AttachmentFile[]): Promise<string[]> => {
    const fileUrls: string[] = []

    for (const fileData of files) {
      setAttachedFiles((prevFiles) =>
        prevFiles.map((file) => (file.id === fileData.id ? { ...file, status: "uploading" } : file)),
      )

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        const fileExt = fileData.file.name.split(".").pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `${channelId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("message-attachments")
          .upload(filePath, fileData.file)

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("message-attachments").getPublicUrl(filePath)

        fileUrls.push(publicUrl)

        setAttachedFiles((prevFiles) =>
          prevFiles.map((file) => (file.id === fileData.id ? { ...file, status: "ready", url: publicUrl } : file)),
        )
      } catch (error) {
        console.error("Error uploading file:", error)
        setAttachedFiles((prevFiles) =>
          prevFiles.map((file) => (file.id === fileData.id ? { ...file, status: "error" } : file)),
        )
        toast({
          title: "Upload Error",
          description: "Failed to upload file. Please try again.",
          variant: "destructive",
        })
      }
    }

    return fileUrls
  }

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!channelId || (!newMessage.trim() && !attachedFiles.length && !replyingToMessage) || !currentUser) {
      if (replyingToMessage && !newMessage.trim() && !attachedFiles.length) {
        setNewMessage(" ")
        return
      }
      return
    }

    const messageContent = newMessage.trim()

    if (messageContent.length > 2000) {
      setIsWarningModalOpen(true)
      return
    }

    setIsSending(true)

    try {
      let fileUrls: string[] = []
      if (attachedFiles.length > 0) {
        fileUrls = await uploadFilesToStorage(attachedFiles)
      }

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

      if (replyingToMessage && mentionInReply && replyingToMessage.user_id) {
        if (!mentions.includes(replyingToMessage.user_id)) {
          mentions.push(replyingToMessage.user_id)
        }
      }

      const roles = userRoles[currentUser.id] || []
      let roleColor = undefined

      if (roles.length > 0) {
        const highestPriorityRole = [...roles].sort((a, b) => a.role.position - b.role.position)[0]
        roleColor = highestPriorityRole.role.gradient_color
          ? `linear-gradient(135deg, ${highestPriorityRole.role.color} 0%, ${highestPriorityRole.role.gradient_color} 100%)`
          : highestPriorityRole.role.color
      }

      const tempMessage: Message = {
        id: Date.now(),
        content: messageContent,
        created_at: new Date().toISOString(),
        user_id: currentUser.id,
        channel_id: channelId,
        status: "pending",
        reply_to: replyingToMessage ? replyingToMessage.id : null,
        mention_in_reply: mentionInReply,
        user: {
          id: currentUser.id,
          username: currentUser.user_metadata.username || currentUser.email?.split("@")[0],
          display_name: currentUser.user_metadata.display_name || currentUser.email?.split("@")[0],
          avatar_url: currentUser.user_metadata.avatar_url,
          is_verified: currentUser.user_metadata.is_verified,
          roleColor: roleColor,
        },
        mentions: mentions,
        file_url: fileUrls.length > 0 ? fileUrls.join(",") : undefined,
      }

      setPendingMessages((prev) => [...prev, tempMessage])

      const { error } = await supabase.from("messages").insert({
        content: messageContent,
        channel_id: channelId,
        user_id: currentUser.id,
        reply_to: replyingToMessage ? replyingToMessage.id : null,
        mentions: mentions,
        mention_in_reply: mentionInReply,
        file_url: fileUrls.length > 0 ? fileUrls.join(",") : null,
      })

      if (error) throw error

      setNewMessage("")
      setReplyingToMessage(null)
      setAttachedFiles([])

      setDraftMessages((prev) => ({
        ...prev,
        [channelId]: {
          content: "",
          replyingTo: null,
          mentionInReply: true,
        },
      }))
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

  const handleProfileClick = (userId: string, event?: React.MouseEvent) => {
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect()
      const miniProfileWidth = 300
      const miniProfileHeight = 400

      const spaceOnRight = window.innerWidth - rect.right
      const spaceOnLeft = rect.left
      const spaceBelow = window.innerHeight - rect.top

      let x = rect.right + 20
      let y = rect.top

      if (spaceOnRight < miniProfileWidth && spaceOnLeft > miniProfileWidth) {
        x = rect.left - miniProfileWidth - 20
      }

      if (spaceBelow < miniProfileHeight) {
        y = Math.max(10, window.innerHeight - miniProfileHeight - 10)
      }

      setMiniProfilePosition({ x, y })
      setMiniProfileUser(userId)
    } else {
      setSelectedProfile({ id: userId })
    }
  }

  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
      const isNearTop = scrollTop < 100

      setIsAtBottom(isNearBottom)
      setShowJumpToBottom(!isNearBottom)
      lastScrollPositionRef.current = scrollTop

      // Load older messages when scrolling near top
      if (isNearTop && hasMoreOlder && !isLoadingOlder) {
        loadOlderMessages()
      }
    }
  }, [hasMoreOlder, isLoadingOlder, loadOlderMessages])

  useEffect(() => {
    const container = chatContainerRef.current
    if (container) {
      container.addEventListener("scroll", handleScroll)
      return () => container.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        e.ctrlKey ||
        e.altKey ||
        e.metaKey
      ) {
        return
      }

      if (e.key.length === 1) {
        e.preventDefault()
        inputRef.current?.focus()
        if (inputRef.current) {
          const input = inputRef.current
          const start = input.selectionStart || 0
          const end = input.selectionEnd || 0
          const newValue = input.value.slice(0, start) + e.key + input.value.slice(end)
          setNewMessage(newValue)
          requestAnimationFrame(() => {
            input.setSelectionRange(start + 1, start + 1)
          })
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement !== inputRef.current) return

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        if (newMessage.trim() || attachedFiles.length > 0 || replyingToMessage) {
          const form = inputRef.current?.form
          if (form) {
            const submitEvent = new Event("submit", { bubbles: true, cancelable: true })
            form.dispatchEvent(submitEvent)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [newMessage, replyingToMessage, attachedFiles])

  const handleFileSelected = (file: AttachmentFile) => {
    setAttachedFiles((prev) => [...prev, file])
  }

  const handleUploadError = (fileId: string, error: string) => {
    toast({
      title: "Upload Error",
      description: error,
      variant: "destructive",
    })
  }

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((prev) => prev.filter((file) => file.id !== fileId))
  }

  const handleAttachmentClick = () => {
    fileInputRef.current?.click()
  }

  const handleEmojiClick = () => {
    if (isEmojiPickerOpen) {
      setIsEmojiPickerOpen(false)
    } else if (emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect()
      setEmojiPickerPosition({
        x: rect.left,
        y: rect.top,
      })
      setIsEmojiPickerOpen(true)
    }
  }

  const handleEmojiSelect = (emoji: string, isCustom = false, customEmojiData?: any) => {
    const emojiText = emoji

    if (inputRef.current) {
      const input = inputRef.current
      const start = input.selectionStart || 0
      const end = input.selectionEnd || 0
      const newValue = input.value.slice(0, start) + emojiText + input.value.slice(end)
      setNewMessage(newValue)

      if (channelId) {
        setDraftMessages((prev) => ({
          ...prev,
          [channelId]: {
            content: newValue,
            replyingTo: replyingToMessage,
            mentionInReply,
          },
        }))
      }

      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(start + emojiText.length, start + emojiText.length)
      })
    }
  }

  const handleTyping = useCallback(() => {
    if (!currentUser || !channelId) return

    const username = currentUser.user_metadata.display_name || currentUser.email?.split("@")[0] || "User"

    if (currentUser?.id && typingTimeoutRef.current[currentUser.id]) {
      clearTimeout(typingTimeoutRef.current[currentUser.id])
    }

    supabase
      .from("typing_status")
      .upsert(
        { user_id: currentUser.id, channel_id: channelId, username, is_typing: true },
        { onConflict: "user_id, channel_id" },
      )
      .then(() => {
        if (currentUser?.id) {
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
              .catch(console.error)
          }, 1000)
        }
      })
      .catch(console.error)
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
    const content = e.target.value
    setNewMessage(content)
    if (channelId) {
      setDraftMessages((prev) => ({
        ...prev,
        [channelId]: {
          content,
          replyingTo: replyingToMessage,
          mentionInReply,
        },
      }))
    }

    handleTyping()
  }

  const handleReply = (message: Message) => {
    setReplyingToMessage(message)
    if (channelId) {
      setDraftMessages((prev) => ({
        ...prev,
        [channelId]: {
          content: prev[channelId]?.content || "",
          replyingTo: message,
          mentionInReply: prev[channelId]?.mentionInReply || true,
        },
      }))
    }
    inputRef.current?.focus()
  }

  const handleDelete = async (messageId: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      try {
        const { error } = await supabase.rpc("delete_message_and_update_replies", { message_id: messageId })

        if (error) throw error

        setMessages((prevMessages) => {
          const updatedMessages = prevMessages.filter((msg) => msg.id !== messageId)
          return updatedMessages.map((msg) => (msg.reply_to === messageId ? { ...msg, reply_to: null } : msg))
        })
        setAllMessages((prevMessages) => {
          const updatedMessages = prevMessages.filter((msg) => msg.id !== messageId)
          return updatedMessages.map((msg) => (msg.reply_to === messageId ? { ...msg, reply_to: null } : msg))
        })
        setTotalMessageCount((prev) => prev - 1)

        toast({
          title: "Successfully",
          description: "The message has been deleted.",
        })
      } catch (error) {
        console.error("Error deleting message:", error)
        toast({
          title: "Error",
          description: "The message could not be deleted. Please try again.",
          variant: "destructive",
        })
      }
    }
  }

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditedContent("")
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editingMessageId) return

    const mentionRegex = /@(\w+)/g
    const mentions = editedContent.match(mentionRegex)?.map((mention) => mention.slice(1)) || []

    try {
      const messageToEdit = messages.find((msg) => msg.id === editingMessageId)

      const { error } = await supabase
        .from("messages")
        .update({
          content: editedContent,
          updated_at: new Date().toISOString(),
          mentions: mentions,
        })
        .eq("id", editingMessageId)

      if (error) throw error

      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                content: editedContent,
                updated_at: new Date().toISOString(),
                file_url: msg.file_url,
              }
            : msg,
        ),
      )
      setAllMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === editingMessageId
            ? {
                ...msg,
                content: editedContent,
                updated_at: new Date().toISOString(),
                file_url: msg.file_url,
              }
            : msg,
        ),
      )

      setEditingMessageId(null)
      setEditedContent("")
    } catch (error) {
      console.error("Error editing message:", error)
      toast({
        title: "Ошибка",
        description: "Couldn't edit the message. Please try again.",
        variant: "destructive",
      })
    }
  }, [editingMessageId, editedContent, supabase, toast, messages])

  const scrollToMessage = useCallback((messageId: number) => {
    const messageElement = document.getElementById(`message-${messageId}`)
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" })
      messageElement.classList.add("highlight")
      setTimeout(() => messageElement.classList.remove("highlight"), 2000)
    }
  }, [])

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copied",
        description: "The text of the message has been copied to the clipboard",
      })
    })
  }

  useEffect(() => {
    if (messages.length > 0) {
      if (isAtBottom) {
        scrollToBottom()
      } else if (lastScrollPositionRef.current > 0) {
        chatContainerRef.current?.scrollTo(0, lastScrollPositionRef.current)
      }
    }
  }, [messages, isAtBottom, scrollToBottom])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingMessageId) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSaveEdit()
        } else if (e.key === "Escape") {
          handleCancelEdit()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [editingMessageId, handleSaveEdit, handleCancelEdit])

  const handleCancelReply = useCallback(() => {
    if (channelId) {
      setReplyingToMessage(null)
      setDraftMessages((prev) => ({
        ...prev,
        [channelId]: {
          content: prev[channelId]?.content || "",
          replyingTo: null,
          mentionInReply: prev[channelId]?.mentionInReply || true,
        },
      }))
    }
  }, [channelId])

  const toggleMentionInReply = useCallback(() => {
    const newValue = !mentionInReply
    setMentionInReply(newValue)

    if (channelId) {
      setDraftMessages((prev) => ({
        ...prev,
        [channelId]: {
          content: prev[channelId]?.content || "",
          replyingTo: replyingToMessage,
          mentionInReply: newValue,
        },
      }))
    }
  }, [mentionInReply, channelId, replyingToMessage])

  const handleEdit = (message: Message) => {
    setEditingMessageId(message.id)
    setEditedContent(message.content)
  }

  const renderMessageContent = (message: Message) => {
    if (!message.content && !message.file_url) return null

    return (
      <>
        {message.content && (
          <FormattedText
            content={message.content}
            serverId={serverId}
            onProfileClick={handleProfileClick}
            isEditing={editingMessageId === message.id}
          />
        )}
        {message.file_url && (
          <div className={`flex flex-col space-y-2 ${message.content ? "mt-2" : ""}`}>
            {message.file_url.split(",").map((url, index) => (
              <MessageImage
                key={`${message.id}-img-${index}`}
                url={url}
                user={message.user}
                timestamp={message.created_at}
              />
            ))}
          </div>
        )}
      </>
    )
  }

  useEffect(() => {
    const checkServerOwnership = async () => {
      if (serverId && currentUser) {
        const { data, error } = await supabase.from("servers").select("owner_id").eq("id", serverId).single()

        if (error) {
          console.error("Error checking server ownership:", error)
        } else if (data) {
          setIsServerOwner(data.owner_id === currentUser.id)
        }
      }
    }

    if (currentUser) {
      checkServerOwnership()
    }
  }, [serverId, currentUser, supabase])

  useEffect(() => {
    if (channelId) {
      const cachedInfo = getChannelInfoFromCache(channelId)
      if (cachedInfo) {
        setChannelDescription(cachedInfo.description)
        setAllowMessages(cachedInfo.allowMessages)
      } else {
        setChannelDescription(channelDescription)
        setAllowMessages(true)
      }

      const fetchChannelInfoImmediately = async () => {
        try {
          const { data, error } = await supabase
            .from("channels")
            .select("description, allow_messages")
            .eq("id", channelId)
            .single()

          if (!error && data) {
            setChannelDescription(data.description)
            setAllowMessages(data.allow_messages !== false)
            saveChannelInfoToCache(channelId, {
              description: data.description,
              allowMessages: data.allow_messages !== false,
            })
          }
        } catch (error) {
          console.error("Error fetching channel info:", error)
        }
      }

      fetchChannelInfoImmediately()

      if (currentUser) {
        const checkOwnership = async () => {
          try {
            const { data, error } = await supabase.from("servers").select("owner_id").eq("id", serverId).single()

            if (!error && data) {
              setIsServerOwner(data.owner_id === currentUser.id)
            }
          } catch (error) {
            console.error("Error checking server ownership:", error)
          }
        }

        checkOwnership()
      }
    }
  }, [channelId, serverId, currentUser, supabase, channelDescription, getChannelInfoFromCache, saveChannelInfoToCache])

  useEffect(() => {
    if (!currentUser) return

    const mentionsForUser = messages
      .filter(
        (msg) =>
          msg.mentions?.includes(currentUser.id) ||
          (msg.reply_to !== null &&
            msg.mention_in_reply === true &&
            messages.find((m) => m.id === msg.reply_to)?.user_id === currentUser.id),
      )
      .map((msg) => msg.id)

    setUserMentions(mentionsForUser)
  }, [messages, currentUser])

  useEffect(() => {
    setUserRoles({})
    setMessages([])
    setAllMessages([])
    setHasMoreOlder(false)
  }, [serverId])

  useEffect(() => {
    setAttachedFiles([])
  }, [channelId, serverId])

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#313338]">
        <p className="text-xl text-[#949ba4]">
          There are no channels on this server yet. Create a new one to start chatting!
        </p>
      </div>
    )
  }

  const messageSkeletons = Array(8)
    .fill(0)
    .map((_, index) => <MessageSkeleton key={`skeleton-${index}`} />)

  const handleOpenFullProfile = () => {
    if (miniProfileUser) {
      setSelectedProfile({ id: miniProfileUser })
      setMiniProfileUser(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#313338]">
      <MiniUserProfile
        isOpen={!!miniProfileUser}
        onClose={() => setMiniProfileUser(null)}
        onOpenFullProfile={handleOpenFullProfile}
        userId={miniProfileUser || undefined}
        serverId={serverId}
        position={miniProfilePosition}
        currentUserId={currentUser?.id || null}
      />
      <EmojiPicker
        isOpen={isEmojiPickerOpen}
        onClose={() => setIsEmojiPickerOpen(false)}
        onEmojiSelect={handleEmojiSelect}
        currentServerId={serverId}
        position={emojiPickerPosition}
      />
      <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm">
        <Hash className="w-5 h-5 text-[#949ba4] mr-2" />
        <h2 className="font-semibold text-white">{channelName || "Select a channel"}</h2>
        {channelDescription && (
          <>
            <div className="mx-2 h-6 w-px bg-[#4f545c]"></div>
            <p className="text-[#949ba4] text-sm">{channelDescription}</p>
          </>
        )}
      </div>
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
        css={scrollbarStyles}
        style={{ scrollbarWidth: "thin", scrollbarColor: "#1e1f22 #2b2d31" }}
      >
        {hasMoreOlder && (
          <div className="flex justify-center py-2">
            {isLoadingOlder ? (
              <div className="flex items-center gap-2 text-[#949ba4] text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading older messages...</span>
              </div>
            ) : (
              <button
                onClick={loadOlderMessages}
                className="flex items-center gap-2 text-[#949ba4] text-sm hover:text-white transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
                <span>Load older messages</span>
              </button>
            )}
          </div>
        )}
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

              const MessageWrapper = isPending || editingMessageId === message.id ? "div" : MessageContextMenu

              acc.push(
                <MessageWrapper
                  key={message.id}
                  messageId={message.id.toString()}
                  currentUserId={currentUser?.id}
                  messageUserId={message.user_id}
                  onReply={() => handleReply(message)}
                  onEdit={() => handleEdit(message)}
                  onDelete={() => handleDelete(message.id)}
                  onCopy={() => handleCopy(message.content)}
                  allowMessages={allowMessages}
                  isServerOwner={isServerOwner}
                >
                  <div
                    id={`message-${message.id}`}
                    className={`group hover:bg-[#2e3035] rounded px-4 py-0.5 -mx-2 ${
                      userMentions.includes(message.id) ? "mention-highlight" : ""
                    }`}
                  >
                    {message.reply_to && (
                      <div
                        className="flex items-center text-[#949ba4] text-xs mb-1 cursor-pointer hover:underline"
                        onClick={() => scrollToMessage(message.reply_to!)}
                      >
                        <div className="w-8 border-l-2 border-t-2 border-[#949ba4] h-3 mr-2 rounded-tl-md"></div>
                        <Avatar className="w-4 h-4 rounded-full mr-1">
                          <AvatarImage
                            src={allMessages.find((msg) => msg.id === message.reply_to)?.user?.avatar_url || undefined}
                          />
                          <AvatarFallback>
                            {allMessages
                              .find((msg) => msg.id === message.reply_to)
                              ?.user?.display_name?.charAt(0)
                              .toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold mr-1">
                          {allMessages.find((msg) => msg.id === message.reply_to)?.user?.display_name || "User"}
                        </span>
                        <span className="truncate max-w-[200px]">
                          {allMessages.find((msg) => msg.id === message.reply_to)?.content ? (
                            <FormattedText
                              content={allMessages.find((msg) => msg.id === message.reply_to)?.content || ""}
                            />
                          ) : allMessages.find((msg) => msg.id === message.reply_to)?.file_url ? (
                            "Attached File"
                          ) : (
                            ""
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="shrink-0">
                        <Avatar
                          className="w-10 h-10 rounded-full cursor-pointer"
                          onClick={(e) => !isPending && handleProfileClick(message.user_id, e)}
                        >
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
                          <span
                            className="font-medium cursor-pointer hover:underline"
                            style={
                              message.user?.roleColor?.includes("linear-gradient")
                                ? {
                                    background: message.user.roleColor,
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                    backgroundClip: "text",
                                    display: "inline-block",
                                  }
                                : { color: message.user?.roleColor || "white" }
                            }
                            onClick={(e) => !isPending && handleProfileClick(message.user_id, e)}
                          >
                            {message.user?.display_name}
                          </span>
                          <span className="text-xs text-[#949ba4]">
                            {formatMessageTime(new Date(message.created_at))}
                          </span>
                        </div>
                        {editingMessageId === message.id ? (
                          <div className="mt-2">
                            <Input
                              value={editedContent}
                              onChange={(e) => setEditedContent(e.target.value)}
                              className="bg-[#383a40] text-white border-none"
                            />
                            <div className="text-xs text-[#949ba4] mt-1 flex items-center">
                              <span className="cursor-default">esc для</span>
                              <button onClick={handleCancelEdit} className="text-[#00a8fc] hover:underline mx-1">
                                отмены
                              </button>
                              <span className="cursor-default mx-2">•</span>
                              <span className="cursor-default">enter чтобы</span>
                              <button onClick={handleSaveEdit} className="text-[#00a8fc] hover:underline ml-1">
                                сохранить
                              </button>
                            </div>
                            {message.file_url && (
                              <div className="mt-2">
                                {message.file_url.split(",").map((url, index) => (
                                  <MessageImage
                                    key={`${message.id}-img-${index}`}
                                    url={url}
                                    user={message.user}
                                    timestamp={message.created_at}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        ) : message.status === "pending" ? (
                          <div className="text-[#72767d]">{message.content}</div>
                        ) : (
                          renderMessageContent(message)
                        )}
                        {message.updated_at && message.updated_at !== message.created_at && (
                          <span className="text-xs text-[#949ba4] mt-1 block">(edited)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </MessageWrapper>,
              )
              return acc
            }, [])
        )}
      </div>
      <div className="px-4 pb-1">
        <TypingIndicator typingUsers={typingUsers.filter((user) => user !== currentUser?.user_metadata.display_name)} />
      </div>
      <form onSubmit={sendMessage} className="px-4 pb-6">
        {attachedFiles.length > 0 && <FilePreview files={attachedFiles} onRemove={handleRemoveFile} />}
        {replyingToMessage && (
          <div
            className={`flex items-center bg-[#2b2d31] ${!attachedFiles.length ? "rounded-t-lg" : ""} px-4 py-2 text-[#949ba4]`}
          >
            <div className="flex items-center flex-grow">
              <Reply className="w-4 h-4 mr-2 text-[#949ba4]" />
              <span className="font-medium text-[#949ba4] mr-2">Response to the user</span>
              <Avatar className="w-5 h-5 mr-2">
                <AvatarImage src={replyingToMessage.user?.avatar_url || undefined} />
                <AvatarFallback>{replyingToMessage.user?.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-[#a7a8ab]">{replyingToMessage.user?.display_name}</span>
              <span
                className="ml-auto mr-2 text-[#0096e0] cursor-pointer hover:bg-opacity-80 hover:text-[#00a8fc] transition-colors"
                onClick={toggleMentionInReply}
              >
                @ {mentionInReply ? "ON" : "OFF"}
              </span>
              <div className="h-4 w-px bg-[#4f545c] opacity-30 mx-2"></div>
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
          {allowMessages || isServerOwner ? (
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
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={`Write to #${channelName || "channel"}`}
                  value={newMessage}
                  onChange={handleMessageChange}
                  className="bg-transparent text-white placeholder-[#949ba4] focus:outline-none border-none text-base py-6"
                  disabled={isSending || isUploading}
                />
                <div className="absolute inset-0 pointer-events-none py-6 px-3 text-base overflow-hidden">
                  <div className="opacity-0">
                    <FormattedText
                      content={newMessage}
                      serverId={serverId}
                      onProfileClick={() => {}}
                      isEditing={false}
                    />
                  </div>
                </div>
              </div>
              <Button
                ref={emojiButtonRef}
                type="button"
                variant="ghost"
                size="icon"
                className="text-[#b5bac1] hover:text-white"
                onClick={handleEmojiClick}
                disabled={isSending || isUploading}
              >
                <Smile className="w-5 h-5" />
              </Button>
              <FileUpload
                ref={fileInputRef}
                channelId={channelId}
                onFileSelected={handleFileSelected}
                onUploadError={handleUploadError}
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
      <UserProfileModal
        isOpen={selectedProfile !== null}
        onClose={() => setSelectedProfile(null)}
        userId={selectedProfile?.id}
        currentUserId={currentUser?.id}
        onMessage={(userId) => {
          console.log("Send message to:", userId)
          setSelectedProfile(null)
        }}
      />
      <WarningModal
        isOpen={isWarningModalOpen}
        onClose={() => setIsWarningModalOpen(false)}
        type="character"
        characterCount={newMessage.trim().length}
        maxFileSize="8MB"
      />
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .mention-highlight {
          background-color: rgba(255, 255, 0, 0.1);
        }
      `}</style>
    </div>
  )
}
