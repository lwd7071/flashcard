-- =========================================================
-- MIMOCARD FLASHCARD - SUPABASE SCHEMA
-- Chạy toàn bộ script này trong Supabase -> SQL Editor -> Run
-- =========================================================

-- 1. Bảng người dùng (Đăng ký / Đăng nhập đơn giản bằng username & password)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Bảng bộ thẻ (Decks) - Gắn với từng user
create table if not exists public.decks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  icon text default '🌸',
  color text default 'pink',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Bảng thẻ từ vựng (Cards) - Gắn với bộ thẻ
create table if not exists public.cards (
  id uuid default gen_random_uuid() primary key,
  deck_id uuid references public.decks(id) on delete cascade not null,
  term text not null,
  definition text not null,
  is_learned boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Bật Row Level Security (RLS) và mở policy cho phép thao tác qua Anon Key
alter table public.users enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;

create policy "Allow all operations on users" on public.users for all using (true) with check (true);
create policy "Allow all operations on decks" on public.decks for all using (true) with check (true);
create policy "Allow all operations on cards" on public.cards for all using (true) with check (true);
