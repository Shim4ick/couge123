"use client"

import { useEffect, useState, type FormEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, UserPlus, Search, UserX, Check, X } from "lucide-react"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import UserProfileModal from "@/components/UserProfileModal"

type FriendsTab = "all" | "pending" | "add" | "blocked"

type Friend = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  status?: string
}

type FriendRequest = {
  id: number
  sender_id: string
  recipient_id: string
  status: "pending" | "accepted" | "rejected" | "canceled"
  created_at: string
  sender?: Friend
  recipient?: Friend
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<FriendsTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [addFriendUsername, setAddFriendUsername] = useState("")
  const [addFriendStatus, setAddFriendStatus] = useState<
    "idle" | "success" | "error" | "self" | "exists" | "already_friends"
  >("idle")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [friends, setFriends] = useState<Friend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null)
  const supabase = createClient()

  // Reset states when changing tabs
  useEffect(() => {
    setSearchQuery("")
    setAddFriendUsername("")
    setAddFriendStatus("idle")
  }, [activeTab])

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchCurrentUser()
  }, [supabase])

  // Fetch friends and requests
  useEffect(() => {
    const fetchFriendsAndRequests = async () => {
      if (!currentUser) return

      setIsLoading(true)

      try {
        // Fetch friends - fixed query to avoid join issues
        const { data: friendsData, error: friendsError } = await supabase
          .from("friends")
          .select("friend_id")
          .eq("user_id", currentUser.id)

        if (friendsError) throw friendsError

        // Get friend profiles separately
        let friendProfiles: Friend[] = []
        if (friendsData && friendsData.length > 0) {
          const friendIds = friendsData.map((f) => f.friend_id)
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", friendIds)

          if (profilesError) throw profilesError
          friendProfiles = profilesData || []
        }

        // Fetch incoming requests
        const { data: incomingData, error: incomingError } = await supabase
          .from("friend_requests")
          .select("id, sender_id, recipient_id, status, created_at")
          .eq("recipient_id", currentUser.id)
          .eq("status", "pending")

        if (incomingError) throw incomingError

        // Get sender profiles separately
        let incomingWithProfiles: FriendRequest[] = []
        if (incomingData && incomingData.length > 0) {
          const senderIds = incomingData.map((req) => req.sender_id)
          const { data: sendersData, error: sendersError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", senderIds)

          if (sendersError) throw sendersError

          incomingWithProfiles = incomingData.map((req) => {
            const sender = sendersData?.find((s) => s.id === req.sender_id)
            return { ...req, sender }
          })
        }

        // Fetch outgoing requests
        const { data: outgoingData, error: outgoingError } = await supabase
          .from("friend_requests")
          .select("id, sender_id, recipient_id, status, created_at")
          .eq("sender_id", currentUser.id)
          .eq("status", "pending")

        if (outgoingError) throw outgoingError

        // Get recipient profiles separately
        let outgoingWithProfiles: FriendRequest[] = []
        if (outgoingData && outgoingData.length > 0) {
          const recipientIds = outgoingData.map((req) => req.recipient_id)
          const { data: recipientsData, error: recipientsError } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", recipientIds)

          if (recipientsError) throw recipientsError

          outgoingWithProfiles = outgoingData.map((req) => {
            const recipient = recipientsData?.find((r) => r.id === req.recipient_id)
            return { ...req, recipient }
          })
        }

        // Update state
        setFriends(friendProfiles)
        setIncomingRequests(incomingWithProfiles)
        setOutgoingRequests(outgoingWithProfiles)
      } catch (error) {
        console.error("Error fetching friends data:", error)
        toast({
          title: "Error",
          description: "Failed to load friends data",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (currentUser) {
      fetchFriendsAndRequests()
    }
  }, [currentUser, supabase])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser) return

    const friendsChannel = supabase
      .channel("friends-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friends", filter: `user_id=eq.${currentUser.id}` },
        () => {
          // Refetch friends when changes occur
          fetchFriends()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `sender_id=eq.${currentUser.id}` },
        () => {
          // Refetch outgoing requests
          fetchOutgoingRequests()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friend_requests", filter: `recipient_id=eq.${currentUser.id}` },
        () => {
          // Refetch incoming requests
          fetchIncomingRequests()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(friendsChannel)
    }
  }, [currentUser, supabase])

  const fetchFriends = async () => {
    if (!currentUser) return

    try {
      // Fetch friends - fixed query
      const { data: friendsData, error: friendsError } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", currentUser.id)

      if (friendsError) throw friendsError

      // Get friend profiles separately
      if (friendsData && friendsData.length > 0) {
        const friendIds = friendsData.map((f) => f.friend_id)
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", friendIds)

        if (profilesError) throw profilesError
        setFriends(profilesData || [])
      } else {
        setFriends([])
      }
    } catch (error) {
      console.error("Error fetching friends:", error)
    }
  }

  const fetchIncomingRequests = async () => {
    if (!currentUser) return

    try {
      // Fetch incoming requests
      const { data: incomingData, error: incomingError } = await supabase
        .from("friend_requests")
        .select("id, sender_id, recipient_id, status, created_at")
        .eq("recipient_id", currentUser.id)
        .eq("status", "pending")

      if (incomingError) throw incomingError

      // Get sender profiles separately
      let incomingWithProfiles: FriendRequest[] = []
      if (incomingData && incomingData.length > 0) {
        const senderIds = incomingData.map((req) => req.sender_id)
        const { data: sendersData, error: sendersError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", senderIds)

        if (sendersError) throw sendersError

        incomingWithProfiles = incomingData.map((req) => {
          const sender = sendersData?.find((s) => s.id === req.sender_id)
          return { ...req, sender }
        })
      }

      setIncomingRequests(incomingWithProfiles)
    } catch (error) {
      console.error("Error fetching incoming requests:", error)
    }
  }

  const fetchOutgoingRequests = async () => {
    if (!currentUser) return

    try {
      // Fetch outgoing requests
      const { data: outgoingData, error: outgoingError } = await supabase
        .from("friend_requests")
        .select("id, sender_id, recipient_id, status, created_at")
        .eq("sender_id", currentUser.id)
        .eq("status", "pending")

      if (outgoingError) throw outgoingError

      // Get recipient profiles separately
      let outgoingWithProfiles: FriendRequest[] = []
      if (outgoingData && outgoingData.length > 0) {
        const recipientIds = outgoingData.map((req) => req.recipient_id)
        const { data: recipientsData, error: recipientsError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", recipientIds)

        if (recipientsError) throw recipientsError

        outgoingWithProfiles = outgoingData.map((req) => {
          const recipient = recipientsData?.find((r) => r.id === req.recipient_id)
          return { ...req, recipient }
        })
      }

      setOutgoingRequests(outgoingWithProfiles)
    } catch (error) {
      console.error("Error fetching outgoing requests:", error)
    }
  }

  const handleAddFriend = async (e: FormEvent) => {
    e.preventDefault()

    if (!addFriendUsername.trim() || !currentUser) return

    setIsSubmitting(true)

    try {
      // Check if the username exists
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, username")
        .eq("username", addFriendUsername.trim())
        .single()

      if (userError) {
        setAddFriendStatus("error")
        return
      }

      // Check if trying to add self
      if (userData.id === currentUser.id) {
        setAddFriendStatus("self")
        return
      }

      // Check if can send friend request
      const { data: checkResult, error: checkError } = await supabase.rpc("can_send_friend_request", {
        sender: currentUser.id,
        recipient: userData.id,
      })

      if (checkError) throw checkError

      if (!checkResult.can_send) {
        if (checkResult.reason === "already_friends") {
          setAddFriendStatus("already_friends")
        } else if (checkResult.reason === "pending_request_exists") {
          setAddFriendStatus("exists")
        } else {
          setAddFriendStatus("error")
        }
        return
      }

      // Send friend request
      const { error: requestError } = await supabase.from("friend_requests").insert({
        sender_id: currentUser.id,
        recipient_id: userData.id,
        status: "pending",
      })

      if (requestError) throw requestError

      setAddFriendStatus("success")

      // Refresh outgoing requests
      fetchOutgoingRequests()
    } catch (error) {
      console.error("Error sending friend request:", error)
      setAddFriendStatus("error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAcceptRequest = async (requestId: number) => {
    try {
      const { error } = await supabase.rpc("accept_friend_request", { request_id: requestId })

      if (error) throw error

      // Refresh friends and requests
      fetchFriends()
      fetchIncomingRequests()

      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      })
    } catch (error) {
      console.error("Error accepting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      })
    }
  }

  const handleRejectRequest = async (requestId: number) => {
    try {
      const { error } = await supabase.from("friend_requests").update({ status: "rejected" }).eq("id", requestId)

      if (error) throw error

      // Refresh incoming requests
      fetchIncomingRequests()

      toast({
        title: "Friend request rejected",
      })
    } catch (error) {
      console.error("Error rejecting friend request:", error)
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      })
    }
  }

  const handleCancelRequest = async (requestId: number) => {
    try {
      const { error } = await supabase.from("friend_requests").update({ status: "canceled" }).eq("id", requestId)

      if (error) throw error

      // Refresh outgoing requests
      fetchOutgoingRequests()

      toast({
        title: "Friend request canceled",
      })
    } catch (error) {
      console.error("Error canceling friend request:", error)
      toast({
        title: "Error",
        description: "Failed to cancel friend request",
        variant: "destructive",
      })
    }
  }

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return

    try {
      // Delete both friendship records (bidirectional)
      const { error } = await supabase
        .from("friends")
        .delete()
        .or(
          `(user_id.eq.${currentUser.id}.and.friend_id.eq.${friendId}),(user_id.eq.${friendId}.and.friend_id.eq.${currentUser.id})`,
        )

      if (error) throw error

      // Refresh friends
      fetchFriends()

      toast({
        title: "Friend removed",
      })
    } catch (error) {
      console.error("Error removing friend:", error)
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive",
      })
    }
  }

  const handleViewProfile = (userId: string) => {
    setSelectedProfile(userId)
  }

  const filteredFriends = friends.filter(
    (friend) =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const renderAllFriendsTab = () => (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-2 border-b border-[#3f4147]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949BA4]" />
          <Input
            placeholder="Search friends"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1E1F22] border-none text-white placeholder-[#949BA4]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <SimpleLoadingSpinner className="w-8 h-8 text-[#5865F2]" />
        </div>
      ) : friends.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Users className="w-16 h-16 text-[#949ba4] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">It's empty here...</h3>
            <p className="text-[#949ba4]">
              Looks like your friends list is as empty as a fridge at the end of the month!
            </p>
            <p className="text-[#949ba4] mt-2">Add someone so you don't feel lonely in the digital world.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-white font-semibold mb-2">All Friends — {filteredFriends.length}</h3>

          {filteredFriends.length === 0 ? (
            <div className="bg-[#2b2d31] rounded-md p-4 text-center">
              <p className="text-[#949ba4]">No friends match your search.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-md hover:bg-[#36373d] transition-colors"
                >
                  <div className="flex items-center">
                    <Avatar className="w-10 h-10 mr-3 cursor-pointer" onClick={() => handleViewProfile(friend.id)}>
                      <AvatarImage src={friend.avatar_url || undefined} />
                      <AvatarFallback>{friend.display_name[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-medium">{friend.display_name}</p>
                      <p className="text-[#949ba4] text-sm">@{friend.username}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-[#949ba4] hover:text-white hover:bg-[#4f545c]"
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      <UserX className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderPendingTab = () => (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-2 border-b border-[#3f4147]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949BA4]" />
          <Input
            placeholder="Search requests"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1E1F22] border-none text-white placeholder-[#949BA4]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <SimpleLoadingSpinner className="w-8 h-8 text-[#5865F2]" />
        </div>
      ) : (
        <div className="p-4 overflow-y-auto">
          <h3 className="text-white font-semibold mb-2">Incoming ({incomingRequests.length})</h3>
          {incomingRequests.length === 0 ? (
            <div className="bg-[#2b2d31] rounded-md p-4 text-center mb-6">
              <p className="text-[#949ba4]">You have no incoming friend requests.</p>
              <p className="text-[#949ba4] mt-1">Looks like you're not as popular as you thought!</p>
            </div>
          ) : (
            <div className="space-y-2 mb-6">
              {incomingRequests
                .filter(
                  (request) =>
                    request.sender?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    request.sender?.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-md hover:bg-[#36373d] transition-colors"
                  >
                    <div className="flex items-center">
                      <Avatar
                        className="w-10 h-10 mr-3 cursor-pointer"
                        onClick={() => handleViewProfile(request.sender_id)}
                      >
                        <AvatarImage src={request.sender?.avatar_url || undefined} />
                        <AvatarFallback>{request.sender?.display_name[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{request.sender?.display_name}</p>
                        <p className="text-[#949ba4] text-sm">@{request.sender?.username}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-green-500 hover:text-green-400 hover:bg-[#4f545c]"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-400 hover:bg-[#4f545c]"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          <h3 className="text-white font-semibold mb-2">Outgoing ({outgoingRequests.length})</h3>
          {outgoingRequests.length === 0 ? (
            <div className="bg-[#2b2d31] rounded-md p-4 text-center">
              <p className="text-[#949ba4]">You haven't sent any friend requests.</p>
              <p className="text-[#949ba4] mt-1">Don't be shy, the first step is always yours!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {outgoingRequests
                .filter(
                  (request) =>
                    request.recipient?.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    request.recipient?.display_name.toLowerCase().includes(searchQuery.toLowerCase()),
                )
                .map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-md hover:bg-[#36373d] transition-colors"
                  >
                    <div className="flex items-center">
                      <Avatar
                        className="w-10 h-10 mr-3 cursor-pointer"
                        onClick={() => handleViewProfile(request.recipient_id)}
                      >
                        <AvatarImage src={request.recipient?.avatar_url || undefined} />
                        <AvatarFallback>{request.recipient?.display_name[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{request.recipient?.display_name}</p>
                        <p className="text-[#949ba4] text-sm">@{request.recipient?.username}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-[#949ba4] hover:text-white hover:bg-[#4f545c]"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderAddFriendTab = () => (
    <div className="w-full h-full flex flex-col p-4">
      <h2 className="text-xl font-semibold text-white mb-2">Add Friend</h2>
      <p className="text-[#949ba4] mb-6">
        You can add a friend by entering their username. Note that usernames are case-sensitive!
      </p>

      <form onSubmit={handleAddFriend}>
        <div className="relative">
          <Input
            placeholder="Enter a username (e.g. username)"
            value={addFriendUsername}
            onChange={(e) => {
              setAddFriendUsername(e.target.value)
              setAddFriendStatus("idle")
            }}
            className={cn(
              "bg-[#1E1F22] border-2 text-white placeholder-[#949BA4]",
              addFriendStatus === "success" && "border-green-500",
              (addFriendStatus === "error" ||
                addFriendStatus === "self" ||
                addFriendStatus === "exists" ||
                addFriendStatus === "already_friends") &&
                "border-red-500",
              addFriendStatus === "idle" && "border-[#1E1F22]",
            )}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#5865F2] hover:bg-[#4752C4] h-8"
            disabled={isSubmitting || !addFriendUsername.trim()}
          >
            {isSubmitting ? <SimpleLoadingSpinner className="w-4 h-4" /> : "Send Friend Request"}
          </Button>
        </div>

        {addFriendStatus === "success" && (
          <p className="text-green-500 mt-2">Friend request sent to {addFriendUsername} successfully.</p>
        )}

        {addFriendStatus === "error" && (
          <p className="text-red-500 mt-2">
            User {addFriendUsername} doesn't exist. Check the spelling of the username.
          </p>
        )}

        {addFriendStatus === "self" && <p className="text-red-500 mt-2">You cannot add yourself as a friend.</p>}

        {addFriendStatus === "exists" && (
          <p className="text-red-500 mt-2">A friend request with this user already exists.</p>
        )}

        {addFriendStatus === "already_friends" && (
          <p className="text-red-500 mt-2">You are already friends with this user.</p>
        )}
      </form>

      <div className="mt-8 p-4 bg-[#2b2d31] rounded-md">
        <p className="text-[#949ba4] text-center">
          The friends system is now fully functional! You can add friends, accept or reject requests, and manage your
          friends list.
        </p>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case "all":
        return renderAllFriendsTab()
      case "pending":
        return renderPendingTab()
      case "add":
        return renderAddFriendTab()
      default:
        return null
    }
  }

  return (
    <div className="flex-1 bg-[#313338] flex overflow-hidden rounded-l-lg h-full">
      {/* Direct Messages Sidebar */}
      <div className="w-60 bg-[#2b2d31] flex flex-col h-full rounded-tl-lg rounded-bl-lg">
        {/* Friends Button - Always active */}
        <button className="flex items-center px-2 py-2 mx-2 mt-2 rounded bg-[#36373d] text-white transition-colors">
          <Users className="w-5 h-5 mr-3" />
          <span className="font-medium">Friends</span>
        </button>

        {/* Separator */}
        <div className="h-[1px] bg-[#3f4147] mx-2 my-2"></div>

        {/* Direct Messages Header */}
        <div className="px-4 py-2">
          <h2 className="text-xs font-semibold text-[#949ba4] uppercase">Direct Messages</h2>
        </div>

        {/* Empty space for future direct messages */}
        <div className="flex-1"></div>
      </div>

      {/* Main Content Area - Friends System */}
      <div className="flex-1 bg-[#313338] flex flex-col">
        {/* Friends Header */}
        <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm">
          <Users className="w-5 h-5 text-[#949ba4] mr-2" />
          <h2 className="font-semibold text-white mr-2">Friends</h2>
          <div className="w-1 h-1 bg-[#949ba4] rounded-full mx-2"></div>

          <div className="flex items-center space-x-2">
            <button
              className={cn(
                "px-3 py-1 rounded",
                activeTab === "all" ? "bg-[#36373d] text-white" : "text-[#949ba4] hover:text-white hover:bg-[#36373d]",
              )}
              onClick={() => setActiveTab("all")}
            >
              All
            </button>
            <button
              className={cn(
                "px-3 py-1 rounded",
                activeTab === "pending"
                  ? "bg-[#36373d] text-white"
                  : "text-[#949ba4] hover:text-white hover:bg-[#36373d]",
              )}
              onClick={() => setActiveTab("pending")}
            >
              Pending
            </button>
            <Button
              className={cn(
                "ml-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-md px-3 py-1 h-auto text-sm",
                activeTab === "add" && "bg-[#4752C4]",
              )}
              onClick={() => setActiveTab("add")}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Add Friend
            </Button>
          </div>
        </div>

        {/* Friends Content Area */}
        <div className="flex-1 overflow-y-auto">{renderTabContent()}</div>
      </div>

      {/* User Profile Modal */}
      {selectedProfile && (
        <UserProfileModal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          userId={selectedProfile}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  )
}
