"use client"

import { MoreVertical, User, UserX } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"

interface MemberRowProps {
  member: {
    id: string
    username: string
    display_name: string
    avatar_url: string | null
    is_verified?: boolean
    joined_at: string
    created_at: string
    role: "owner" | "admin" | "member"
  }
  onKick: (userId: string) => void
  onOpenProfile: (userId: string) => void
}

export default function MemberRow({ member, onKick, onOpenProfile }: MemberRowProps) {
  const handleProfileClick = () => {
    onOpenProfile(member.id)
  }

  const handleKick = () => {
    if (confirm(`Вы уверены, что хотите выгнать ${member.display_name}?`)) {
      onKick(member.id)
    }
  }

  return (
    <div className="flex items-center justify-between p-2 hover:bg-[#2E3035] rounded-md group">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={member.avatar_url || undefined} />
          <AvatarFallback>{member.display_name[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{member.display_name}</span>
            {member.role === "owner" && (
              <span className="text-xs px-1 py-0.5 rounded bg-[#5865F2] text-white">Owner</span>
            )}
          </div>
          <span className="text-sm text-[#B9BBBE]">@{member.username}</span>
          <div className="text-xs text-[#B9BBBE]">Joined: {format(new Date(member.joined_at), "dd MMM yyyy")}</div>
          <div className="text-xs text-[#B9BBBE]">
            Account created: {format(new Date(member.created_at), "dd MMM yyyy")}
          </div>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-[#1E1F22]">
            <MoreVertical className="h-4 w-4 text-[#B9BBBE]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-[#1E1F22] border-none text-[#B9BBBE]">
          <DropdownMenuItem
            className="flex items-center gap-2 focus:bg-[#5865F2] focus:text-white cursor-pointer"
            onClick={handleProfileClick}
          >
            <User className="h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          {member.role !== "owner" && (
            <DropdownMenuItem
              className="flex items-center gap-2 focus:bg-[#ED4245] focus:text-white text-[#ED4245] cursor-pointer"
              onClick={handleKick}
            >
              <UserX className="h-4 w-4" />
              <span>Kick</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
