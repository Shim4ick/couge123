import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { serverId } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

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
