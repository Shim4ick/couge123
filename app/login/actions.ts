"use server"

import { createClient } from "@supabase/supabase-js"
import { getRandomDefaultAvatar } from "@/utils/defaultAvatars"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[v0] Missing Supabase environment variables")
  throw new Error("Missing environment variables for Supabase")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function validateInviteCode(code: string) {
  try {
    console.log("[v0] Validating invite code:", code)
    const { data, error } = await supabaseAdmin
      .from("invite_codes")
      .select("email, used_by")
      .eq("code", code)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error querying invite code:", error)
      throw error
    }

    if (!data) {
      return {
        valid: false,
        error: "Неверный код приглашения",
      }
    }

    if (data.used_by) {
      return {
        valid: false,
        error: "Этот код уже был использован",
      }
    }

    return {
      valid: true,
      email: data.email,
    }
  } catch (error) {
    console.error("[v0] Error validating invite code:", error)
    return {
      valid: false,
      error: "Произошла ошибка при проверке кода",
    }
  }
}

export async function createAccount(
  inviteCode: string,
  email: string,
  password: string,
  username: string,
  nickname: string,
  avatarUrl: string | null,
) {
  console.log("[v0] Starting account creation process")
  try {
    // Проверяем код приглашения
    const inviteCodeValidation = await validateInviteCode(inviteCode)
    if (!inviteCodeValidation.valid) {
      return {
        success: false,
        error: inviteCodeValidation.error,
      }
    }

    // Проверяем, не занят ли username
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("username")
      .eq("username", username)
      .single()

    if (existingUser) {
      return {
        success: false,
        error: "Это имя пользователя уже занято",
      }
    }

    // Получаем URL аватара заранее
    const finalAvatarUrl = avatarUrl || getRandomDefaultAvatar()

    // Создаем пользователя через Supabase Auth
    console.log("[v0] Creating user through Supabase Auth")
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        display_name: nickname,
        avatar_url: finalAvatarUrl,
      },
    })

    if (authError) throw authError

    if (!authData.user) {
      throw new Error("User data is missing after creation")
    }

    // Создаем профиль пользователя
    console.log("[v0] Creating user profile")

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: authData.user.id,
      username,
      display_name: nickname,
      avatar_url: finalAvatarUrl,
      badges: ["beta"], // Добавляем бейджик "beta" при создании профиля
    })

    if (profileError) {
      console.error("[v0] Profile creation error:", profileError)
      // Если не удалось создать профиль, удаляем пользователя
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return {
        success: false,
        error: "Ошибка при создании профиля",
      }
    }

    // Обновляем код приглашения
    console.log("[v0] Updating invite code")
    const { error: inviteError } = await supabaseAdmin
      .from("invite_codes")
      .update({ used_by: authData.user.id, used_at: new Date().toISOString() })
      .eq("code", inviteCode)
      .eq("email", email)

    if (inviteError) {
      console.error("[v0] Error updating invite code:", inviteError)
      // Не прерываем процесс из-за ошибки обновления кода приглашения
    }

    console.log("[v0] Account creation successful")
    return {
      success: true,
      message: "Аккаунт успешно создан",
    }
  } catch (error) {
    console.error("[v0] Unexpected error during account creation:", error)
    return {
      success: false,
      error: "Произошла неожиданная ошибка при создании аккаунта. Пожалуйста, попробуйте еще раз.",
    }
  }
}
