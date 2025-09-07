"use client"

import { AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface WarningModalProps {
  isOpen: boolean
  onClose: () => void
  type: "character" | "fileSize"
  characterCount?: number
  fileSize?: string
  maxFileSize?: string
}

export function WarningModal({ isOpen, onClose, type, characterCount, fileSize, maxFileSize }: WarningModalProps) {
  const getMessage = () => {
    if (type === "character") {
      return `Your message contains ${characterCount} characters, which exceeds the 2000 character limit. Please reduce the length of your message.`
    } else {
      return `You're trying to upload a file of ${fileSize}, but the current limit is ${maxFileSize || "8MB"}. Please select a smaller file.`
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="bg-[#18191c] border-none p-6 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              <h3 className="text-white font-semibold mb-4 text-base">
                {type === "character" ? "Character Limit Exceeded" : "File Size Limit Exceeded"}
              </h3>
              <p className="text-[#B9BBBE] text-sm mb-6">{getMessage()}</p>
              <Button onClick={onClose} className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium">
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}

export default WarningModal
