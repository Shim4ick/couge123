"use client"

import { forwardRef, type React, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { v4 as uuidv4 } from "uuid"
import type { AttachmentFile } from "./FilePreview"
import WarningModal from "./WarningModal"

interface FileUploadProps {
  channelId: number | null
  onFileSelected: (file: AttachmentFile) => void
  onUploadError: (fileId: string, error: string) => void
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  ({ channelId, onFileSelected, onUploadError }, ref) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    // Add state for the warning modal
    const [isWarningModalOpen, setIsWarningModalOpen] = useState(false)
    const [fileSizeInfo, setFileSizeInfo] = useState({ size: "", maxSize: "" })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files || !channelId) return

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Check file size (5MB limit)
        if (file.size > MAX_FILE_SIZE) {
          const fileSize = formatFileSize(file.size)
          const maxSize = formatFileSize(MAX_FILE_SIZE)
          setFileSizeInfo({ size: fileSize, maxSize: maxSize })
          setIsWarningModalOpen(true)
          return
        }

        // Check if it's an image
        if (!file.type.startsWith("image/")) {
          onUploadError(uuidv4(), "Only images are supported at this time")
          continue
        }

        // Create a preview URL
        const previewUrl = URL.createObjectURL(file)

        // Generate a unique ID for this file
        const fileId = uuidv4()

        // Create the attachment object
        const attachment: AttachmentFile = {
          id: fileId,
          file,
          previewUrl,
          status: "ready",
        }

        // Notify about the new file
        onFileSelected(attachment)
      }

      // Reset the input
      if (ref && "current" in ref && ref.current) {
        ref.current.value = ""
      }
    }

    // Add a helper function to format file sizes:
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return "0 Bytes"
      const k = 1024
      const sizes = ["Bytes", "KB", "MB", "GB"]
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
    }

    return (
      <>
        <input ref={ref} type="file" onChange={handleFileUpload} className="hidden" accept="image/*" multiple />
        {/* Add this at the end of your component return */}
        <WarningModal
          isOpen={isWarningModalOpen}
          onClose={() => setIsWarningModalOpen(false)}
          type="fileSize"
          fileSize={fileSizeInfo.size}
          maxFileSize={fileSizeInfo.maxSize}
        />
      </>
    )
  },
)

FileUpload.displayName = "FileUpload"

export default FileUpload
