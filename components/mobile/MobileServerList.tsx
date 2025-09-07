"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "next/image"

type Server = {
  id: number
  name: string
  invite_code: string
  owner_id: string
  avatar_url: string | null
}

type MobileServerListProps = {
  servers: Server[]
  selectedServer: number | null
  onServerClick: (serverId: number) => void
}

export default function MobileServerList({ servers, selectedServer, onServerClick }: MobileServerListProps) {
  return (
    <div className="w-[60px] bg-[#1e1f22] flex flex-col items-center py-3 h-full overflow-y-auto">
      <div className="space-y-2">
        <motion.div className="relative">
          <Button
            variant="ghost"
            className={`relative w-10 h-10 rounded-[20px] bg-[#313338] text-white hover:bg-indigo-500 hover:rounded-[14px] transition-all duration-200 group mb-1 flex items-center justify-center overflow-visible
${selectedServer === 0 ? "bg-indigo-500 rounded-[14px]" : ""}
before:absolute before:-left-[10px] before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:bg-white before:rounded-r
before:transition-all before:duration-200 before:ease-in-out
${
  selectedServer === 0
    ? "before:opacity-100 before:h-8"
    : "before:opacity-0 before:h-4 hover:before:opacity-100 hover:before:h-4"
}`}
            onClick={() => onServerClick(0)}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <Image
                src="/images/couge-logo.svg"
                alt="Home"
                width={48}
                height={48}
                className="w-full h-full scale-[1.8]"
                priority
              />
            </div>
          </Button>
        </motion.div>
        <div className="w-10 h-[2px] bg-[#35363c] rounded-lg mb-2" />
        {servers.map((server) => (
          <motion.div className="relative" key={server.id}>
            <Button
              variant="ghost"
              className={`relative w-10 h-10 rounded-[20px] bg-[#313338] text-white hover:bg-indigo-500 hover:rounded-[14px] transition-all duration-200 group mb-1
${selectedServer === server.id ? "bg-indigo-500 rounded-[14px]" : ""}
before:absolute before:-left-[10px] before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:bg-white before:rounded-r
before:transition-all before:duration-200 before:ease-in-out
${
  selectedServer === server.id
    ? "before:opacity-100 before:h-8"
    : "before:opacity-0 before:h-4 hover:before:opacity-100 hover:before:h-4"
}`}
              onClick={() => onServerClick(server.id)}
            >
              {server.avatar_url ? (
                <img
                  src={server.avatar_url || "/placeholder.svg"}
                  alt={server.name}
                  className="absolute inset-0 w-full h-full rounded-[inherit] object-cover"
                />
              ) : (
                server.name.charAt(0).toUpperCase()
              )}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
