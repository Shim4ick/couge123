"use client"

import React, { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import MentionBadge from "./MentionBadge"
import InviteLinkPreview from "./InviteLinkPreview"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface FormattedTextProps {
  content: string
  serverId: number
  onProfileClick: (userId: string) => void
  isEditing?: boolean
}

const FormattedText: React.FC<FormattedTextProps> = ({ content, serverId, onProfileClick, isEditing = false }) => {
  const [customEmojis, setCustomEmojis] = useState<Record<string, string>>({})
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchCustomEmojis = async () => {
      try {
        // Fetch all custom emojis from all servers the user is in
        const { data: userServers, error: serversError } = await supabase
          .from("server_members")
          .select(`
          server:servers(
            id,
            custom_emojis(id, name, image_url)
          )
        `)
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)

        if (serversError) throw serversError

        const emojiMap: Record<string, string> = {}
        userServers?.forEach((item) => {
          if (item.server?.custom_emojis) {
            item.server.custom_emojis.forEach((emoji) => {
              emojiMap[`${emoji.name}:${emoji.id}`] = emoji.image_url
            })
          }
        })
        setCustomEmojis(emojiMap)
      } catch (error) {
        console.error("Error fetching custom emojis:", error)
      }
    }

    fetchCustomEmojis()
  }, [supabase])

  if (isEditing) {
    return <span>{content}</span>
  }

  // If no content, return empty span
  if (!content) {
    return <span></span>
  }

  // Check for invite links
  const inviteLinkRegex = /(?:https?:\/\/)?(?:app\.joincouge\.com\/invite\/|couge\.cc\/)([a-zA-Z0-9]+)/g
  const inviteMatches = [...content.matchAll(inviteLinkRegex)]

  if (inviteMatches.length > 0) {
    const parts = []
    let lastIndex = 0

    for (const match of inviteMatches) {
      const matchIndex = match.index || 0
      const inviteCode = match[1]
      const fullMatch = match[0]

      // Add text before the link
      if (matchIndex > lastIndex) {
        parts.push(
          <FormattedTextPart
            key={`text-${lastIndex}`}
            content={content.substring(lastIndex, matchIndex)}
            serverId={serverId}
            onProfileClick={onProfileClick}
            customEmojis={customEmojis}
          />,
        )
      }

      // Add the invite link preview
      parts.push(<InviteLinkPreview key={`invite-${matchIndex}`} inviteCode={inviteCode} />)

      lastIndex = match.index + fullMatch.length
    }

    // Add any remaining text
    if (lastIndex < content.length) {
      parts.push(
        <FormattedTextPart
          key={`text-${lastIndex}`}
          content={content.substring(lastIndex)}
          serverId={serverId}
          onProfileClick={onProfileClick}
          customEmojis={customEmojis}
        />,
      )
    }

    return <>{parts}</>
  }

  // If no invite links, process as normal
  return (
    <FormattedTextPart
      content={content}
      serverId={serverId}
      onProfileClick={onProfileClick}
      customEmojis={customEmojis}
    />
  )
}

// Helper component to process regular text with mentions and custom emojis
const FormattedTextPart: React.FC<FormattedTextProps & { customEmojis: Record<string, string> }> = ({
  content,
  serverId,
  onProfileClick,
  customEmojis,
}) => {
  // First, process custom emojis
  const processCustomEmojis = (text: string) => {
    const emojiRegex = /:([a-zA-Z0-9_]+):(\d+):/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    while ((match = emojiRegex.exec(text)) !== null) {
      const emojiName = match[1]
      const emojiId = match[2]

      // Add text before emoji
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }

      // Find emoji by ID instead of name
      let emojiUrl = null
      for (const [name, url] of Object.entries(customEmojis)) {
        if (name === `${emojiName}:${emojiId}`) {
          emojiUrl = url
          break
        }
      }

      // Add emoji or fallback to text
      if (emojiUrl) {
        parts.push(
          <img
            key={`emoji-${match.index}`}
            src={emojiUrl || "/placeholder.svg"}
            alt={`:${emojiName}:`}
            className="inline-block w-5 h-5 mx-0.5 align-text-bottom"
            title={`:${emojiName}:`}
          />,
        )
      } else {
        parts.push(match[0]) // Keep original text if emoji not found
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  // Split the content by spaces and process each part
  const parts = content.split(/(\s+)/)

  return (
    <span style={{ display: "inline-block", wordWrap: "break-word", whiteSpace: "pre-wrap", width: "100%" }}>
      {parts.map((part, index) => {
        // If it's a space, render it directly
        if (/^\s+$/.test(part)) {
          return <span key={`space-${index}`}>{part}</span>
        }

        // Check if this part contains a mention
        const mentionMatch = part.match(/@(\w+)/)
        if (mentionMatch) {
          const username = mentionMatch[1]
          const mentionIndex = part.indexOf(`@${username}`)

          // Text before the mention
          const beforeText = part.substring(0, mentionIndex)
          // Text after the mention
          const afterText = part.substring(mentionIndex + username.length + 1)

          return (
            <React.Fragment key={`part-${index}`}>
              {beforeText && (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <span style={{ display: "inline-block", wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                        {processCustomEmojis(String(children))}
                      </span>
                    ),
                    strong: ({ children }) => (
                      <span className="font-bold" style={{ display: "inline" }}>
                        {processCustomEmojis(String(children))}
                      </span>
                    ),
                    em: ({ children }) => (
                      <span className="italic" style={{ display: "inline" }}>
                        {processCustomEmojis(String(children))}
                      </span>
                    ),
                  }}
                >
                  {beforeText}
                </ReactMarkdown>
              )}
              <MentionBadge username={username} serverId={serverId} onProfileClick={onProfileClick} />
              {afterText && (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => (
                      <span style={{ display: "inline-block", wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                        {processCustomEmojis(String(children))}
                      </span>
                    ),
                    strong: ({ children }) => (
                      <span className="font-bold" style={{ display: "inline" }}>
                        {processCustomEmojis(String(children))}
                      </span>
                    ),
                    em: ({ children }) => (
                      <span className="italic" style={{ display: "inline" }}>
                        {processCustomEmojis(String(children))}
                      </span>
                    ),
                  }}
                >
                  {afterText}
                </ReactMarkdown>
              )}
            </React.Fragment>
          )
        }

        // Regular text without mentions - process custom emojis
        const processedContent = processCustomEmojis(part)

        return (
          <ReactMarkdown
            key={`text-${index}`}
            components={{
              p: ({ children }) => (
                <span style={{ display: "inline-block", wordWrap: "break-word", whiteSpace: "pre-wrap" }}>
                  {typeof children === "string" ? processCustomEmojis(children) : children}
                </span>
              ),
              strong: ({ children }) => (
                <span className="font-bold" style={{ display: "inline" }}>
                  {typeof children === "string" ? processCustomEmojis(children) : children}
                </span>
              ),
              em: ({ children }) => (
                <span className="italic" style={{ display: "inline" }}>
                  {typeof children === "string" ? processCustomEmojis(children) : children}
                </span>
              ),
            }}
          >
            {part}
          </ReactMarkdown>
        )
      })}
    </span>
  )
}

export default FormattedText
