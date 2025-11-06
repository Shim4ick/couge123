import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { serverId } = await request.json()

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check if the user is the server owner
  const { data: server, error: serverError } = await supabase
    .from("servers")
    .select("owner_id")
    .eq("id", serverId)
    .single()

  if (serverError || !server) {
    return NextResponse.json({ error: "Server not found" }, { status: 404 })
  }

  if (server.owner_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Delete the server
  const { error: deleteError } = await supabase.from("servers").delete().eq("id", serverId)

  if (deleteError) {
    return NextResponse.json({ error: "Failed to delete server" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
