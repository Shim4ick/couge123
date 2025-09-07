"use client"

import type React from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import SimpleLoadingSpinner from "./SimpleLoadingSpinner"

export type AttachmentFile = {
  id: string
  file: File
  previewUrl: string
  status: "uploading" | "ready" | "error"
  progress?: number
  url?: string
}

interface FilePreviewProps {
  files: AttachmentFile[]
  onRemove: (id: string) => void
}

const FilePreview: React.FC<FilePreviewProps> = ({ files, onRemove }) => {
  if (files.length === 0) return null

  const formatFileSize = (bytes: number): string => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    } else {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
  }

  return (
    <div className="bg-[#2b2d31] rounded-t-lg px-3 py-2 transition-transform duration-200">
      <div className="flex flex-row flex-wrap gap-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center space-x-2 rounded-md overflow-hidden relative group bg-[#36373d] p-1 w-[180px]"
          >
            <div className="w-8 h-8 rounded-md overflow-hidden shrink-0">
              <img
                src={file.previewUrl || "/placeholder.svg"}
                alt={file.file.name}
                className={`w-full h-full object-cover ${file.status === "uploading" ? "opacity-50" : ""}`}
              />
              {file.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <SimpleLoadingSpinner className="text-white w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate max-w-[110px]">{file.file.name}</p>
              <p className="text-xs text-[#949ba4]">{formatFileSize(file.file.size)}</p>
            </div>
            <Button
              onClick={() => onRemove(file.id)}
              variant="ghost"
              size="icon"
              className="absolute top-0 right-0 w-5 h-5 rounded-full bg-[#36373d] text-white opacity-0 group-hover:opacity-100 transition-opacity border-none"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FilePreview
