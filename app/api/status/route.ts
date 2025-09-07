import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import os from "os"

// Функция для получения uptime сервера из системы
function getSystemUptime(): { formatted: string; ms: number } {
  // Получаем uptime операционной системы в секундах
  const uptimeSeconds = os.uptime()
  const uptimeMs = uptimeSeconds * 1000

  // Форматируем uptime
  const days = Math.floor(uptimeSeconds / 86400)
  const hours = Math.floor((uptimeSeconds % 86400) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const seconds = Math.floor(uptimeSeconds % 60)

  let formatted = ""
  if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m ${seconds}s`
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds}s`
  } else {
    formatted = `${seconds}s`
  }

  return { formatted, ms: uptimeMs }
}

// Функция для проверки соединения с Supabase и базой данных
async function checkDatabaseConnection() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Выполняем простой запрос без агрегатных функций
    const { data, error } = await supabase.from("profiles").select("id").limit(1)

    if (error) {
      console.error("Database query error:", error)
      return {
        status: "down",
        error: "Не удалось выполнить запрос к базе данных",
        details: error.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "База данных работает нормально",
    }
  } catch (error) {
    console.error("Database connection error:", error)
    return {
      status: "down",
      error: "Не удалось подключиться к базе данных",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки хранилища Supabase
async function checkStorageService() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    // Используем сервисный ключ для доступа к бакетам
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Проверяем доступ к бакетам
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error("Storage buckets error:", bucketsError)
      return {
        status: "down",
        error: "Проблемы с доступом к хранилищу",
        details: bucketsError.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: `Доступных бакетов: ${buckets?.length || 0}`,
    }
  } catch (error) {
    console.error("Storage service error:", error)
    return {
      status: "down",
      error: "Проблемы с сервисом хранения файлов",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки системы сообщений
async function checkMessagingSystem() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Проверяем доступ к таблице сообщений без агрегатных функций
    const { data, error } = await supabase.from("messages").select("id").limit(1)

    if (error) {
      console.error("Messages table error:", error)
      return {
        status: "down",
        error: "Проблемы с системой сообщений",
        details: error.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "Система сообщений работает нормально",
    }
  } catch (error) {
    console.error("Messaging system error:", error)
    return {
      status: "down",
      error: "Проблемы с системой сообщений",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки системы аутентификации
async function checkAuthSystem() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Проверяем доступность API аутентификации через публичный метод
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      console.error("Auth session error:", error)
      return {
        status: "down",
        error: "Проблемы с системой аутентификации",
        details: error.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "Система аутентификации работает нормально",
    }
  } catch (error) {
    console.error("Auth system error:", error)
    return {
      status: "down",
      error: "Проблемы с системой аутентификации",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки системы серверов и каналов
async function checkServersSystem() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Проверяем доступ к таблице серверов без агрегатных функций
    const { data, error } = await supabase.from("servers").select("id").limit(1)

    if (error) {
      console.error("Servers table error:", error)
      return {
        status: "down",
        error: "Проблемы с системой серверов",
        details: error.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "Система серверов и каналов работает нормально",
    }
  } catch (error) {
    console.error("Servers system error:", error)
    return {
      status: "down",
      error: "Проблемы с системой серверов и каналов",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки API сервера
async function checkAPIServer() {
  const startTime = Date.now()
  try {
    // Проверяем, что сервер отвечает (если мы здесь, значит сервер работает)
    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "API сервер отвечает нормально",
    }
  } catch (error) {
    console.error("API server error:", error)
    return {
      status: "down",
      error: "Проблемы с API сервером",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки системы приглашений
async function checkInviteSystem() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Проверяем доступ к таблице приглашений без агрегатных функций
    const { data, error } = await supabase.from("invite_codes").select("id").limit(1)

    if (error) {
      console.error("Invite codes table error:", error)
      return {
        status: "down",
        error: "Проблемы с системой приглашений",
        details: error.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "Система приглашений работает нормально",
    }
  } catch (error) {
    console.error("Invite system error:", error)
    return {
      status: "down",
      error: "Проблемы с системой приглашений",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

// Функция для проверки системы профилей
async function checkProfilesSystem() {
  const startTime = Date.now()
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Проверяем доступ к таблице профилей без агрегатных функций
    const { data, error } = await supabase.from("profiles").select("id, username").limit(1)

    if (error) {
      console.error("Profiles table error:", error)
      return {
        status: "down",
        error: "Проблемы с системой профилей",
        details: error.message,
      }
    }

    const latency = Date.now() - startTime
    return {
      status: "operational",
      latency: `${latency}ms`,
      details: "Система профилей пользователей работает нормально",
    }
  } catch (error) {
    console.error("Profiles system error:", error)
    return {
      status: "down",
      error: "Проблемы с системой профилей",
      details: error instanceof Error ? error.message : "Неизвестная ошибка",
    }
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    // Получаем uptime системы
    const uptime = getSystemUptime()

    console.log(`[Status API] Server uptime: ${uptime.formatted}`)

    // Параллельно проверяем все сервисы
    const [
      databaseStatus,
      storageStatus,
      messagingStatus,
      authStatus,
      serversStatus,
      inviteStatus,
      apiStatus,
      profilesStatus,
    ] = await Promise.all([
      checkDatabaseConnection(),
      checkStorageService(),
      checkMessagingSystem(),
      checkAuthSystem(),
      checkServersSystem(),
      checkInviteSystem(),
      checkAPIServer(),
      checkProfilesSystem(),
    ])

    // Определяем общий статус системы
    const serviceStatuses = [
      databaseStatus.status,
      storageStatus.status,
      messagingStatus.status,
      authStatus.status,
      serversStatus.status,
      inviteStatus.status,
      apiStatus.status,
      profilesStatus.status,
    ]

    const allOperational = serviceStatuses.every((status) => status === "operational")
    const anyDown = serviceStatuses.some((status) => status === "down")

    let overallStatus = "operational"
    if (!allOperational) {
      overallStatus = anyDown ? "major_outage" : "partial_outage"
    }

    // Логируем статус всех сервисов
    console.log(`[Status API] Overall status: ${overallStatus}`)
    Object.entries({
      database: databaseStatus,
      storage: storageStatus,
      messaging: messagingStatus,
      authentication: authStatus,
      servers: serversStatus,
      invites: inviteStatus,
      api_server: apiStatus,
      profiles: profilesStatus,
    }).forEach(([service, status]) => {
      console.log(`[Status API] ${service}: ${status.status}`)
    })

    // Формируем ответ с добавлением uptime
    const response = {
      timestamp: new Date().toISOString(),
      overall_status: overallStatus,
      response_time: `${Date.now() - startTime}ms`,
      uptime: uptime.formatted,
      uptime_ms: uptime.ms,
      services: {
        database: databaseStatus,
        storage: storageStatus,
        messaging: messagingStatus,
        authentication: authStatus,
        servers: serversStatus,
        invites: inviteStatus,
        api_server: apiStatus,
        profiles: profilesStatus,
      },
    }

    return NextResponse.json(response, {
      headers: {
        "Access-Control-Allow-Origin": "*", // Разрешаем доступ с любого домена
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    })
  } catch (error) {
    console.error("Status API error:", error)

    // В случае общей ошибки возвращаем информацию об ошибке
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        overall_status: "major_outage",
        error: "Ошибка при получении статуса сервисов",
        details: error instanceof Error ? error.message : "Неизвестная ошибка",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Content-Type": "application/json",
        },
      },
    )
  }
}
