"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User } from "lucide-react"
import type React from "react" // Added import for React

type DirectMessage = {
  id: number
  content: string
  sender_id: string
  recipient_id: string
  created_at: string
}

type Profile = {
  id: string
  username: string
  avatar_url: string | null
}

export default function DirectMessages() {
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProfiles()
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages()
    }
  }, [selectedUser])

  const fetchProfiles = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from("profiles").select("*").neq("id", user.id)
      if (error) {
        console.error("Error fetching profiles:", error)
      } else {
        setProfiles(data)
      }
    }
  }

  const fetchMessages = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && selectedUser) {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
      if (error) {
        console.error("Error fetching direct messages:", error)
      } else {
        setMessages(data)
      }
    }
  }

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && selectedUser && newMessage.trim()) {
      const { error } = await supabase.from("direct_messages").insert({
        content: newMessage,
        sender_id: user.id,
        recipient_id: selectedUser,
      })
      if (error) {
        console.error("Error sending direct message:", error)
      } else {
        setNewMessage("")
        fetchMessages()
      }
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-64 bg-gray-800 p-4">
        <h2 className="text-white font-semibold mb-4">Прямые сообщения</h2>
        {profiles.map((profile) => (
          <Button
            key={profile.id}
            variant="ghost"
            className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700 mb-2"
            onClick={() => setSelectedUser(profile.id)}
          >
            <User className="mr-2 h-4 w-4" />
            {profile.username}
          </Button>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-700">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-4 ${message.sender_id === selectedUser ? "text-left" : "text-right"}`}
                >
                  <div
                    className={`inline-block p-2 rounded-lg ${message.sender_id === selectedUser ? "bg-blue-500" : "bg-green-500"}`}
                  >
                    <p className="text-white">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{new Date(message.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="p-4 bg-gray-800">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Написать сообщение..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit">Отправить</Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-700">
            <p className="text-white">Выберите пользователя для начала общения</p>
          </div>
        )}
      </div>
    </div>
  )
}
