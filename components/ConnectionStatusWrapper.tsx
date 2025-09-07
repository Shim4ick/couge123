"use client"

import dynamic from "next/dynamic"

// Используем динамический импорт с ssr: false в клиентском компоненте
const ConnectionStatus = dynamic(() => import("@/components/ConnectionStatus"), { ssr: false })

export function ConnectionStatusWrapper() {
  return <ConnectionStatus />
}
