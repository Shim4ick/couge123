"use client"

import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Reply, Edit, Trash, Copy } from "lucide-react"
import { type ReactNode, useState } from "react"

interface MessageContextMenuProps {
  children: ReactNode
  messageId: string
  currentUserId: string
  messageUserId: string
  onReply: () => void
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  allowMessages: boolean
  isServerOwner: boolean
}

export function MessageContextMenu({
  children,
  messageId,
  currentUserId,
  messageUserId,
  onReply,
  onEdit,
  onDelete,
  onCopy,
  allowMessages,
  isServerOwner,
}: MessageContextMenuProps) {
  const [isBugReportOpen, setIsBugReportOpen] = useState(false)

  const canReply = allowMessages || isServerOwner

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64 bg-[#1e1f22] border-none text-[#B9BBBE]">
        {canReply && (
          <ContextMenuItem className="focus:bg-[#2b2d31] cursor-pointer" onClick={onReply}>
            <Reply className="w-4 h-4 mr-2" />
            Reply
          </ContextMenuItem>
        )}
        <ContextMenuItem className="focus:bg-[#2b2d31] cursor-pointer" onClick={onCopy}>
          <Copy className="w-4 h-4 mr-2" />
          Copy
        </ContextMenuItem>
        {currentUserId === messageUserId && (
          <>
            <ContextMenuItem className="focus:bg-[#2b2d31] cursor-pointer" onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </ContextMenuItem>
            <ContextMenuItem
              className="focus:bg-[#2b2d31] cursor-pointer text-red-400 focus:text-red-400"
              onClick={onDelete}
            >
              <Trash className="w-4 h-4 mr-2" />
              Remove
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
