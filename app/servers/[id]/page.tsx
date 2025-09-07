"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import ServerList from "@/components/ServerList"
import ChannelList from "@/components/ChannelList"
import ChatArea from "@/components/ChatArea"
import UserPanel from "@/components/UserPanel"
import ServerMembersList from "@/components/ServerMembersList"
import HomePage from "@/app/page"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { getServers } from "@/lib/api"

export default function ServerPage() {
  const { id } = useParams()
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null)
  const [selectedChannelName, setSelectedChannelName] = useState<string | null>(null)
  const [selectedServer, setSelectedServer] = useState<number | null>(Number(id))
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const { data: session } = useSession()
  const currentUser = session?.user

  const { data: servers } = useQuery({
    queryKey: ["servers"],
    queryFn: getServers,
  })

  const handleSelectChannel = (channelId: number | null, channelName: string | null) => {
    setSelectedChannel(channelId)
    setSelectedChannelName(channelName)
  }

  return (
    <div className="flex h-screen">
      <ServerList />
      <div className="flex flex-col">
        {selectedServer === null || selectedServer === 0 ? (
          <HomePage />
        ) : (
          <>
            <ChannelList
              serverId={selectedServer}
              onSelectChannel={handleSelectChannel}
              onInvite={() => setIsInviteModalOpen(true)}
              isServerOwner={servers?.find((s) => s.id === selectedServer)?.owner_id === currentUser?.id}
              selectedChannelId={selectedChannel}
            />
            <ChatArea channelId={selectedChannel} channelName={selectedChannelName} serverId={selectedServer || 0} />
            <ServerMembersList serverId={selectedServer} />
          </>
        )}
        <UserPanel />
      </div>
      <ChatArea channelId={selectedChannel} channelName={selectedChannelName} serverId={Number(id)} />
      <ServerMembersList serverId={Number(id)} />
    </div>
  )
}
