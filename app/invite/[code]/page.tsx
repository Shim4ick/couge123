"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.code as string

  useEffect(() => {
    const deepLink = `couge://?invite=${inviteCode}`

    const fallbackTimeout = setTimeout(() => {
      // Если приложение не установлено — продолжаем обычную логику
      router.push(`/?invite=${inviteCode}`)
    }, 1500)

    const iframe = document.createElement("iframe")
    iframe.style.display = "none"
    iframe.src = deepLink
    document.body.appendChild(iframe)

    return () => {
      clearTimeout(fallbackTimeout)
      document.body.removeChild(iframe)
    }
  }, [inviteCode, router])

  return null
}
