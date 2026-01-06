// Create a new API route to handle mention processing client-side instead of relying on database triggers

import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { content, channelId } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  try {
    // Extract mentions from content
    const mentionRegex = /@(\w+)/g
    const mentionMatches = content.match(mentionRegex) || []
    const usernames = mentionMatches.map((match) => match.substring(1))

    // If no mentions, return empty array
    if (usernames.length === 0) {
      return NextResponse.json({ mentions: [] })
    }

    // Get server ID for the channel
    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("server_id")
      .eq("id", channelId)
      .single()

    if (channelError) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 })
    }

    const serverId = channelData.server_id

    // Get user IDs for the mentioned usernames who are members of the server
    const { data: mentionedUsers, error: usersError } = await supabase
      .from("profiles")
      .select("id, username")
      .in("username", usernames)

    if (usersError) {
      return NextResponse.json({ error: "Error fetching users" }, { status: 500 })
    }

    // Filter to only include users who are members of the server
    const { data: serverMembers, error: membersError } = await supabase
      .from("server_members")
      .select("user_id")
      .eq("server_id", serverId)

    if (membersError) {
      return NextResponse.json({ error: "Error fetching server members" }, { status: 500 })
    }

    const memberIds = serverMembers.map((member) => member.user_id)
    const validMentions = mentionedUsers.filter((user) => memberIds.includes(user.id)).map((user) => user.id)

    return NextResponse.json({ mentions: validMentions })
  } catch (error) {
    console.error("Error processing mentions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
