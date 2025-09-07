"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import StatusIndicator from "./StatusIndicator"

type Profile = {
  id: string
  username: string
  avatar_url: string | null
  bio: string | null
}

export default function UserProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [editing, setEditing] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (error) {
        console.error("Error fetching profile:", error)
      } else {
        setProfile(data)
      }
    }
  }

  const updateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (profile) {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: profile.username,
          bio: profile.bio,
        })
        .eq("id", profile.id)
      if (error) {
        console.error("Error updating profile:", error)
      } else {
        setEditing(false)
      }
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && profile) {
      const { data, error } = await supabase.storage.from("avatars").upload(`${profile.id}/${file.name}`, file)
      if (error) {
        console.error("Error uploading avatar:", error)
      } else if (data) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(data.path)
        await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id)
        fetchProfile()
      }
    }
  }

  if (!profile) return <div>Loading...</div>

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      {editing ? (
        <form onSubmit={updateProfile} className="space-y-4">
          <Input
            type="text"
            value={profile.username}
            onChange={(e) => setProfile({ ...profile, username: e.target.value })}
            placeholder="Username"
          />
          <Textarea
            value={profile.bio || ""}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="About me"
          />
          <Button type="submit">Save</Button>
          <Button type="button" onClick={() => setEditing(false)} variant="outline">
            Cancel
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p>
            <strong>Username:</strong> {profile.username}
          </p>
          <p>
            <strong>About me:</strong> {profile.bio || "Not specified"}
          </p>
          <div className="relative">
            <img
              src={profile.avatar_url || "/placeholder-avatar.png"}
              alt="Avatar"
              className="w-32 h-32 rounded-full"
            />
            <StatusIndicator status="online" size="sm" />
          </div>
          <Input type="file" onChange={handleAvatarUpload} accept="image/*" />
          <Button onClick={() => setEditing(true)}>Edit</Button>
        </div>
      )}
    </div>
  )
}
