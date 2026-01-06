"use client"

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import UserSettings from "./UserSettings"
import AddAccountModal from "./AddAccountModal"
import { toast } from "@/components/ui/use-toast"

interface UserProfile {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

interface Account {
  id: string
  email: string
  profile: UserProfile
  refreshToken: string
}

interface UserMenuProps {
  user: {
    id: string
    email?: string
  } | null
  onSignOut: () => void
  onUpdateProfile: () => void
}

export default function UserMenu({ user, onSignOut, onUpdateProfile }: UserMenuProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false)
  const [accounts, setAccounts] = useState<Account[]>([])
  const supabase = createClient()
  const [switchingAccountId, setSwitchingAccountId] = useState<string | null>(null)
  const [isFullScreenLoading, setIsFullScreenLoading] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", user.id)
          .single()

        if (!error && data) {
          setProfile(data)
          updateAccounts(data, user.email || "")
        }
      }
    }

    fetchProfile()
    loadAccounts()

    const profileSubscription = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user?.id}` },
        fetchProfile,
      )
      .subscribe()

    return () => {
      profileSubscription.unsubscribe()
    }
  }, [user, supabase])

  const updateAccounts = (profileData: UserProfile, email: string) => {
    setAccounts((prevAccounts) => {
      const currentAccount = {
        id: profileData.id,
        email: email,
        profile: profileData,
        refreshToken: "",
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.refresh_token) {
          currentAccount.refreshToken = session.refresh_token
          const updatedAccounts = prevAccounts.map((acc) => (acc.id === currentAccount.id ? currentAccount : acc))
          if (!updatedAccounts.some((acc) => acc.id === currentAccount.id)) {
            updatedAccounts.push(currentAccount)
          }
          localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
          setAccounts(updatedAccounts)
        }
      })

      return prevAccounts
    })
  }

  const loadAccounts = () => {
    const savedAccounts = localStorage.getItem("accounts")
    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts))
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session) {
        setAccounts((prevAccounts) => {
          const updatedAccounts = prevAccounts.map((account) =>
            account.id === session.user.id
              ? { ...account, refreshToken: session.refresh_token || account.refreshToken }
              : account,
          )
          localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
          return updatedAccounts
        })
      } else if (event === "SIGNED_OUT") {
        // Remove the signed out account from the accounts list
        setAccounts((prevAccounts) => {
          const updatedAccounts = prevAccounts.filter((account) => account.id !== session?.user?.id)
          localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
          return updatedAccounts
        })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase.auth])

  const handleAccountSwitch = async (accountId: string) => {
    if (accountId === user?.id) {
      return
    }

    const accountToSwitch = accounts.find((account) => account.id === accountId)
    if (accountToSwitch) {
      try {
        setSwitchingAccountId(accountId)
        setIsFullScreenLoading(true)

        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: accountToSwitch.refreshToken,
        })

        if (error) {
          if (error.message.includes("Refresh Token Not Found")) {
            // Remove the invalid account from the list
            setAccounts((prevAccounts) => {
              const updatedAccounts = prevAccounts.filter((acc) => acc.id !== accountId)
              localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
              return updatedAccounts
            })
            throw new Error("Недействительный аккаунт. Пожалуйста, войдите заново.")
          }
          throw error
        }

        if (data.session) {
          await supabase.auth.setSession(data.session)
          setTimeout(() => {
            window.location.reload()
          }, 500)
        }
      } catch (error) {
        console.error("Error switching account:", error)
        toast({
          title: "Ошибка",
          description:
            error instanceof Error ? error.message : "Не удалось переключить аккаунт. Попробуйте войти заново.",
          variant: "destructive",
        })
      } finally {
        setSwitchingAccountId(null)
        setIsFullScreenLoading(false)
      }
    }
  }

  const handleAccountLogout = async (accountId: string) => {
    try {
      // Выход из текущей сессии Supabase
      await supabase.auth.signOut()

      // Удаление данных аккаунта из локального хранилища
      const updatedAccounts = accounts.filter((account) => account.id !== accountId)
      localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
      setAccounts(updatedAccounts)

      // Если это был текущий пользователь, перезагрузите страницу
      if (accountId === user?.id) {
        window.location.reload()
      } else {
        // Иначе, просто обновите состояние компонента
        toast({
          title: "Выход выполнен",
          description: "Вы успешно вышли из аккаунта.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error("Error logging out account:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось выйти из аккаунта. Пожалуйста, попробуйте еще раз.",
        variant: "destructive",
      })
    }
  }

  const handleAddAccount = (newAccount: Account) => {
    const updatedAccounts = [...accounts, newAccount]
    setAccounts(updatedAccounts)
    localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
    setIsAddAccountModalOpen(false)
  }

  if (!profile) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-12 h-12">
            <Avatar className="w-full h-full">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback>{profile.display_name[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[220px] bg-[#18191c] text-[#dcddde] border-none p-0 rounded-lg"
          align="start"
          sideOffset={8}
        >
          {/* User Info */}
          <div className="p-2 border-b border-[#2b2d31]">
            <div className="flex items-center gap-2 px-2 py-1">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback>{profile.display_name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="font-medium text-white text-sm truncate">{profile.display_name}</span>
                <span className="text-xs text-[#B9BBBE] truncate">@{profile.username}</span>
              </div>
            </div>
          </div>

          <div className="p-2 space-y-0.5">
            <DropdownMenuItem
              className="px-2 py-1.5 text-sm cursor-pointer rounded-md hover:bg-[#2b2d31] focus:bg-[#2b2d31] text-[#949ba4] hover:text-[#dcddde]"
              onClick={() => setIsSettingsOpen(true)}
            >
              Settings
            </DropdownMenuItem>
            {/* Закомментированная кнопка "Сменить учётную запись" */}
            {/*
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="px-2 py-1.5 text-sm cursor-pointer rounded-md hover:bg-[#2b2d31] focus:bg-[#2b2d31] text-[#949ba4] hover:text-[#dcddde]">
                Сменить учётную запись
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="bg-[#18191c] text-[#dcddde] border-none rounded-lg" sideOffset={12}>
                  {accounts.map((account) => (
                    <DropdownMenuItem key={account.id} className="px-2 py-2 text-sm hover:bg-[#2b2d31]">
                      <div className="w-full">
                        <div
                          onClick={() => handleAccountSwitch(account.id)}
                          className="flex items-center gap-2 group hover:bg-[#5865F2] rounded cursor-pointer w-full px-2 py-1"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={account.profile.avatar_url || undefined} />
                            <AvatarFallback>{account.profile.display_name[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-[#dcddde] group-hover:text-white">{account.profile.display_name}</span>
                          {account.id === user?.id && (
                            <div className="ml-auto">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 128 128"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="fill-[#5865F2] group-hover:fill-white"
                              >
                                <path
                                  fillRule="evenodd"
                                  clipRule="evenodd"
                                  d="M64.0013 10.667C93.4572 10.667 117.335 34.5444 117.335 64.0003C117.335 93.4563 93.4572 117.334 64.0013 117.334C34.5454 117.334 10.668 93.4563 10.668 64.0003C10.668 34.5444 34.5454 10.667 64.0013 10.667ZM54.3711 80.6061C56.3237 82.5587 59.4896 82.5588 61.4422 80.6061L89.1066 52.9417C91.192 50.8617 91.192 47.4857 89.1066 45.4003C87.0213 43.3203 83.6506 43.3203 81.5653 45.4003L57.9066 69.059L46.44 57.5923C44.3546 55.507 40.984 55.507 38.8986 57.5923C36.8133 59.6777 36.8133 63.0483 38.8986 65.1337L54.3711 80.6061Z"
                                />
                              </svg>
                            </div>
                          )}
                          {switchingAccountId === account.id && (
                            <div className="ml-auto">
                              <div className="w-4 h-4 border-2 border-t-transparent border-[#dcddde] rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                      </div>
                      {account.id !== user?.id && !switchingAccountId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="ml-auto">
                            <MoreHorizontal className="w-4 h-4 text-[#949ba4] hover:text-[#dcddde]" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-[#18191c] text-[#dcddde] border-none rounded-lg">
                            <DropdownMenuItem
                              onClick={() => handleAccountLogout(account.id)}
                              className="text-[#ed4245] hover:bg-[#2b2d31]"
                            >
                              Выход
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-[#2b2d31]" />
                  <DropdownMenuItem
                    onClick={() => setIsAddAccountModalOpen(true)}
                    className="px-2 py-1.5 text-sm text-[#949ba4] hover:text-[#dcddde] hover:bg-[#2b2d31]"
                  >
                    Добавить аккаунт
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            */}
            <DropdownMenuItem
              className="px-2 py-1.5 text-sm cursor-pointer rounded-md hover:bg-[#2b2d31] focus:bg-[#2b2d31] text-[#ed4245]"
              onClick={() => handleAccountLogout(user?.id || "")}
            >
              Log out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {isSettingsOpen && (
        <UserSettings
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false)
          }}
        />
      )}

      {isAddAccountModalOpen && (
        <AddAccountModal
          isOpen={isAddAccountModalOpen}
          onClose={() => setIsAddAccountModalOpen(false)}
          onAddAccount={handleAddAccount}
          supabase={supabase}
        />
      )}
      {isFullScreenLoading && (
        <div className="fixed inset-0 bg-[#18191c] z-50 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-transparent border-[#5865F2] rounded-full animate-spin"></div>
        </div>
      )}
    </>
  )
}
