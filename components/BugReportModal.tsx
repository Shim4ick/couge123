"use client"

import { useState } from "react"
import { Flag } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { createBrowserClient } from "@supabase/ssr"

interface BugReportModalProps {
  isOpen: boolean
  onClose: () => void
  messageId: string
}

const bugCategories = [
  { value: "functionality", label: "Functionality Issue" },
  { value: "ui", label: "UI/Visual Bug" },
  { value: "performance", label: "Performance Problem" },
  { value: "security", label: "Security Concern" },
  { value: "other", label: "Other" },
]

export function BugReportModal({ isOpen, onClose, messageId }: BugReportModalProps) {
  const [category, setCategory] = useState<string>("")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createBrowserClient()

  const handleSubmit = async () => {
    if (!category || !description.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please select a category and provide a description.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from("bug_reports").insert({
        category,
        description: description.trim(),
        message_id: messageId,
        reporter_id: user?.id,
      })

      if (error) throw error

      toast({
        title: "Report Submitted",
        description: "Thank you for helping improve CougeApp.",
      })

      setCategory("")
      setDescription("")
      onClose()
    } catch (error) {
      console.error("Error submitting bug report:", error)
      toast({
        title: "Submission Failed",
        description: "Could not submit your report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#313338] text-white border-none p-0 max-w-md w-full overflow-hidden">
        <div className="p-4 border-b border-[#1e1f22]">
          <div className="flex items-center gap-2 mb-1">
            <Flag className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Report a Bug</h2>
          </div>
          <p className="text-sm text-[#B9BBBE]">Help us improve by reporting any issues you encounter.</p>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-[#B9BBBE] font-medium">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-[#1e1f22] border-none text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-[#1e1f22] border-[#2b2d31]">
                {bugCategories.map((category) => (
                  <SelectItem
                    key={category.value}
                    value={category.value}
                    className="text-white focus:bg-[#4752C4] focus:text-white"
                  >
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-[#B9BBBE] font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the issue in detail..."
              className="bg-[#1e1f22] border-none text-white h-32 resize-none placeholder:text-[#72767d]"
            />
          </div>
        </div>

        <div className="p-4 bg-[#2b2d31] flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} className="hover:bg-[#1e1f22] text-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
