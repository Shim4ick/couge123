import { createClient } from "@/lib/supabase/client"

export const getServers = async () => {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return []
  }

  const { data: memberData, error: memberError } = await supabase
    .from("server_members")
    .select("server_id")
    .eq("user_id", user.id)

  if (memberError) {
    console.error("[v0] Error fetching server memberships:", memberError)
    return []
  }

  if (memberData && memberData.length > 0) {
    const serverIds = memberData.map((member) => member.server_id)
    const { data, error } = await supabase
      .from("servers")
      .select(`
          id, 
          name, 
          owner_id, 
          invite_code, 
          avatar_url
        `)
      .in("id", serverIds)
    if (error) {
      console.error("[v0] Error fetching servers:", error)
      return []
    }
    return data || []
  } else {
    return []
  }
}
