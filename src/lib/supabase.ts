// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Load from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables in production
if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('[supabase] Missing required environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
}

// 🔥 Create a fully configured Supabase client with connection resilience
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
  auth: {
    persistSession: true,        // Keep user logged in after refresh
    autoRefreshToken: true,      // Refresh JWT automatically
    detectSessionInUrl: true,    // Needed for OAuth callback redirect
    storage: localStorage,       // Use browser localStorage for session
    storageKey: 'supabase.auth.token', // Explicit storage key
    flowType: 'pkce',           // Use PKCE flow for better security
  },
  global: {
    headers: {
      'X-Client-Info': 'shared-minds-web',
    },
  },
  // Enable realtime but with reconnection handling
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  db: {
    schema: 'public',
  },
});

// =====================
// Shared Type Definitions
// =====================

export type Section = {
  id: string;
  title: string;
  description: string;
  order_index: number;
};

export type Member = {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  age: number;
  role: string;
  created_at: string;
};

export type Progress = {
  id: string;
  member_id: string;
  section_id: string;
  questions_completed: number;
  questions_total: number;
  completed: boolean;
  updated_at: string;
};

export type Answer = {
  id: string;
  member_id: string;
  question_id: string;
  answer: Record<string, unknown>;
  updated_at: string;
};

export type Question = {
  id: string;
  section_id: string;
  question_text: string;
  type: string;
  metadata: Record<string, unknown>;
};
