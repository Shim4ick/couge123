"use client"

import { useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { RealtimeChannel } from "@supabase/supabase-js"

export type UserStatus = "online" | "idle" | "dnd" | "offline"

export interface PresenceState {
  userId: string
  online: boolean
  status: UserStatus
  lastSeen: Date
}

export function usePresence(userId: string | undefined) {
  const supabase = createClientComponentClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!userId) return

    // Update user status to online
    const updateOnline = async () => {
      try {
        await supabase.from("user_status").upsert({
          user_id: userId,
          online: true,
          status: "online",
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error updating online status:", error)
      }
    }

    // Update user status to offline
    const goOffline = async () => {
      try {
        await supabase.from("user_status").upsert({
          user_id: userId,
          online: false,
          status: "offline",
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error("Error updating offline status:", error)
      }
    }

    // Set up heartbeat to update last_seen periodically
    const setupHeartbeat = () => {
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          await supabase.from("user_status").upsert({
            user_id: userId,
            online: true,
            status: "online",
            last_seen: new Date().toISOString(),
          })
        } catch (error) {
          console.error("Error updating heartbeat:", error)
        }
      }, 60000) // Update every minute
    }

    // Handle visibility change (tab focus/blur)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateOnline()
        setupHeartbeat()
      } else {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
        }
      }
    }

    // Set up realtime subscription
    const setupRealtimeSubscription = () => {
      channelRef.current = supabase
        .channel("user-presence")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_status",
          },
          (payload) => {
            console.log("Status changed:", payload.new)
            // Here you can dispatch to a global state or use SWR/React Query to update UI
          },
        )
        .subscribe()
    }

    // Initialize
    updateOnline()
    setupHeartbeat()
    setupRealtimeSubscription()

    // Set up event listeners
    window.addEventListener("beforeunload", goOffline)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }

      goOffline()

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      window.removeEventListener("beforeunload", goOffline)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [userId, supabase])
}
