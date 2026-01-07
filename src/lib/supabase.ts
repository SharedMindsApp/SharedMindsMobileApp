// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Load from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 🔥 Create a fully configured Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,        // Keep user logged in after refresh
    autoRefreshToken: true,      // Refresh JWT automatically
    detectSessionInUrl: true,    // Needed for OAuth callback redirect
    storage: localStorage,       // Use browser localStorage for session
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
