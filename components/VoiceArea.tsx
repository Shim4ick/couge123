"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mic, MicOff, Headphones, PhoneOff, Settings, Volume2, VolumeX } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type VoiceUser = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_muted: boolean
  is_deafened: boolean
  is_speaking: boolean
}

type VoiceAreaProps = {
  channelId: number
  channelName: string
  serverId: number
  onLeave: () => void
}

export default function VoiceArea({ channelId, channelName, serverId, onLeave }: VoiceAreaProps) {
  const [voiceUsers, setVoiceUsers] = useState<VoiceUser[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [peerConnections, setPeerConnections] = useState<Map<string, RTCPeerConnection>>(new Map())
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set())

  const supabase = createClientComponentClient()
  const { toast } = useToast()
  const animationFrameRef = useRef<number>()
  const speakingTimeoutRef = useRef<{ [key: string]: NodeJS.Timeout }>({})

  // Initialize audio context and get user media
  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      setLocalStream(stream)

      // Create audio context for voice detection
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyserNode = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)

      analyserNode.fftSize = 256
      source.connect(analyserNode)

      setAudioContext(audioCtx)
      setAnalyser(analyserNode)

      return stream
    } catch (error) {
      console.error("Error accessing microphone:", error)
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
      throw error
    }
  }, [toast])

  // Voice activity detection
  const detectVoiceActivity = useCallback(() => {
    if (!analyser) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const checkAudio = () => {
      analyser.getByteFrequencyData(dataArray)

      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength
      const threshold = 30 // Adjust this value to change sensitivity

      const speaking = average > threshold

      if (speaking !== isSpeaking) {
        setIsSpeaking(speaking)
        updateSpeakingStatus(speaking)
      }

      animationFrameRef.current = requestAnimationFrame(checkAudio)
    }

    checkAudio()
  }, [analyser, isSpeaking])

  // Update speaking status in database
  const updateSpeakingStatus = useCallback(
    async (speaking: boolean) => {
      if (!currentUser) return

      try {
        await supabase
          .from("voice_sessions")
          .update({ is_speaking: speaking })
          .eq("user_id", currentUser.id)
          .eq("channel_id", channelId)
      } catch (error) {
        console.error("Error updating speaking status:", error)
      }
    },
    [currentUser, channelId, supabase],
  )

  // Join voice channel
  const joinVoiceChannel = useCallback(async () => {
    if (!currentUser) return

    try {
      const stream = await initializeAudio()

      // Add user to voice session
      await supabase.from("voice_sessions").upsert({
        user_id: currentUser.id,
        channel_id: channelId,
        is_muted: isMuted,
        is_deafened: isDeafened,
        is_speaking: false,
      })

      setIsConnected(true)
      detectVoiceActivity()

      toast({
        title: "Connected",
        description: `Joined voice channel #${channelName}`,
      })
    } catch (error) {
      console.error("Error joining voice channel:", error)
      toast({
        title: "Connection Error",
        description: "Failed to join voice channel",
        variant: "destructive",
      })
    }
  }, [currentUser, channelId, channelName, isMuted, isDeafened, initializeAudio, detectVoiceActivity, supabase, toast])

  // Leave voice channel
  const leaveVoiceChannel = useCallback(async () => {
    try {
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }

      // Close peer connections
      peerConnections.forEach((pc) => pc.close())
      setPeerConnections(new Map())

      // Close audio context
      if (audioContext) {
        await audioContext.close()
        setAudioContext(null)
      }

      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      // Remove from voice session
      if (currentUser) {
        await supabase.from("voice_sessions").delete().eq("user_id", currentUser.id).eq("channel_id", channelId)
      }

      setIsConnected(false)
      setIsSpeaking(false)
      onLeave()

      toast({
        title: "Disconnected",
        description: "Left voice channel",
      })
    } catch (error) {
      console.error("Error leaving voice channel:", error)
    }
  }, [localStream, peerConnections, audioContext, currentUser, channelId, supabase, onLeave, toast])

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState
      })
    }

    if (currentUser && isConnected) {
      await supabase
        .from("voice_sessions")
        .update({ is_muted: newMutedState })
        .eq("user_id", currentUser.id)
        .eq("channel_id", channelId)
    }
  }, [isMuted, localStream, currentUser, isConnected, channelId, supabase])

  // Toggle deafen
  const toggleDeafen = useCallback(async () => {
    const newDeafenedState = !isDeafened
    setIsDeafened(newDeafenedState)

    // If deafening, also mute
    if (newDeafenedState) {
      setIsMuted(true)
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = false
        })
      }
    }

    if (currentUser && isConnected) {
      await supabase
        .from("voice_sessions")
        .update({
          is_deafened: newDeafenedState,
          is_muted: newDeafenedState || isMuted,
        })
        .eq("user_id", currentUser.id)
        .eq("channel_id", channelId)
    }
  }, [isDeafened, isMuted, localStream, currentUser, isConnected, channelId, supabase])

  // Fetch current user
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchUser()
  }, [supabase])

  // Auto-join voice channel when component mounts
  useEffect(() => {
    if (currentUser) {
      joinVoiceChannel()
    }

    return () => {
      leaveVoiceChannel()
    }
  }, [currentUser])

  // Subscribe to voice session changes
  useEffect(() => {
    if (!channelId) return

    const fetchVoiceUsers = async () => {
      const { data, error } = await supabase
        .from("voice_sessions")
        .select(`
          user_id,
          is_muted,
          is_deafened,
          is_speaking,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("channel_id", channelId)

      if (error) {
        console.error("Error fetching voice users:", error)
        return
      }

      const users = data.map((session) => ({
        id: session.user_id,
        username: session.profiles?.username || "Unknown",
        display_name: session.profiles?.display_name || "Unknown",
        avatar_url: session.profiles?.avatar_url,
        is_muted: session.is_muted,
        is_deafened: session.is_deafened,
        is_speaking: session.is_speaking,
      }))

      setVoiceUsers(users)

      // Update speaking users set
      const speaking = new Set(users.filter((user) => user.is_speaking).map((user) => user.id))
      setSpeakingUsers(speaking)
    }

    fetchVoiceUsers()

    const channel = supabase
      .channel(`voice_channel_${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_sessions",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          fetchVoiceUsers()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelId, supabase])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      Object.values(speakingTimeoutRef.current).forEach((timeout) => {
        clearTimeout(timeout)
      })
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col bg-[#313338] relative">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-[#1e1f22] shadow-sm">
        <Volume2 className="w-5 h-5 text-[#949ba4] mr-2" />
        <h2 className="font-semibold text-white">{channelName}</h2>
        <div className="ml-auto flex items-center space-x-2">
          <span className="text-[#949ba4] text-sm">
            {voiceUsers.length} {voiceUsers.length === 1 ? "user" : "users"}
          </span>
        </div>
      </div>

      {/* Voice Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Main Voice Display */}
        <div className="relative mb-8">
          <div
            className={`relative w-32 h-32 rounded-full border-4 transition-all duration-300 ${
              isSpeaking && !isMuted
                ? "border-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                : "border-[#4f545c]"
            }`}
          >
            <Avatar className="w-full h-full">
              <AvatarImage src={currentUser?.user_metadata?.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl bg-[#5865f2]">
                {currentUser?.user_metadata?.display_name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            {/* Mute indicator */}
            {isMuted && (
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Deafen indicator */}
            {isDeafened && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <VolumeX className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {/* Username */}
          <div className="text-center mt-4">
            <h3 className="text-white font-semibold text-lg">{currentUser?.user_metadata?.display_name || "You"}</h3>
          </div>
        </div>

        {/* Other Users */}
        {voiceUsers.filter((user) => user.id !== currentUser?.id).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {voiceUsers
              .filter((user) => user.id !== currentUser?.id)
              .map((user) => (
                <div key={user.id} className="flex flex-col items-center">
                  <div
                    className={`relative w-20 h-20 rounded-full border-3 transition-all duration-300 ${
                      user.is_speaking && !user.is_muted
                        ? "border-green-500 shadow-lg shadow-green-500/50 animate-pulse"
                        : "border-[#4f545c]"
                    }`}
                  >
                    <Avatar className="w-full h-full">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="bg-[#5865f2]">
                        {user.display_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Mute indicator */}
                    {user.is_muted && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Deafen indicator */}
                    {user.is_deafened && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <VolumeX className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>

                  <span className="text-white text-sm mt-2 text-center">{user.display_name}</span>
                </div>
              ))}
          </div>
        )}

        {/* Decorative illustration when alone */}
        {voiceUsers.filter((user) => user.id !== currentUser?.id).length === 0 && (
          <div className="mb-8 opacity-50">
            <div className="w-48 h-32 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <div className="text-white text-center">
                <Volume2 className="w-12 h-12 mx-auto mb-2" />
                <p className="text-sm">Waiting for others to join...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 border-t border-[#1e1f22]">
        <div className="flex items-center justify-center space-x-4">
          {/* Mute button */}
          <Button
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full ${
              isMuted ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#4f545c] hover:bg-[#5d6269] text-white"
            }`}
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          {/* Deafen button */}
          <Button
            variant="ghost"
            size="lg"
            className={`w-12 h-12 rounded-full ${
              isDeafened ? "bg-red-500 hover:bg-red-600 text-white" : "bg-[#4f545c] hover:bg-[#5d6269] text-white"
            }`}
            onClick={toggleDeafen}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </Button>

          {/* Settings button */}
          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-[#4f545c] hover:bg-[#5d6269] text-white"
          >
            <Settings className="w-5 h-5" />
          </Button>

          {/* Disconnect button */}
          <Button
            variant="ghost"
            size="lg"
            className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white"
            onClick={leaveVoiceChannel}
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
