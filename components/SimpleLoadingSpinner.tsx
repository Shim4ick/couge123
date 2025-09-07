"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SimpleLoadingSpinnerProps {
  className?: string
}

export default function SimpleLoadingSpinner({ className }: SimpleLoadingSpinnerProps) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} />
}
