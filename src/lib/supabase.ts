import { createClient } from "@supabase/supabase-js";

function cleanEnv(val?: string) {
  if (!val || val.includes("your_supabase_")) return "";
  return val.trim();
}

const supabaseUrl = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) ||
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  supabaseUrl.startsWith("http");

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-project.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);

// Kiểu dữ liệu cho Bảng users
export interface AppUser {
  id: string;
  username: string;
  created_at?: string;
}

// Kiểu dữ liệu cho Bảng decks (Bộ thẻ)
export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  created_at: string;
  cards?: { count: number }[];
}

// Kiểu dữ liệu cho Bảng cards (Thẻ từ vựng)
export interface Flashcard {
  id: string;
  deck_id: string;
  term: string;
  definition: string;
  is_learned: boolean;
  created_at: string;
}
