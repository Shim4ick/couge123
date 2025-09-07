"use client"

import { useState, useEffect } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { X, Folder, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ChannelSettingsProps {
  isOpen: boolean
  onClose: () => void
  channel: {
    id: number
    name: string
    server_id: number
    category_id: number
    description?: string
    allow_messages?: boolean
  }
  onChannelUpdate: () => void
}

export default function ChannelSettings({ isOpen, onClose, channel, onChannelUpdate }: ChannelSettingsProps) {
  const [channelName, setChannelName] = useState(channel.name)
  const [channelDescription, setChannelDescription] = useState(channel.description || "")
  const [allowMessages, setAllowMessages] = useState(channel.allow_messages !== false)
  const [isLoading, setIsLoading] = useState(false)
  const [categoryName, setCategoryName] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const supabase = createClientComponentClient()

  useEffect(() => {
    setChannelName(channel.name)
    setChannelDescription(channel.description || "")
    setAllowMessages(channel.allow_messages !== false)
    fetchCategoryName()
  }, [channel])

  const fetchCategoryName = async () => {
    const { data, error } = await supabase.from("categories").select("name").eq("id", channel.category_id).single()

    if (error) {
      console.error("Error fetching category name:", error)
    } else if (data) {
      setCategoryName(data.name)
    }
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("channels")
        .update({ name: channelName, description: channelDescription, allow_messages: allowMessages })
        .eq("id", channel.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Channel updated successfully",
      })
      onChannelUpdate()
      onClose()
    } catch (error) {
      console.error("Error updating channel:", error)
      toast({
        title: "Error",
        description: "Failed to update channel. Please try again.",
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
            <div className="text-[#b5bac1] text-xs font-semibold mb-[1px] px-2.5">CHANNEL SETTINGS</div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-col items-stretch bg-transparent h-auto space-y-0.5 p-0">
                <TabsTrigger
                  value="overview"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="w-full justify-start px-2.5 py-[6px] text-[16px] text-left data-[state=active]:bg-[#404249] data-[state=active]:text-white text-[#b5bac1] hover:bg-[#35373c] hover:text-white"
                >
                  Permissions
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
                <span className="text-white text-xl font-semibold">{categoryName}</span>
                <span className="text-[#b5bac1] text-xl mx-2">/</span>
                <Hash className="w-6 h-6 mr-2 text-[#b5bac1]" />
                <h2 className="text-white text-xl font-semibold">{channel.name}</h2>
              </div>

              <Tabs value={activeTab} className="w-full">
                <TabsContent value="overview" className="mt-0">
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <label htmlFor="channelName" className="block text-xs font-semibold text-[#B9BBBE] uppercase">
                        CHANNEL NAME
                      </label>
                      <Input
                        id="channelName"
                        value={channelName}
                        onChange={(e) => setChannelName(e.target.value)}
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2]"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="channelDescription"
                        className="block text-xs font-semibold text-[#B9BBBE] uppercase"
                      >
                        CHANNEL DESCRIPTION
                      </label>
                      <Textarea
                        id="channelDescription"
                        value={channelDescription}
                        onChange={(e) => setChannelDescription(e.target.value)}
                        className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#5865F2] min-h-[100px]"
                        placeholder="Enter a channel description"
                      />
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="permissions" className="mt-0">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white">Allow Messages</h3>
                        <p className="text-sm text-[#B9BBBE]">Allow members to send messages in this channel</p>
                      </div>
                      <Switch checked={allowMessages} onCheckedChange={setAllowMessages} className="bg-[#1e1f22]" />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-8">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
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
