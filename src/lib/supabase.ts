import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Hỗ trợ cả tên biến chuẩn (ANON_KEY) và tên biến mới trên tab Framework của Supabase (PUBLISHABLE_KEY)
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

// Kiểm tra xem người dùng đã điền cấu hình Supabase thật vào .env.local chưa
export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  !supabaseUrl.includes("your_supabase_project_url_here") &&
  !supabaseAnonKey.includes("your_supabase_anon_key_here") &&
  supabaseUrl.startsWith("http");

// Khởi tạo client (dùng URL placeholder hợp lệ nếu chưa điền để không crash lúc build)
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
