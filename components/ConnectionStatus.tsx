"use client"

import { useState, useEffect, useRef } from "react"
import LogoLoadingSpinner from "./LogoLoadingSpinner"

export default function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [showLoading, setShowLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    function onlineHandler() {
      setIsOnline(true)
    }

    function offlineHandler() {
      setIsOnline(false)
    }

    window.addEventListener("online", onlineHandler)
    window.addEventListener("offline", offlineHandler)

    return () => {
      window.removeEventListener("online", onlineHandler)
      window.removeEventListener("offline", offlineHandler)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (!isOnline) {
      timerRef.current = setTimeout(() => setShowLoading(true), 500)
    } else {
      timerRef.current = setTimeout(() => setShowLoading(false), 500)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isOnline])

  return (
    <div
      className={`fixed inset-0 bg-[#36393f] flex items-center justify-center transition-all duration-1000 ${
        showLoading ? "opacity-100 z-50" : "opacity-0 -z-10"
      }`}
      style={{
        pointerEvents: showLoading ? "auto" : "none",
      }}
    >
      <LogoLoadingSpinner />
    </div>
  )
}
