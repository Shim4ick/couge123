"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Search, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { toast } from "@/components/ui/use-toast"

interface Member {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  hasRole: boolean
}

interface RoleMembersTabProps {
  serverId: number
  roleId?: number
}

export default function RoleMembersTab({ serverId, roleId }: RoleMembersTabProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [initialSelectedMembers, setInitialSelectedMembers] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createBrowserClient()

  useEffect(() => {
    if (serverId && roleId) {
      fetchMembers()
    } else {
      setMembers([])
      setIsLoading(false)
    }
  }, [serverId, roleId])

  const fetchMembers = async () => {
    if (!roleId) return

    setIsLoading(true)
    try {
      // Fetch all server members
      const { data: serverMembers, error: membersError } = await supabase
        .from("server_members")
        .select(`
          user_id,
          users:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq("server_id", serverId)

      if (membersError) throw membersError

      // Fetch members with this role
      const { data: roleMembers, error: roleMembersError } = await supabase
        .from("role_members")
        .select("user_id")
        .eq("role_id", roleId)

      if (roleMembersError) throw roleMembersError

      // Create a set of user IDs with this role
      const roleUserIds = new Set(roleMembers.map((rm) => rm.user_id))
      setInitialSelectedMembers(roleUserIds)
      setSelectedMembers(new Set(roleUserIds))

      // Map server members with role information
      const mappedMembers = serverMembers.map((member) => ({
        id: member.users.id,
        username: member.users.username,
        display_name: member.users.display_name,
        avatar_url: member.users.avatar_url,
        hasRole: roleUserIds.has(member.users.id),
      }))

      setMembers(mappedMembers)
    } catch (error) {
      console.error("Error fetching members:", error)
      toast({
        title: "Error",
        description: "Failed to load server members",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleMember = (memberId: string) => {
    const newSelectedMembers = new Set(selectedMembers)
    if (newSelectedMembers.has(memberId)) {
      newSelectedMembers.delete(memberId)
    } else {
      newSelectedMembers.add(memberId)
    }
    setSelectedMembers(newSelectedMembers)
  }

  const handleSaveChanges = async () => {
    if (!roleId) return

    setIsSaving(true)
    try {
      // Find members to add to the role
      const membersToAdd = Array.from(selectedMembers).filter((id) => !initialSelectedMembers.has(id))

      // Find members to remove from the role
      const membersToRemove = Array.from(initialSelectedMembers).filter((id) => !selectedMembers.has(id))

      // Add members to the role
      if (membersToAdd.length > 0) {
        const roleMembersToAdd = membersToAdd.map((userId) => ({
          role_id: roleId,
          user_id: userId,
        }))

        const { error: addError } = await supabase.from("role_members").insert(roleMembersToAdd)

        if (addError) throw addError
      }

      // Remove members from the role
      if (membersToRemove.length > 0) {
        for (const userId of membersToRemove) {
          const { error: removeError } = await supabase
            .from("role_members")
            .delete()
            .eq("role_id", roleId)
            .eq("user_id", userId)

          if (removeError) throw removeError
        }
      }

      // Update local state
      setInitialSelectedMembers(new Set(selectedMembers))

      // Update the hasRole property for members
      setMembers(
        members.map((member) => ({
          ...member,
          hasRole: selectedMembers.has(member.id),
        })),
      )

      toast({
        title: "Success",
        description: "Role members updated successfully",
      })
    } catch (error) {
      console.error("Error saving role members:", error)
      toast({
        title: "Error",
        description: "Failed to update role members",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = () => {
    if (initialSelectedMembers.size !== selectedMembers.size) return true

    for (const id of initialSelectedMembers) {
      if (!selectedMembers.has(id)) return true
    }

    for (const id of selectedMembers) {
      if (!initialSelectedMembers.has(id)) return true
    }

    return false
  }

  // Filter members based on search query
  const filteredMembers = members.filter(
    (member) =>
      member.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <SimpleLoadingSpinner />
      </div>
    )
  }

  if (!roleId) {
    return <div className="text-center py-8 text-[#949BA4]">Select or create a role to manage its members</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949BA4]" />
          <Input
            placeholder="Search members"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-[#1E1F22] border-none text-white placeholder-[#949BA4]"
          />
        </div>
      </div>

      <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
        {filteredMembers.length > 0 ? (
          filteredMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-md hover:bg-[#2E3035]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1e1f22] overflow-hidden">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url || "/placeholder.svg"}
                      alt={member.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      {member.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-white font-medium">{member.display_name}</div>
                  <div className="text-[#B9BBBE] text-sm">@{member.username}</div>
                </div>
              </div>
              <Checkbox
                checked={selectedMembers.has(member.id)}
                onCheckedChange={() => handleToggleMember(member.id)}
                className="h-5 w-5 border-[#72767d] data-[state=checked]:bg-[#5865F2] data-[state=checked]:border-[#5865F2]"
              />
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-[#949BA4] text-sm">
            {searchQuery ? "No members found" : "No members in this server"}
          </div>
        )}
      </div>

      {hasChanges() && (
        <div className="pt-4">
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="bg-[#5865F2] hover:bg-[#4752C4] text-white"
          >
            {isSaving ? (
              <>
                <SimpleLoadingSpinner className="w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
