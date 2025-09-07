"use client"

import { useState, useEffect, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import ServerList from "@/components/ServerList"
import ChannelList from "@/components/ChannelList"
import ChatArea from "@/components/ChatArea"
import VoiceArea from "@/components/VoiceArea"
import InviteModal from "@/components/InviteModal"
import CreateOrJoinServer from "@/components/CreateOrJoinServer"
import CougeLogin from "./login/page"
import HomePage from "@/components/HomePage"
import { isMobile } from "@/utils/isMobile"
import { BetaWelcomeModal } from "@/components/BetaWelcomeModal"
import ServerMembersList from "@/components/ServerMembersList"
import UserSettings from "@/components/UserSettings"
import MobileNavigation from "@/components/mobile/MobileNavigation"
import MobileServerList from "@/components/mobile/MobileServerList"
import MobileChannelList from "@/components/mobile/MobileChannelList"
import MobileChatArea from "@/components/mobile/MobileChatArea"
import JoinServerModal from "@/components/JoinServerModal"
import LogoLoadingSpinner from "@/components/LogoLoadingSpinner"

type Server = {
  id: number
  name: string
  owner_id: string
  avatar_url: string | null
  channels?: { id: number; name: string; channel_type?: string }[]
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<boolean>(false)
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServer, setSelectedServer] = useState<number | null>(0)
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null)
  const [selectedChannelName, setSelectedChannelName] = useState<string | null>(null)
  const [selectedChannelType, setSelectedChannelType] = useState<"text" | "voice">("text")
  const [isCreateOrJoinServerOpen, setIsCreateOrJoinServerOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [showBetaWelcome, setShowBetaWelcome] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [mobileView, setMobileView] = useState<"servers" | "channels" | "chat">("servers")
  const [isJoinServerModalOpen, setIsJoinServerModalOpen] = useState(false)
  const [inviteCodeToJoin, setInviteCodeToJoin] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  const fetchServers = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: memberData, error: memberError } = await supabase
        .from("server_members")
        .select("server_id")
        .eq("user_id", user.id)

      if (memberError) {
        console.error("Error fetching server memberships:", memberError)
        return
      }

      if (memberData && memberData.length > 0) {
        const serverIds = memberData.map((member) => member.server_id)
        const { data, error } = await supabase
          .from("servers")
          .select(`
            id,
            name,
            owner_id,
            invite_code,
            avatar_url,
            banner_url,
            description,
            is_private,
            channels (id, name, channel_type)
          `)
          .in("id", serverIds)
        if (error) {
          console.error("Error fetching servers:", error)
        } else {
          setServers(data || [])
        }
      } else {
        setServers([])
      }
    }
  }, [supabase])

  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSession(!!session)
        if (session) {
          await fetchServers()
          const { data: profile } = await supabase
            .from("profiles")
            .select("has_seen_beta_welcome")
            .eq("id", session.user.id)
            .single()

          if (profile && !profile.has_seen_beta_welcome) {
            setShowBetaWelcome(true)
          }
        }
      } catch (error) {
        console.error("Error checking auth status:", error)
      } finally {
        setTimeout(() => setIsLoading(false), 500)
      }
    }
    checkUser()
  }, [supabase, fetchServers])

  useEffect(() => {
    const handleInviteParam = async (inviteParam: string | null) => {
      if (inviteParam && session) {
        setInviteCodeToJoin(inviteParam)
        setIsJoinServerModalOpen(true)
      }
    }

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const inviteParam = urlParams.get("invite")
      handleInviteParam(inviteParam)
    }
  }, [session])

  useEffect(() => {
    if (session) {
      const serverChannel = supabase
        .channel("custom-all-channel")
        .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, () => {
          fetchServers()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(serverChannel)
      }
    }
  }, [session, supabase, fetchServers])

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchUser()
  }, [supabase.auth])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(isMobile())
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => {
      window.removeEventListener("resize", checkMobile)
    }
  }, [])

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      setSession(false)
      setSelectedServer(null)
      setSelectedChannel(null)
      setSelectedChannelName(null)
      setServers([])
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseJoinServerModal = () => {
    setIsJoinServerModalOpen(false)
    setInviteCodeToJoin(null)

    // Remove the invite parameter from the URL without page reload
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.delete("invite")
      window.history.replaceState({}, "", url.toString())
    }
  }

  // Modify the handleServerClick function to distinguish between home and actual servers
  const handleServerClick = (serverId: number) => {
    setSelectedServer(serverId)

    // Clear channel selection when going to home
    if (serverId === 0) {
      setSelectedChannel(null)
      setSelectedChannelName(null)
      setSelectedChannelType("text")
    } else {
      // Only try to select a channel when clicking on an actual server
      const firstChannel = servers.find((s) => s.id === serverId)?.channels?.[0]
      if (firstChannel) {
        setSelectedChannel(firstChannel.id)
        setSelectedChannelName(firstChannel.name)
        setSelectedChannelType((firstChannel.channel_type as "text" | "voice") || "text")
      } else {
        setSelectedChannel(null)
        setSelectedChannelName(null)
        setSelectedChannelType("text")
      }
    }

    if (isMobileDevice) {
      // When going to home, stay in servers view
      if (serverId === 0) {
        setMobileView("servers")
      } else {
        setMobileView("channels")
      }
    }
  }

  const handleDeleteServer = async (serverId: number) => {
    if (confirm("Are you sure you want to delete this server? This action cannot be undone.")) {
      try {
        const response = await fetch("/api/delete-server", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ serverId }),
        })

        if (!response.ok) {
          throw new Error("Failed to delete server")
        }

        await fetchServers()
        if (selectedServer === serverId) {
          setSelectedServer(null)
          setSelectedChannel(null)
          setSelectedChannelName(null)
        }
      } catch (error) {
        console.error("Error deleting server:", error)
        alert("Error deleting server. Please try again.")
      }
    }
  }

  // Add this function inside the Home component, after the handleDeleteServer function
  const handleLeaveServer = (serverId: number) => {
    // Remove the server from the servers list
    setServers(servers.filter((server) => server.id !== serverId))
    setSelectedServer(0)
    setSelectedChannel(null)
    setSelectedChannelName(null)
  }

  const handleSelectChannel = (
    channelId: number | null,
    channelName: string | null,
    serverId: number,
    channelType: "text" | "voice" = "text",
  ) => {
    setSelectedChannel(channelId)
    setSelectedChannelName(channelName)
    setSelectedServer(serverId)
    setSelectedChannelType(channelType)

    if (isMobileDevice) {
      setMobileView("chat")
    }
  }

  const handleBackToChannels = () => {
    if (isMobileDevice) {
      setMobileView("channels")
    }
  }

  const handleOpenSettings = () => {
    setIsSettingsOpen(true)
  }

  const handleLeaveVoice = () => {
    // Return to text mode or channel selection
    setSelectedChannelType("text")
    // Optionally clear the channel selection
    // setSelectedChannel(null)
    // setSelectedChannelName(null)
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#313338]">
        <LogoLoadingSpinner />
      </div>
    )
  }

  if (!session) {
    return <CougeLogin />
  }

  // Mobile UI
  if (isMobileDevice) {
    return (
      <div className="flex flex-col h-screen bg-[#1e1f22]">
        {mobileView === "servers" && (
          <div className="flex flex-1 h-full">
            <MobileServerList servers={servers} selectedServer={selectedServer} onServerClick={handleServerClick} />
            {selectedServer === 0 ? (
              <div className="flex-1 bg-[#313338] flex items-center justify-center">
                <p className="text-lg text-[#949ba4] px-4 text-center">Select a server to view channels</p>
              </div>
            ) : (
              <MobileChannelList
                serverId={selectedServer}
                onSelectChannel={handleSelectChannel}
                selectedChannelId={selectedChannel}
              />
            )}
          </div>
        )}

        {mobileView === "channels" && selectedServer !== 0 && (
          <div className="flex flex-1 h-full">
            <MobileServerList servers={servers} selectedServer={selectedServer} onServerClick={handleServerClick} />
            <MobileChannelList
              serverId={selectedServer}
              onSelectChannel={handleSelectChannel}
              selectedChannelId={selectedChannel}
              onLeaveServer={handleLeaveServer}
            />
          </div>
        )}

        {mobileView === "chat" && selectedChannel && (
          <div className="flex-1 h-full">
            <MobileChatArea
              channelId={selectedChannel}
              channelName={selectedChannelName}
              serverId={selectedServer}
              onBack={handleBackToChannels}
              channelType={selectedChannelType}
              onLeaveVoice={handleLeaveVoice}
            />
          </div>
        )}

        <MobileNavigation onOpenSettings={handleOpenSettings} />

        {isSettingsOpen && <UserSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}

        <CreateOrJoinServer
          isOpen={isCreateOrJoinServerOpen}
          onClose={() => setIsCreateOrJoinServerOpen(false)}
          onServerCreated={fetchServers}
        />

        {selectedServer !== 0 && selectedServer !== null && (
          <InviteModal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            serverId={selectedServer}
          />
        )}

        <BetaWelcomeModal isOpen={showBetaWelcome} onClose={() => setShowBetaWelcome(false)} />
        {inviteCodeToJoin && (
          <JoinServerModal
            isOpen={isJoinServerModalOpen}
            onClose={handleCloseJoinServerModal}
            inviteCode={inviteCodeToJoin}
            fetchServers={fetchServers}
          />
        )}
      </div>
    )
  }

  // Update the desktop UI rendering condition to explicitly handle home differently
  const channelName = selectedChannelName || ""
  return (
    <div className="flex h-screen bg-[#1e1f22] text-sm">
      <ServerList
        servers={servers}
        selectedServer={selectedServer}
        onServerClick={handleServerClick}
        onCreateServer={() => setIsCreateOrJoinServerOpen(true)}
        onSignOut={handleSignOut}
        onDeleteServer={handleDeleteServer}
        currentUserId={currentUser?.id}
        currentUser={currentUser}
      />

      {selectedServer === 0 ? (
        <div className="flex-1 overflow-hidden h-full">
          <HomePage />
        </div>
      ) : (
        <>
          <ChannelList
            serverId={selectedServer}
            onSelectChannel={handleSelectChannel}
            onInvite={() => setIsInviteModalOpen(true)}
            isServerOwner={servers.find((s) => s.id === selectedServer)?.owner_id === currentUser?.id}
            selectedChannelId={selectedChannel}
            onLeaveServer={handleLeaveServer}
          />

          {/* Render different components based on channel type */}
          {selectedChannelType === "voice" ? (
            <VoiceArea
              channelId={selectedChannel!}
              channelName={channelName}
              serverId={selectedServer || 0}
              onLeave={handleLeaveVoice}
            />
          ) : (
            <ChatArea
              channelId={selectedChannel}
              channelName={channelName}
              serverId={selectedServer || 0}
              channelType={selectedChannelType}
              onLeaveVoice={handleLeaveVoice}
            />
          )}

          {/* Only show members list for text channels */}
          {selectedChannelType === "text" && <ServerMembersList serverId={selectedServer} />}
        </>
      )}

      <CreateOrJoinServer
        isOpen={isCreateOrJoinServerOpen}
        onClose={() => setIsCreateOrJoinServerOpen(false)}
        onServerCreated={fetchServers}
      />

      {selectedServer !== 0 && selectedServer !== null && (
        <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} serverId={selectedServer} />
      )}

      <UserSettings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <BetaWelcomeModal isOpen={showBetaWelcome} onClose={() => setShowBetaWelcome(false)} />
      {inviteCodeToJoin && (
        <JoinServerModal
          isOpen={isJoinServerModalOpen}
          onClose={handleCloseJoinServerModal}
          inviteCode={inviteCodeToJoin}
          fetchServers={fetchServers}
        />
      )}
    </div>
  )
}
