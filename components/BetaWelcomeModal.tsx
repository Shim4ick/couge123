"use client"

import { useState, useEffect, useRef } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { ChevronDown } from "lucide-react"

interface BetaWelcomeModalProps {
  isOpen: boolean
  onClose: () => void
}

export function BetaWelcomeModal({ isOpen, onClose }: BetaWelcomeModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    checkWelcomeStatus()
  }, [])

  const checkWelcomeStatus = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from("profiles").select("has_seen_beta_welcome").eq("id", user.id).single()

      if (error) {
        console.error("Error fetching welcome status:", error)
        return
      }

      if (!data.has_seen_beta_welcome) {
        // setIsOpen(true); // isOpen is now a prop
      }
    }
  }

  const handleScroll = () => {
    if (scrollAreaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
      if (scrollHeight - scrollTop <= clientHeight + 1) {
        setHasScrolledToBottom(true)
      }
    }
  }

  const handleClose = async () => {
    if (!hasScrolledToBottom) return

    onClose()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { error } = await supabase.from("profiles").update({ has_seen_beta_welcome: true }).eq("id", user.id)

      if (error) {
        console.error("Error updating welcome status:", error)
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-[#18191c] rounded-xl overflow-hidden w-full max-w-md"
          >
            <div className="p-6 space-y-6">
              <div className="flex justify-center">
                <Image
                  src="/images/frame-2077-photoroom.png"
                  alt="Couge Logo"
                  width={80}
                  height={80}
                  className="dark:invert-0"
                />
              </div>
              <h2 className="text-2xl font-bold text-center text-white">Welcome to the Couge Beta Test!</h2>
              <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                className="h-[300px] overflow-y-auto pr-4 custom-scrollbar"
              >
                <div className="space-y-4 text-[#B9BBBE]">
                  <p>Dear Beta Tester,</p>
                  <p>
                    We are thrilled to welcome you to the beta testing of Couge! Your participation means a great deal
                    to our team, and we look forward to your feedback to help us improve the platform.
                  </p>
                  <p>
                    Couge is a new approach to modern communications, combining the best features of messengers and
                    social networks. We strive to create a space where communication becomes deeper, more interesting,
                    and more productive.
                  </p>
                  <div className="mt-4">
                    <button
                      onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
                      className={`flex items-center justify-between w-full px-4 py-2 text-left text-white bg-[#2f3136] rounded-lg focus:outline-none ${isInstructionsOpen ? "rounded-b-none" : ""}`}
                    >
                      <span className="font-semibold">Instructions for Beta Testers</span>
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${
                          isInstructionsOpen ? "transform rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence>
                      {isInstructionsOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-[#292b2f] rounded-b-lg px-4 py-3 space-y-2"
                        >
                          <p>1. Explore all the features of Couge and share your impressions.</p>
                          <p>2. Pay attention to the user-friendliness and intuitiveness of the interface.</p>
                          <p>3. Test the app's performance on different devices.</p>
                          <p>4. Try non-standard usage scenarios and report any errors you encounter.</p>
                          <p>5. Suggest ideas for improving existing features or adding new ones.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <p>
                    Your experience and feedback are invaluable to us. They will help make Couge better for all future
                    users. Feel free to share any ideas or problems you encounter.
                  </p>
                  <p>Thank you for your support and enthusiasm. Together we will create something truly special!</p>
                  <p>
                    With best wishes,
                    <br />
                    The Couge Team
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-[#111214]">
              <Button
                onClick={handleClose}
                disabled={!hasScrolledToBottom}
                className={`w-full ${
                  hasScrolledToBottom
                    ? "bg-[#5865F2] hover:bg-[#4752C4] text-white"
                    : "bg-[#4E5058] text-[#B9BBBE] cursor-not-allowed"
                }`}
              >
                {hasScrolledToBottom ? "Start Testing" : "Scroll to the end"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
