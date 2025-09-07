"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { X, Folder } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"

interface CategorySettingsProps {
  isOpen: boolean
  onClose: () => void
  category: {
    id: number
    name: string
    server_id: number
  }
  onCategoryUpdate: () => void
}

export default function CategorySettings({ isOpen, onClose, category, onCategoryUpdate }: CategorySettingsProps) {
  const [categoryName, setCategoryName] = useState(category.name)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClientComponentClient()

  useEffect(() => {
    setCategoryName(category.name)
  }, [category])

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("categories").update({ name: categoryName }).eq("id", category.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Category updated successfully",
      })
      onCategoryUpdate()
      onClose()
    } catch (error) {
      console.error("Error updating category:", error)
      toast({
        title: "Error",
        description: "Failed to update category. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-[#313338] z-50 text-[#f2f3f5]">
      <div className="flex h-full">
        <div className="w-[232px] bg-[#2b2d31] pt-15">
          <div className="px-[10px] pt-[60px]">
            <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] px-2.5">CATEGORY SETTINGS</div>
            <button className="w-full px-2.5 py-[6px] rounded text-[16px] text-left transition-colors bg-[#404249] text-white">
              Overview
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#313338] relative flex flex-col">
          <div className="absolute top-0 right-0 p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-[#4E5058] text-[#b5bac1] hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="p-10 pt-[60px] h-full overflow-y-auto pr-0">
            <div className="max-w-[740px] mr-10">
              <div className="flex items-center mb-6">
                <Folder className="w-6 h-6 mr-2 text-[#b5bac1]" />
                <h2 className="text-white text-xl font-semibold">{category.name}</h2>
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <label htmlFor="categoryName" className="block text-xs font-semibold text-[#B9BBBE] uppercase">
                    CATEGORY NAME
                  </label>
                  <Input
                    id="categoryName"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={isLoading || categoryName === category.name}
                  className="bg-[#5865F2] hover:bg-[#4752C4] text-white min-w-[120px]"
                >
                  {isLoading ? <SimpleLoadingSpinner /> : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
