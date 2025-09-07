"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"

interface DeleteServerModalProps {
  isOpen: boolean
  onClose: () => void
  serverId: number
  serverName: string
  onDeleteSuccess: () => void
}

export default function DeleteServerModal({
  isOpen,
  onClose,
  serverId,
  serverName,
  onDeleteSuccess,
}: DeleteServerModalProps) {
  const [confirmationInput, setConfirmationInput] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const supabase = createClientComponentClient()

  const handleDeleteServer = async () => {
    if (confirmationInput !== serverName) {
      toast({
        title: "Ошибка",
        description: "Введенное название сервера не совпадает.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase.from("servers").delete().eq("id", serverId)

      if (error) throw error

      toast({
        title: "Успешно",
        description: "Сервер был удален.",
      })
      onDeleteSuccess()
    } catch (error) {
      console.error("Error deleting server:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сервер. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#313338] text-white border-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Remove '{serverName}'</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-[#B9BBBE]">
            Are you sure you want to delete this server? This action is irreversible and will result in the deletion of all channels and
            messages.
          </p>
          <p className="text-[#B9BBBE]">
            Please enter the server name <span className="font-semibold">'{serverName}'</span> to
            confirm:
          </p>
          <Input
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="Enter the server name"
            className="bg-[#1E1F22] border-none text-white"
          />
          <div className="flex justify-end space-x-2">
            <Button onClick={onClose} variant="ghost" className="hover:bg-[#4E5058] text-white">
              Cancel
            </Button>
            <Button
              onClick={handleDeleteServer}
              disabled={confirmationInput !== serverName || isDeleting}
              className="bg-[#ED4245] hover:bg-[#A12D2F] text-white"
            >
              {isDeleting ? <SimpleLoadingSpinner /> : "Delete the server"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
