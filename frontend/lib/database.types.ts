// Auto-generated types for Supabase schema
// Run: npx supabase gen types typescript --project-id <your-project-id> > lib/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          industry: string
          timezone: string
          plan: string
          subscription_status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['organizations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['organizations']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          organization_id: string
          email: string
          name: string
          avatar_url: string | null
          role: string
          is_mfa_enabled: boolean
          last_sign_in_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          type: string
          title: string
          body: string
          is_read: boolean
          link: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          status: string
          color: string
          owner_id: string
          progress: number
          start_date: string | null
          due_date: string | null
          tasks_total: number
          tasks_completed: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          sprint_id: string | null
          title: string
          description: string | null
          status: string
          priority: string
          assignee_id: string | null
          due_date: string | null
          estimated_hours: number | null
          logged_hours: number | null
          position: number
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      leads: {
        Row: {
          id: string
          organization_id: string
          name: string
          email: string | null
          phone: string | null
          company: string | null
          status: string
          score: string
          estimated_value: number
          currency: string
          next_action: string | null
          next_action_date: string | null
          assignee_id: string | null
          source: string | null
          notes: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['leads']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['leads']['Insert']>
      }
      campaigns: {
        Row: {
          id: string
          organization_id: string
          name: string
          type: string
          status: string
          subject: string | null
          recipients: number
          opens: number | null
          clicks: number | null
          conversions: number | null
          open_rate: number | null
          click_rate: number | null
          sent_at: string | null
          scheduled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['campaigns']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['campaigns']['Insert']>
      }
      whatsapp_flows: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          status: string
          trigger_keywords: string[]
          nodes: Json
          edges: Json
          total_triggered: number
          total_completed: number
          completion_rate: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['whatsapp_flows']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['whatsapp_flows']['Insert']>
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          contact_name: string
          contact_phone: string
          contact_avatar: string | null
          status: string
          last_message: string | null
          last_message_at: string | null
          unread_count: number
          assigned_to: string | null
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['conversations']['Insert']>
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          type: string
          direction: string
          content: string
          media_url: string | null
          is_read: boolean
          sent_at: string
          delivered_at: string | null
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
        }
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['messages']['Insert']>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
