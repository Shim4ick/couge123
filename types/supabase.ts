// types/supabase.ts
export type Database = {
  public: {
    Tables: {
      channels: {
        Row: {
          created_at: string | null
          id: number
          name: string
          server_id: number
          updated_at: string | null
        }
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          recipient_id: string
          sender_id: string
        }
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          email: string
          id: number
          used_at: string | null
          used_by: string | null
        }
      }
      invite_links: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: number
          server_id: number
          uses: number
        }
      }
      messages: {
        Row: {
          channel_id: number
          content: string
          created_at: string
          file_url: string | null
          id: number
          reply_to: number | null
          updated_at: string | null
          user_id: string
        }
      }
      notifications: {
        Row: {
          channel_id: number
          count: number
          created_at: string
          id: number
          server_id: number
          user_id: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean | null
          last_seen: string | null
          status: string | null
          updated_at: string
          username: string | null
          badges: BadgeType[] | null
        }
      }
      server_members: {
        Row: {
          id: number
          joined_at: string
          server_id: number
          user_id: string
        }
      }
      servers: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_invite_code: string | null
          default_invite_expires_at: string | null
          default_invite_uses: number | null
          id: number
          invite_code: string | null
          is_verified: boolean | null
          name: string
          owner_id: string
        }
      }
      trusted_sites: {
        Row: {
          created_at: string
          domain: string
          id: number
          user_id: string
        }
      }
      typing_status: {
        Row: {
          channel_id: number | null
          id: number
          is_typing: boolean
          updated_at: string
          user_id: string
          username: string
        }
      }
      user_status: {
        Row: {
          user_id: string
          online: boolean
          status: string
          last_seen: string
          updated_at: string
        }
      }
    }
    Views: {}
    Functions: {
      create_invite_link: {
        Args: {
          p_created_by: string
          p_expires_at: string | null
          p_server_id: number
        }
        Returns: string
      }
      delete_message_and_update_replies: {
        Args: {
          message_id: number
        }
        Returns: void
      }
      generate_unique_invite_code: {
        Args: {}
        Returns: string
      }
      increment_invite_link_uses: {
        Args: {
          p_code: string
        }
        Returns: void
      }
      process_mentions: {
        Args: {}
        Returns: Database["public"]["Tables"]["messages"]["Row"]
      }
      set_invite_code: {
        Args: {}
        Returns: Database["public"]["Tables"]["servers"]["Row"]
      }
    }
    Enums: {}
  }
}

export type BadgeType = "founder" | "staff" | "beta"

export type UserStatus = "online" | "idle" | "dnd" | "offline"

declare global {
  interface Window {
    cougeAppAPI?: {
      isApp: boolean
      toggleTray: (enabled: boolean) => void
      toggleAutoLaunch: (enabled: boolean) => void
      getSettings: () => Promise<{
        keepInTray: boolean
        autoLaunch: boolean
      }>
    }
  }
}
