import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { action, userId, requestId } = await request.json()
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    switch (action) {
      case "send_request":
        // Check if can send friend request
        const { data: checkResult, error: checkError } = await supabase.rpc("can_send_friend_request", {
          sender: user.id,
          recipient: userId,
        })

        if (checkError) throw checkError

        if (!checkResult.can_send) {
          return NextResponse.json({
            success: false,
            reason: checkResult.reason,
          })
        }

        // Send friend request
        const { error: requestError } = await supabase.from("friend_requests").insert({
          sender_id: user.id,
          recipient_id: userId,
          status: "pending",
        })

        if (requestError) throw requestError

        return NextResponse.json({ success: true })

      case "accept_request":
        const { error: acceptError } = await supabase.rpc("accept_friend_request", { request_id: requestId })

        if (acceptError) throw acceptError

        return NextResponse.json({ success: true })

      case "reject_request":
        const { error: rejectError } = await supabase
          .from("friend_requests")
          .update({ status: "rejected" })
          .eq("id", requestId)
          .eq("recipient_id", user.id)

        if (rejectError) throw rejectError

        return NextResponse.json({ success: true })

      case "cancel_request":
        const { error: cancelError } = await supabase
          .from("friend_requests")
          .update({ status: "canceled" })
          .eq("id", requestId)
          .eq("sender_id", user.id)

        if (cancelError) throw cancelError

        return NextResponse.json({ success: true })

      case "remove_friend":
        const { error: removeError } = await supabase
          .from("friends")
          .delete()
          .or(`(user_id.eq.${user.id}.and.friend_id.eq.${userId}),(user_id.eq.${userId}.and.friend_id.eq.${user.id})`)

        if (removeError) throw removeError

        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Error processing friend action:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
