"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence, LayoutGroup } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { validateInviteCode, createAccount } from "./actions"
import en from "@/locales/en.json"
import ru from "@/locales/ru.json"
import uk from "@/locales/uk.json"
import { toast } from "@/components/ui/use-toast"

const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 20
const MIN_NICKNAME_LENGTH = 2
const MAX_NICKNAME_LENGTH = 30
const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5 MB

type Locale = "en" | "ru" | "uk"

type FieldErrors = {
  inviteCode?: string
  email?: string
  password?: string
  nickname?: string
  username?: string
  avatar?: string
}

type SavedAccount = {
  id: string
  email: string
  profile: {
    username: string
    display_name: string
    avatar_url: string | null
  }
  refreshToken: string
}

// const cardStyles = css`
//   transition: all 0.3s ease-in-out;
// `

export default function CougeLogin() {
  const [step, setStep] = useState<"invite" | "setup" | "login">("invite")
  const [inviteCode, setInviteCode] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nickname, setNickname] = useState("")
  const [username, setUsername] = useState("")
  const [avatar, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [session, setSession] = useState(false)
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>("en")
  const t = locale === "ru" ? ru : locale === "uk" ? uk : en
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const detectLanguage = () => {
      const userLanguage = navigator.language.split("-")[0]
      if (userLanguage === "ru") {
        setLocale("ru")
      } else if (userLanguage === "uk") {
        setLocale("uk")
      } else {
        setLocale("en")
      }
    }

    detectLanguage()
  }, [])

  useEffect(() => {
    const checkSupabaseStatus = async () => {
      try {
        const { data, error } = await supabase.from("invite_codes").select("count").single()
        if (error) throw error
        console.log("Supabase connection in client component successful")
      } catch (error) {
        console.error("Error connecting to Supabase in client component:", error)
      }
    }

    checkSupabaseStatus()
  }, [supabase])

  useEffect(() => {
    const loadSavedAccounts = () => {
      const accounts = localStorage.getItem("accounts")
      if (accounts) {
        setSavedAccounts(JSON.parse(accounts))
      }
    }
    loadSavedAccounts()
  }, [])

  const resetFields = () => {
    setInviteCode("")
    setEmail("")
    setPassword("")
    setNickname("")
    setUsername("")
    setAvatarPreview(null)
    setAvatarFile(null)
    setFieldErrors({})
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setIsLoading(true)

    try {
      const result = await validateInviteCode(inviteCode)
      if (result.valid) {
        setEmail(result.email)
        setStep("setup")
      } else {
        setFieldErrors({ inviteCode: t[result.error as keyof typeof t] || result.error })
      }
    } catch (error) {
      setFieldErrors({ inviteCode: t.errorCheckingCode })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setIsLoading(true)

    const errors: FieldErrors = {}

    if (nickname.length < MIN_NICKNAME_LENGTH || nickname.length > MAX_NICKNAME_LENGTH) {
      errors.nickname = `${t.nickname} ${t.mustBeBetween} ${MIN_NICKNAME_LENGTH} ${t.and} ${MAX_NICKNAME_LENGTH} ${t.characters}`
    }

    if (username.length < MIN_USERNAME_LENGTH || username.length > MAX_USERNAME_LENGTH) {
      errors.username = `${t.username} ${t.mustBeBetween} ${MIN_USERNAME_LENGTH} ${t.and} ${MAX_USERNAME_LENGTH} ${t.characters}`
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setIsLoading(false)
      return
    }

    try {
      console.log("Submitting account creation form")
      let avatarUrl = null
      if (avatarFile) {
        // Создаем безопасное имя файла без пробелов и специальных символов
        const safeFileName = `${Date.now()}_${avatarFile.name.replace(/[^a-zA-Z0-9.]/g, "_")}`

        const { data, error } = await supabase.storage.from("avatars").upload(safeFileName, avatarFile)

        if (error) {
          console.error("Avatar upload error:", error)
          // Продолжаем без аватара, если загрузка не удалась
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("avatars").getPublicUrl(data.path)

          avatarUrl = publicUrl
        }
      }

      const result = await createAccount(inviteCode, email, password, username, nickname, avatarUrl)
      console.log("Account creation result:", result)
      if (result.success) {
        resetFields()
        setStep("login")
      } else {
        setFieldErrors({ [result.field || "username"]: t[result.error as keyof typeof t] || result.error })
      }
    } catch (error) {
      console.error("Error in handleSetupSubmit:", error)
      setFieldErrors({ username: t.unexpectedError })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      setSession(true)
      resetFields()

      // Force a page reload after successful login
      window.location.reload()
    } catch (error) {
      setFieldErrors({ email: t.invalidCredentials, password: t.invalidCredentials })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > MAX_AVATAR_SIZE) {
        setFieldErrors({ avatar: `${t.fileSizeShouldNotExceed} ${MAX_AVATAR_SIZE / 1024 / 1024} MB` })
        return
      }
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const fadeInOut = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  }

  const handleQuickLogin = async (account: SavedAccount) => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: account.refreshToken,
      })

      if (error) throw error

      if (data.session) {
        await supabase.auth.setSession(data.session)
        setSession(true)
        // Перезагрузка страницы после успешного входа
        window.location.reload()
      }
    } catch (error) {
      console.error("Error during quick login:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось войти в аккаунт. Пожалуйста, войдите снова.",
        variant: "destructive",
      })
      // Удаляем недействительный аккаунт из сохраненных
      const updatedAccounts = savedAccounts.filter((acc) => acc.id !== account.id)
      setSavedAccounts(updatedAccounts)
      localStorage.setItem("accounts", JSON.stringify(updatedAccounts))
    } finally {
      setIsLoading(false)
    }
  }

  if (session) {
    return null
  }

  return (
    <div className="min-h-screen bg-black relative flex items-center justify-center p-4 dark">
      {/* Grid Background */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(50, 50, 50) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(50, 50, 50) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* Glow Effect */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-zinc-700/20 blur-[120px] rounded-full" />

      <LayoutGroup>
        <motion.div layout className="relative w-full max-w-md">
          <Card className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800 rounded-3xl overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="space-y-1">
                  <motion.div layout className="flex justify-center mb-6">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Frame%2077-Photoroom-Dl8eefxciIEKOnEYnfWuUYneMH45Xl.png"
                      alt="Couge Logo"
                      width={80}
                      height={80}
                      className="dark:invert-0"
                    />
                  </motion.div>
                  <motion.div layout>
                    <CardTitle className="text-2xl font-bold text-center text-white">
                      {step === "invite" && t.welcomeMessage}
                      {step === "setup" && t.setupAccount}
                      {step === "login" && t.loginToAccount}
                    </CardTitle>
                  </motion.div>
                </CardHeader>
                <CardContent>
                  <AnimatePresence mode="wait">
                    {step === "invite" && (
                      <motion.form
                        key="invite"
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleInviteSubmit}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor="inviteCode"
                            className={`text-zinc-400 ${fieldErrors.inviteCode ? "text-red-500" : ""}`}
                          >
                            {t.inviteCode}{" "}
                            {fieldErrors.inviteCode && (
                              <span className="text-red-500 text-sm">- {fieldErrors.inviteCode}</span>
                            )}
                          </Label>
                          <Input
                            id="inviteCode"
                            type="text"
                            value={inviteCode}
                            onChange={(e) => {
                              setInviteCode(e.target.value)
                              if (fieldErrors.inviteCode) setFieldErrors({ ...fieldErrors, inviteCode: undefined })
                            }}
                            required
                            className={`bg-zinc-800/50 border-zinc-800 rounded-xl ${
                              fieldErrors.inviteCode ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        <Button
                          type="submit"
                          className={`w-full bg-gradient-to-r rounded-xl transition-all duration-200 ${
                            isLoading
                              ? "from-zinc-600/50 to-zinc-500/50 cursor-not-allowed"
                              : "from-zinc-600/80 to-zinc-500/80 hover:from-zinc-500/70 hover:to-zinc-400/70 active:from-zinc-500/60 active:to-zinc-400/60"
                          }`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            t.continue
                          )}
                        </Button>
                      </motion.form>
                    )}
                    {step === "setup" && (
                      <motion.form
                        key="setup"
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleSetupSubmit}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-zinc-400">
                            {t.email}
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            disabled
                            className="bg-zinc-800/50 border-zinc-800 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="password"
                            className={`text-zinc-400 ${fieldErrors.password ? "text-red-500" : ""}`}
                          >
                            {t.password}{" "}
                            {fieldErrors.password && (
                              <span className="text-red-500 text-sm">- {fieldErrors.password}</span>
                            )}
                          </Label>
                          <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined })
                            }}
                            required
                            className={`bg-zinc-800/50 border-zinc-800 rounded-xl ${
                              fieldErrors.password ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="nickname"
                            className={`text-zinc-400 ${fieldErrors.nickname ? "text-red-500" : ""}`}
                          >
                            {t.nickname}{" "}
                            {fieldErrors.nickname && (
                              <span className="text-red-500 text-sm">- {fieldErrors.nickname}</span>
                            )}
                          </Label>
                          <Input
                            id="nickname"
                            type="text"
                            value={nickname}
                            onChange={(e) => {
                              setNickname(e.target.value)
                              if (fieldErrors.nickname) setFieldErrors({ ...fieldErrors, nickname: undefined })
                            }}
                            required
                            minLength={MIN_NICKNAME_LENGTH}
                            maxLength={MAX_NICKNAME_LENGTH}
                            className={`bg-zinc-800/50 border-zinc-800 rounded-xl ${
                              fieldErrors.nickname ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="username"
                            className={`text-zinc-400 ${fieldErrors.username ? "text-red-500" : ""}`}
                          >
                            {t.username}{" "}
                            {fieldErrors.username && (
                              <span className="text-red-500 text-sm">- {fieldErrors.username}</span>
                            )}
                          </Label>
                          <div className="relative">
                            <Input
                              id="username"
                              type="text"
                              value={username}
                              onChange={(e) => {
                                setUsername(e.target.value)
                                if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined })
                              }}
                              required
                              minLength={MIN_USERNAME_LENGTH}
                              maxLength={MAX_USERNAME_LENGTH}
                              className={`bg-zinc-800/50 border-zinc-800 rounded-xl pl-7 ${
                                fieldErrors.username ? "border-red-500" : ""
                              }`}
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">@</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="avatar"
                            className={`text-zinc-400 ${fieldErrors.avatar ? "text-red-500" : ""}`}
                          >
                            {t.avatar}{" "}
                            {fieldErrors.avatar && <span className="text-red-500 text-sm">- {fieldErrors.avatar}</span>}
                          </Label>
                          <Input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className={`bg-zinc-800/50 border-zinc-800 rounded-xl ${
                              fieldErrors.avatar ? "border-red-500" : ""
                            }`}
                          />
                          {avatar && (
                            <Avatar className="w-20 h-20 mx-auto mt-2 rounded-2xl">
                              <AvatarImage src={avatar} alt="User Avatar" />
                              <AvatarFallback className="bg-gradient-to-r from-zinc-600 to-zinc-500">
                                {nickname.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <Button
                          type="submit"
                          className={`w-full bg-gradient-to-r rounded-xl transition-all duration-200 ${
                            isLoading
                              ? "from-zinc-600/50 to-zinc-500/50 cursor-not-allowed"
                              : "from-zinc-600/80 to-zinc-500/80 hover:from-zinc-500/70 hover:to-zinc-400/70 active:from-zinc-500/60 active:to-zinc-400/60"
                          }`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            t.createAccount
                          )}
                        </Button>
                      </motion.form>
                    )}
                    {step === "login" && (
                      <motion.form
                        key="login"
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        onSubmit={handleLoginSubmit}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label
                            htmlFor="loginEmail"
                            className={`text-zinc-400 ${fieldErrors.email ? "text-red-500" : ""}`}
                          >
                            {t.email}{" "}
                            {fieldErrors.email && <span className="text-red-500 text-sm">- {fieldErrors.email}</span>}
                          </Label>
                          <Input
                            id="loginEmail"
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value)
                              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined })
                            }}
                            required
                            className={`bg-zinc-800/50 border-zinc-800 rounded-xl ${
                              fieldErrors.email ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="loginPassword"
                            className={`text-zinc-400 ${fieldErrors.password ? "text-red-500" : ""}`}
                          >
                            {t.password}{" "}
                            {fieldErrors.password && (
                              <span className="text-red-500 text-sm">- {fieldErrors.password}</span>
                            )}
                          </Label>
                          <Input
                            id="loginPassword"
                            type="password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value)
                              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined })
                            }}
                            required
                            className={`bg-zinc-800/50 border-zinc-800 rounded-xl ${
                              fieldErrors.password ? "border-red-500" : ""
                            }`}
                          />
                        </div>
                        <Button
                          type="submit"
                          className={`w-full bg-gradient-to-r rounded-xl transition-all duration-200 ${
                            isLoading
                              ? "from-zinc-600/50 to-zinc-500/50 cursor-not-allowed"
                              : "from-zinc-600/80 to-zinc-500/80 hover:from-zinc-500/70 hover:to-zinc-400/70 active:from-zinc-500/60 active:to-zinc-400/60"
                          }`}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="w-6 h-6 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            t.logIn
                          )}
                        </Button>

                        {savedAccounts.length > 0 && (
                          <>
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-[#3f4147]" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-[#18191c] px-2 text-[#949ba4]">{t.or}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {savedAccounts.map((account) => (
                                <Button
                                  key={account.id}
                                  type="button"
                                  variant="outline"
                                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl"
                                  onClick={() => handleQuickLogin(account)}
                                >
                                  <span className="flex items-center gap-2">
                                    {t.loginAs}
                                    <Avatar className="w-6 h-6 inline-flex">
                                      <AvatarImage src={account.profile.avatar_url || undefined} />
                                      <AvatarFallback>{account.profile.display_name[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {account.profile.display_name}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          </>
                        )}
                      </motion.form>
                    )}
                  </AnimatePresence>
                </CardContent>
                <CardFooter>
                  <motion.div layout className="w-full">
                    {step !== "setup" && (
                      <Button
                        variant="link"
                        className="w-full text-zinc-400 hover:text-zinc-300"
                        onClick={() => {
                          resetFields()
                          setStep(step === "invite" ? "login" : "invite")
                        }}
                      >
                        {step === "invite" ? t.alreadyHaveAccount : t.enterInviteCode}
                      </Button>
                    )}
                  </motion.div>
                </CardFooter>
              </motion.div>
            </AnimatePresence>
          </Card>
        </motion.div>
      </LayoutGroup>
    </div>
  )
}
