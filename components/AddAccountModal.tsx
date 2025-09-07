"use client"

import type React from "react"

import { useState, useEffect } from "react"
import type { SupabaseClient } from "@supabase/supabase-js"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

interface Account {
  id: string
  email: string
  profile: { username: string; display_name: string; avatar_url: string | null }
  refreshToken: string
}

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onAddAccount: (account: Account) => void
  supabase: SupabaseClient
}

export default function AddAccountModal({ isOpen, onClose, onAddAccount, supabase }: AddAccountModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [existingAccounts, setExistingAccounts] = useState<Account[]>([])

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setCurrentSession(session)
    }
    getSession()

    // Загрузка существующих аккаунтов из localStorage
    const savedAccounts = localStorage.getItem("accounts")
    if (savedAccounts) {
      setExistingAccounts(JSON.parse(savedAccounts))
    }
  }, [supabase])

  const resetErrors = () => {
    setEmailError("")
    setPasswordError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetErrors()
    setIsLoading(true)

    try {
      // Проверяем, не является ли это текущим пользователем или уже добавленным аккаунтом
      if (currentSession?.user?.email === email) {
        setEmailError("Этот аккаунт уже используется в текущей сессии")
        return
      }

      if (existingAccounts.some((account) => account.email === email)) {
        setEmailError("Этот аккаунт уже добавлен")
        return
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setPasswordError("Неверный email или пароль")
        } else if (error.message.includes("Email not confirmed")) {
          setEmailError("Email не подтвержден")
        } else {
          setEmailError("Произошла ошибка при входе")
        }
        return
      }

      if (data.user && data.session) {
        // Получаем данные профиля
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("username, display_name, avatar_url")
          .eq("id", data.user.id)
          .single()

        if (profileError) {
          setEmailError("Ошибка при получении данных профиля")
          return
        }

        const newAccount: Account = {
          id: data.user.id,
          email: data.user.email!,
          profile: {
            username: profileData.username,
            display_name: profileData.display_name,
            avatar_url: profileData.avatar_url,
          },
          refreshToken: data.session.refresh_token,
        }

        // Добавляем новый аккаунт
        onAddAccount(newAccount)

        // Обновляем список существующих аккаунтов
        const updatedAccounts = [...existingAccounts, newAccount]
        setExistingAccounts(updatedAccounts)
        localStorage.setItem("accounts", JSON.stringify(updatedAccounts))

        // Восстанавливаем предыдущую сессию
        if (currentSession) {
          await supabase.auth.setSession(currentSession)
        }

        // Показываем уведомление об успехе
        toast({
          title: "Аккаунт добавлен",
          description: "Новый аккаунт успешно добавлен",
        })

        // Очищаем форму и закрываем модальное окно
        setEmail("")
        setPassword("")
        onClose()
      }
    } catch (error) {
      console.error("Error adding account:", error)
      setEmailError("Произошла неожиданная ошибка")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900/70 backdrop-blur-xl border-zinc-800 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center text-zinc-100">Добавить учётную запись</DialogTitle>
          <p className="text-sm text-center text-zinc-400 mt-2">
            Войдите в другую учётную запись, чтобы с лёгкостью переключаться между учётными записями на этом устройстве.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-zinc-400">
              Электронная почта
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                resetErrors()
              }}
              required
              className={`bg-zinc-800/50 border-zinc-800 text-zinc-100 ${emailError ? "border-red-500" : ""}`}
            />
            {emailError && <p className="text-sm text-red-500">{emailError}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-zinc-400">
              Пароль
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                resetErrors()
              }}
              required
              className={`bg-zinc-800/50 border-zinc-800 text-zinc-100 ${passwordError ? "border-red-500" : ""}`}
            />
            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
          </div>
          <Button
            type="submit"
            className={`w-full ${
              isLoading ? "bg-zinc-700 cursor-not-allowed" : "bg-zinc-600 hover:bg-zinc-500 active:bg-zinc-400"
            } text-white transition-colors`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              "Продолжить"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
