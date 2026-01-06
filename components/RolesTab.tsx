"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Search, Plus, ChevronLeft, Pencil, MoreHorizontal, X, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import SimpleLoadingSpinner from "@/components/SimpleLoadingSpinner"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import RoleMembersTab from "./RoleMembersTab"
import CustomColorPicker from "./CustomColorPicker"

interface Role {
  id: number
  name: string
  color: string
  gradient_color?: string | null
  position: number
  display_separately: boolean
  member_count?: number
}

interface RolesTabProps {
  serverId: number
}

// Предустановленные цвета для ролей - организованы по парам светлый/темный
const PRESET_COLORS = [
  // Первый ряд - светлые оттенки
  ["#1ABC9C", "#3498DB", "#9B59B6", "#E91E63", "#F1C40F", "#E67E22", "#E74C3C", "#95A5A6", "#607D8B"],
  // Второй ряд - темные оттенки
  ["#11806A", "#206694", "#71368A", "#AD1457", "#C27C0E", "#A84300", "#992D22", "#546E7A", "#2C2F33"],
]

export default function RolesTab({ serverId }: RolesTabProps) {
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isCreatingRole, setIsCreatingRole] = useState(false)
  const [isEditingRole, setIsEditingRole] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [newRoleName, setNewRoleName] = useState("")
  const [roleColor, setRoleColor] = useState("#99AAB5")
  const [gradientColor, setGradientColor] = useState<string | null>(null)
  const [displaySeparately, setDisplaySeparately] = useState(false)
  const [activeTab, setActiveTab] = useState("display")
  const [isSaving, setIsSaving] = useState(false)
  const supabase = createBrowserClient()

  // Добавить состояние для отслеживания изменений
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialRoleName, setInitialRoleName] = useState("")
  const [initialRoleColor, setInitialRoleColor] = useState("#99AAB5")
  const [initialGradientColor, setInitialGradientColor] = useState<string | null>(null)
  const [initialDisplaySeparately, setInitialDisplaySeparately] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [serverId])

  useEffect(() => {
    if (selectedRole) {
      setGradientColor(selectedRole.gradient_color || null)
    }
  }, [selectedRole])

  // Добавить эффект для отслеживания изменений после handleEditRole
  useEffect(() => {
    if (selectedRole) {
      setInitialRoleName(selectedRole.name)
      setInitialRoleColor(selectedRole.color)
      setInitialGradientColor(selectedRole.gradient_color || null)
      setInitialDisplaySeparately(selectedRole.display_separately)
    } else if (isCreatingRole) {
      setHasUnsavedChanges(true)
    }
  }, [selectedRole, isCreatingRole])

  // Добавить эффект для проверки изменений
  useEffect(() => {
    if (isCreatingRole) {
      setHasUnsavedChanges(true)
      return
    }

    const isChanged =
      newRoleName !== initialRoleName ||
      roleColor !== initialRoleColor ||
      gradientColor !== initialGradientColor ||
      displaySeparately !== initialDisplaySeparately

    setHasUnsavedChanges(isChanged)
  }, [
    newRoleName,
    roleColor,
    gradientColor,
    displaySeparately,
    initialRoleName,
    initialRoleColor,
    initialGradientColor,
    initialDisplaySeparately,
    isCreatingRole,
  ])

  const fetchRoles = async () => {
    setIsLoading(true)
    try {
      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("server_roles")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true })

      if (rolesError) throw rolesError

      // Fetch member counts for each role
      const rolesWithCounts = await Promise.all(
        (rolesData || []).map(async (role) => {
          const { count, error: countError } = await supabase
            .from("role_members")
            .select("*", { count: "exact", head: true })
            .eq("role_id", role.id)

          if (countError) {
            console.error("Error fetching role member count:", countError)
            return { ...role, member_count: 0 }
          }

          return { ...role, member_count: count || 0 }
        }),
      )

      setRoles(rolesWithCounts)
    } catch (error) {
      console.error("Error fetching roles:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateRole = () => {
    setIsCreatingRole(true)
    setIsEditingRole(true)
    setNewRoleName("")
    setRoleColor("#99AAB5")
    setGradientColor(null)
    setDisplaySeparately(false)
    setSelectedRole(null)
    setActiveTab("display")
  }

  const handleEditRole = (role: Role) => {
    setIsCreatingRole(false)
    setIsEditingRole(true)
    setSelectedRole(role)
    setNewRoleName(role.name)
    setRoleColor(role.color)
    setGradientColor(role.gradient_color || null)
    setDisplaySeparately(role.display_separately)
    setActiveTab("display")
  }

  const handleSaveRole = async () => {
    setIsSaving(true)
    try {
      if (isCreatingRole) {
        // Create new role
        const { data, error } = await supabase
          .from("server_roles")
          .insert({
            server_id: serverId,
            name: newRoleName || "New Role",
            color: roleColor,
            gradient_color: gradientColor,
            position: roles.length,
            display_separately: displaySeparately,
          })
          .select()
          .single()

        if (error) throw error

        // Update local state without refetching
        const newRole = { ...data, member_count: 0 }
        setRoles((prev) => [...prev, newRole])
        setSelectedRole(newRole)
        setIsCreatingRole(false)
      } else if (selectedRole) {
        // Update existing role
        const { error } = await supabase
          .from("server_roles")
          .update({
            name: newRoleName,
            color: roleColor,
            gradient_color: gradientColor,
            display_separately: displaySeparately,
          })
          .eq("id", selectedRole.id)

        if (error) throw error

        // Update local state without refetching
        const updatedRole = {
          ...selectedRole,
          name: newRoleName,
          color: roleColor,
          gradient_color: gradientColor,
          display_separately: displaySeparately,
        }

        setRoles((prev) => prev.map((role) => (role.id === selectedRole.id ? updatedRole : role)))
        setSelectedRole(updatedRole)
      }

      // Reset change tracking
      setHasUnsavedChanges(false)
      setInitialRoleName(newRoleName)
      setInitialRoleColor(roleColor)
      setInitialGradientColor(gradientColor)
      setInitialDisplaySeparately(displaySeparately)
    } catch (error) {
      console.error("Error saving role:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteRole = async (roleId: number) => {
    if (confirm("Are you sure you want to delete this role?")) {
      try {
        const { error } = await supabase.from("server_roles").delete().eq("id", roleId)

        if (error) throw error

        // Update local state without refetching
        setRoles((prev) => prev.filter((role) => role.id !== roleId))

        // If we're currently editing this role, exit edit mode
        if (selectedRole?.id === roleId) {
          setIsEditingRole(false)
          setSelectedRole(null)
        }
      } catch (error) {
        console.error("Error deleting role:", error)
      }
    }
  }

  const handleBack = () => {
    if (isCreatingRole || selectedRole) {
      // If we're creating a new role or editing an existing one, save changes
      handleSaveRole()
    }
    setIsEditingRole(false)
    setIsCreatingRole(false)
    setSelectedRole(null)
  }

  // Filter roles based on search query
  const filteredRoles = roles.filter((role) => role.name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <SimpleLoadingSpinner />
      </div>
    )
  }

  const getRoleStyle = (role: Role) => {
    if (role.gradient_color) {
      return {
        background: `linear-gradient(135deg, ${role.color} 0%, ${role.gradient_color} 100%)`,
      }
    }
    return {
      backgroundColor: role.color,
    }
  }

  const CompactColorPicker = ({
    selectedColor,
    onColorChange,
    showCustomPicker = true,
  }: {
    selectedColor: string | null
    onColorChange: (color: string) => void
    showCustomPicker?: boolean
  }) => {
    // Предполагаем, что высота области предварительного просмотра CustomColorPicker составляет около 52 пикселей.
    // Два ряда образцов h-6 (24 пикселя) + зазор-1 (4 пикселя) = 24 + 4 + 24 = 52 пикселя.
    return (
      <div className="flex items-start gap-2">
        {" "}
        {/* Выравнивание кастомного пикера и сетки пресетов, добавлен горизонтальный отступ */}
        {showCustomPicker && (
          // CustomColorPicker теперь без масштабирования и с отображением HEX
          <CustomColorPicker color={selectedColor || "#99AAB5"} onChange={onColorChange} label="" showHex={true} />
        )}
        <div className="flex flex-col gap-1">
          {" "}
          {/* Вертикальный отступ между рядами пресетов */}
          {PRESET_COLORS.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {" "}
              {/* Горизонтальный отступ между пресетами в ряду */}
              {row.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className="w-6 h-6 rounded relative flex items-center justify-center" // Скорректированный размер кубиков
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check className="w-4 h-4 text-white" />}{" "}
                  {/* Галочка чуть больше для лучшей видимости */}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const ColorSection = ({
    title,
    selectedColor,
    onColorChange,
    showRemove = false,
    onRemove,
  }: {
    title: string
    selectedColor: string | null
    onColorChange: (color: string) => void
    showRemove?: boolean
    onRemove?: () => void
  }) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-[#B9BBBE] uppercase">{title}</label>

      {selectedColor ? (
        <CompactColorPicker selectedColor={selectedColor} onColorChange={onColorChange} />
      ) : (
        <div
          className="flex items-center justify-center h-10 border-2 border-dashed border-[#3f4147] rounded-md cursor-pointer hover:border-[#5a5d63] transition-colors"
          onClick={() => onColorChange("#7289DA")}
        >
          <span className="text-[#B9BBBE] text-sm">Not set</span>
        </div>
      )}

      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="text-[#B9BBBE] hover:text-white text-sm flex items-center gap-1 transition-colors mt-1"
        >
          <X className="w-3 h-3" />
          Remove secondary color
        </button>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {!isEditingRole ? (
        <>
          {/* Role search and create */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#949BA4]" />
              <Input
                placeholder="Search roles"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#1E1F22] border-none text-white placeholder-[#949BA4]"
              />
            </div>
            <Button onClick={handleCreateRole} className="bg-[#5865F2] hover:bg-[#4752C4] text-white">
              Create role
            </Button>
          </div>

          {/* Roles list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[#B9BBBE] text-xs font-semibold uppercase">ROLES — {roles.length}</h3>
            </div>

            <div className="space-y-1">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 rounded-md hover:bg-[#2E3035] group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={getRoleStyle(role)}></div>
                    <span className="text-white">{role.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#B9BBBE] text-sm">{role.member_count} 👤</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:bg-[#1E1F22]"
                        >
                          <MoreHorizontal className="h-4 w-4 text-[#B9BBBE]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-[#1E1F22] border-none text-[#B9BBBE]">
                        <DropdownMenuItem
                          className="flex items-center gap-2 focus:bg-[#5865F2] focus:text-white cursor-pointer"
                          onClick={() => handleEditRole(role)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span>Edit Role</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="flex items-center gap-2 focus:bg-[#ED4245] focus:text-white text-[#ED4245] cursor-pointer"
                          onClick={() => handleDeleteRole(role.id)}
                        >
                          <span>Delete Role</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}

              {filteredRoles.length === 0 && (
                <div className="text-center py-4 text-[#949BA4] text-sm">
                  {searchQuery ? "No roles found" : "No roles in this server"}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Role editing interface */}
          <div className="flex h-full">
            {/* Left sidebar with roles */}
            <div className="w-60 pr-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="text-[#B9BBBE] hover:text-white hover:bg-transparent p-1 flex items-center gap-1"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span>Back</span>
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCreateRole}
                  className="text-[#B9BBBE] hover:text-white hover:bg-[#2E3035]"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-1">
                {roles.map((role) => (
                  <div
                    key={role.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer ${
                      selectedRole?.id === role.id ? "bg-[#36373d]" : "hover:bg-[#2E3035]"
                    }`}
                    onClick={() => handleEditRole(role)}
                  >
                    <div className="w-3 h-3 rounded-full" style={getRoleStyle(role)}></div>
                    <span className="text-white">{role.name}</span>
                  </div>
                ))}
                {isCreatingRole && (
                  <div className="flex items-center gap-3 p-2 rounded-md bg-[#36373d]">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={getRoleStyle({
                        id: 0,
                        name: newRoleName || "New Role",
                        color: roleColor,
                        gradient_color: gradientColor,
                        position: 0,
                        display_separately: false,
                      })}
                    ></div>
                    <span className="text-white">{newRoleName || "New Role"}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical separator */}
            <div className="w-px bg-[#3f4147] mx-4"></div>

            {/* Right content area */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-white text-lg font-semibold">
                  EDIT ROLE — {isCreatingRole ? "NEW ROLE" : selectedRole?.name}
                </h2>
              </div>

              {/* Custom tabs */}
              <div className="mb-6">
                <div className="flex gap-8 border-b border-[#3f4147]/30">
                  <button
                    onClick={() => setActiveTab("display")}
                    className={`relative pb-3 text-sm font-medium transition-colors group ${
                      activeTab === "display" ? "text-[#7289DA]" : "text-[#B9BBBE] hover:text-white"
                    }`}
                  >
                    Display Elements
                    {activeTab === "display" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7289DA]"></div>
                    )}
                    {activeTab !== "display" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7289DA] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("members")}
                    className={`relative pb-3 text-sm font-medium transition-colors group ${
                      activeTab === "members" ? "text-[#7289DA]" : "text-[#B9BBBE] hover:text-white"
                    }`}
                  >
                    Members
                    {activeTab === "members" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7289DA]"></div>
                    )}
                    {activeTab !== "members" && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7289DA] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                  </button>
                </div>
              </div>

              {/* Tab content */}
              {activeTab === "display" && (
                <div className="space-y-4">
                  {/* Role name section */}
                  <div className="space-y-2">
                    <label htmlFor="roleName" className="block text-xs font-semibold text-[#B9BBBE] uppercase">
                      Role Name
                    </label>
                    <Input
                      id="roleName"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      placeholder="New Role"
                      className="bg-[#1e1f22] border-none text-white focus:ring-1 focus:ring-[#7289DA]"
                    />
                  </div>

                  <div className="border-t border-[#3f4147]"></div>

                  {/* Role color section */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#B9BBBE] uppercase mb-2">Role Color</label>
                      <p className="text-[#B9BBBE] text-sm">
                        For members, the color of the highest role they have is used.
                      </p>
                    </div>

                    {/* Primary color */}
                    <ColorSection title="Primary Color" selectedColor={roleColor} onColorChange={setRoleColor} />

                    {/* Secondary color */}
                    <ColorSection
                      title="Secondary Color"
                      selectedColor={gradientColor}
                      onColorChange={setGradientColor}
                      showRemove={gradientColor !== null}
                      onRemove={() => setGradientColor(null)}
                    />
                  </div>

                  <div className="border-t border-[#3f4147] my-4"></div>

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-medium">Display role members separately</h3>
                      <p className="text-[#B9BBBE] text-sm">
                        Show members with this role separately from other members in the server
                      </p>
                    </div>
                    <Switch checked={displaySeparately} onCheckedChange={setDisplaySeparately} />
                  </div>

                  {/* Save button */}
                  <div className="pt-4">
                    <Button
                      onClick={handleSaveRole}
                      className="bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-xl px-6 flex items-center gap-2"
                      disabled={!hasUnsavedChanges || isSaving}
                    >
                      {isSaving && <SimpleLoadingSpinner />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "members" && (
                <div className="space-y-6">
                  <RoleMembersTab serverId={serverId} roleId={selectedRole?.id} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
