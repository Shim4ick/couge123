"use client"

import type React from "react"

import { useState, useEffect, createContext, useContext } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Import the usePresence hook
import { usePresence } from "@/hooks/usePresence"

type UserContextType = {
  currentUser: any | null
}

const UserContext = createContext<UserContextType>({
  currentUser: null,
})

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    fetchUser()
  }, [supabase.auth])

  // Inside the UserProvider component, after the useEffect hook that fetches the user, add:
  // Use the presence hook to track user online status
  usePresence(currentUser?.id)

  return <UserContext.Provider value={{ currentUser }}>{children}</UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
