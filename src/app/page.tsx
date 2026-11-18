"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, isSupabaseConfigured, AppUser, Deck } from "@/lib/supabase";
import {
  Plus,
  BookOpen,
  Trash2,
  LogOut,
  Sparkles,
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  FolderPlus,
} from "lucide-react";

const CUTE_ICONS = ["🌸", "🐣", "🍓", "🍵", "☁️", "🍋", "🍰", "🐳"];

const PASTEL_THEMES: Record<
  string,
  { name: string; bg: string; border: string; badge: string }
> = {
  pink: {
    name: "Hồng Đào",
    bg: "bg-[#FFF0F3]",
    border: "border-[#FFD1DC]",
    badge: "bg-[#FFD6E0] text-[#7A2E3D]",
  },
  mint: {
    name: "Xanh Mint",
    bg: "bg-[#F0FBF6]",
    border: "border-[#C2F0DC]",
    badge: "bg-[#C9F5E1] text-[#225C43]",
  },
  butter: {
    name: "Vàng Bơ",
    bg: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    badge: "bg-[#FEF08A] text-[#714F12]",
  },
  lavender: {
    name: "Tím Mộng Mơ",
    bg: "bg-[#F6F2FF]",
    border: "border-[#DDD6FE]",
    badge: "bg-[#E9D5FF] text-[#4C1D95]",
  },
};

export default function HomePage() {
  // State tài khoản (lưu localStorage + bảng users trên Supabase)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // State danh sách bộ thẻ (Decks)
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);

  // State tạo bộ thẻ mới
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("🌸");
  const [newColor, setNewColor] = useState("pink");
  const [creating, setCreating] = useState(false);

  // Khôi phục phiên đăng nhập từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem("mimocard_user");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("mimocard_user");
      }
    }
    setAuthReady(true);
  }, []);

  // Tải danh sách bộ thẻ khi đã đăng nhập
  useEffect(() => {
    if (currentUser && isSupabaseConfigured) {
      fetchDecks(currentUser.id);
    }
  }, [currentUser]);

  async function fetchDecks(userId: string) {
    setLoadingDecks(true);
    const { data, error } = await supabase
      .from("decks")
      .select("*, cards(count)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDecks(data as Deck[]);
    }
    setLoadingDecks(false);
  }

  // Xử lý Đăng nhập / Tạo tài khoản đơn giản bằng name & pass
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError("");

    const cleanName = username.trim();
    const cleanPass = password.trim();

    if (!cleanName || !cleanPass) {
      setAuthError("Ní ơi, nhập đủ Tên đăng nhập và Mật khẩu nha! 🐣");
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === "register") {
        // Kiểm tra tên tài khoản đã tồn tại chưa
        const { data: existing } = await supabase
          .from("users")
          .select("id")
          .eq("username", cleanName)
          .maybeSingle();

        if (existing) {
          setAuthError("Tên này có người dùng rồi, ní chọn tên khác nha! 🌸");
          setAuthLoading(false);
          return;
        }

        const { data: created, error } = await supabase
          .from("users")
          .insert([{ username: cleanName, password: cleanPass }])
          .select("id, username")
          .single();

        if (error || !created) {
          setAuthError("Không thể tạo tài khoản lúc này, vui lòng thử lại sau nha!");
          setAuthLoading(false);
          return;
        }

        localStorage.setItem("mimocard_user", JSON.stringify(created));
        setCurrentUser(created);
      } else {
        // Đăng nhập
        const { data: user, error } = await supabase
          .from("users")
          .select("id, username, password")
          .eq("username", cleanName)
          .maybeSingle();

        if (error) {
          setAuthError("Kết nối hệ thống đang bận, vui lòng thử lại sau nha!");
          setAuthLoading(false);
          return;
        }

        if (!user || user.password !== cleanPass) {
          setAuthError("Sai tên đăng nhập hoặc mật khẩu rồi ní ơi! 🙈");
          setAuthLoading(false);
          return;
        }

        const safeUser: AppUser = { id: user.id, username: user.username };
        localStorage.setItem("mimocard_user", JSON.stringify(safeUser));
        setCurrentUser(safeUser);
      }
      setUsername("");
      setPassword("");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("mimocard_user");
    setCurrentUser(null);
    setDecks([]);
  }

  // Tạo bộ thẻ mới
  async function handleCreateDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newTitle.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("decks")
      .insert([
        {
          user_id: currentUser.id,
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          icon: newIcon,
          color: newColor,
        },
      ])
      .select("*, cards(count)")
      .single();

    setCreating(false);
    if (!error && data) {
      setDecks([data as Deck, ...decks]);
      setNewTitle("");
      setNewDesc("");
      setShowCreateModal(false);
    }
  }

  // Xóa bộ thẻ
  async function handleDeleteDeck(id: string, title: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Ní có chắc muốn xóa bộ thẻ "${title}" không?`)) return;

    const { error } = await supabase.from("decks").delete().eq("id", id);
    if (!error) {
      setDecks(decks.filter((d) => d.id !== id));
    }
  }

  if (!authReady) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#FFFDF7]/90 backdrop-blur-md border-b-2 border-[#F2E6D8]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl bg-[#FFE5EC] border-2 border-[#FFB3C6] w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm">
              🐣
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#4A3F35] flex items-center gap-1.5">
                MimoCard
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#FFD6E0] text-[#7A2E3D]">
                  Flashcard
                </span>
              </h1>
              <p className="text-xs text-[#8C7E72] font-medium">
                Sổ tay học từ vựng nhỏ xinh mỗi ngày ✨
              </p>
            </div>
          </div>

          {currentUser && (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-white border-2 border-[#F0E4D7] px-3.5 py-1.5 rounded-full text-sm font-bold text-[#4A3F35]">
                <span>🌸</span>
                <span>Chào, {currentUser.username}!</span>
              </div>
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="cute-btn-soft bg-white px-3 py-2 rounded-2xl text-sm font-bold text-[#8C7E72] hover:text-[#D9534F] flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Thoát</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {!currentUser ? (
          /* ================= MÀN HÌNH ĐĂNG NHẬP / ĐĂNG KÝ SIÊU GỌN ================= */
          <div className="max-w-md mx-auto mt-6">
            <div className="cute-card rounded-3xl p-7 sm:p-8 relative overflow-hidden">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-3 rounded-3xl bg-[#FFF0F3] border-2 border-[#FFD1DC] flex items-center justify-center text-4xl shadow-sm">
                  {authMode === "login" ? "🐣" : "🍓"}
                </div>
                <h2 className="text-2xl font-bold text-[#4A3F35]">
                  {authMode === "login"
                    ? "Chào mừng ní quay lại!"
                    : "Tạo sổ tay mới nha!"}
                </h2>
                <p className="text-sm text-[#8C7E72] mt-1">
                  Chỉ cần tên và mật khẩu ngắn gọn, không cần email rườm rà ✨
                </p>
              </div>

              {/* Chuyển tab Đăng nhập / Đăng ký */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF3EB] rounded-2xl mb-6 border border-[#EFE2D3]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setAuthError("");
                  }}
                  className={`py-2 rounded-xl text-sm font-bold transition-all ${
                    authMode === "login"
                      ? "bg-white text-[#4A3F35] shadow-sm border border-[#EADBC8]"
                      : "text-[#8C7E72] hover:text-[#4A3F35]"
                  }`}
                >
                  🔑 Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setAuthError("");
                  }}
                  className={`py-2 rounded-xl text-sm font-bold transition-all ${
                    authMode === "register"
                      ? "bg-white text-[#4A3F35] shadow-sm border border-[#EADBC8]"
                      : "text-[#8C7E72] hover:text-[#4A3F35]"
                  }`}
                >
                  ✨ Tạo tài khoản
                </button>
              </div>

              {authError && (
                <div className="mb-4 p-3.5 rounded-2xl bg-[#FFF0F3] border-2 border-[#FFB3C6] text-[#9E2A3B] text-sm font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[#4A3F35] mb-1.5">
                    Tên của ní (Username)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C7E72] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="VD: minhcute, hocsinhgioi..."
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-sm font-semibold text-[#4A3F35]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-[#4A3F35] mb-1.5">
                    Mật khẩu (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8C7E72] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu dễ nhớ..."
                      className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-sm font-semibold text-[#4A3F35]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full cute-btn bg-[#FF9EAA] hover:bg-[#FF8DA0] text-[#4A3F35] font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 mt-2"
                >
                  <span>
                    {authLoading
                      ? "Đang xử lý..."
                      : authMode === "login"
                      ? "Vào học ngay 🚀"
                      : "Tạo tài khoản & Vào học 🌸"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ================= MÀN HÌNH DANH SÁCH BỘ THẺ (DECKS) ================= */
          <div>
            {/* Thanh tiêu đề + Nút tạo bộ thẻ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-[#4A3F35] flex items-center gap-2">
                  <span>📚 Góc học tập của {currentUser.username}</span>
                </h2>
                <p className="text-sm text-[#8C7E72] font-medium mt-0.5">
                  Tạo bộ thẻ mới rồi nhập từ vựng hoặc tải file Excel / CSV 2 cột lên nha!
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="cute-btn bg-[#FF9EAA] hover:bg-[#FF8DA0] text-[#4A3F35] font-bold px-5 py-3 rounded-2xl flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <Plus className="w-5 h-5" />
                <span>Tạo bộ thẻ mới</span>
              </button>
            </div>

            {/* Modal tạo bộ thẻ mới */}
            {showCreateModal && (
              <div className="fixed inset-0 z-50 bg-black/25 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="cute-card rounded-3xl max-w-md w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#4A3F35] flex items-center gap-2">
                      <FolderPlus className="w-5 h-5 text-[#FF8093]" />
                      <span>Tạo bộ thẻ từ vựng mới</span>
                    </h3>
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="text-sm font-bold text-[#8C7E72] hover:text-[#4A3F35] px-2 py-1"
                    >
                      Đóng ✕
                    </button>
                  </div>

                  <form onSubmit={handleCreateDeck} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-[#4A3F35] mb-1">
                        Tên bộ thẻ *
                      </label>
                      <input
                        type="text"
                        required
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="VD: Tiếng Anh Giao Tiếp, Từ vựng TOEIC Part 1..."
                        className="w-full px-4 py-3 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[#4A3F35] mb-1">
                        Mô tả ngắn (tuỳ chọn)
                      </label>
                      <input
                        type="text"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="VD: Mỗi ngày ôn 20 từ trước khi ngủ ✨"
                        className="w-full px-4 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-sm font-medium"
                      />
                    </div>

                    {/* Chọn Icon dễ thương */}
                    <div>
                      <label className="block text-sm font-bold text-[#4A3F35] mb-1.5">
                        Chọn sticker đại diện
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {CUTE_ICONS.map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setNewIcon(ic)}
                            className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border-2 transition-all ${
                              newIcon === ic
                                ? "bg-[#FFE5EC] border-[#FF8093] scale-110"
                                : "bg-white border-[#EFE2D3] hover:border-[#D9C7B2]"
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Chọn tông màu Pastel */}
                    <div>
                      <label className="block text-sm font-bold text-[#4A3F35] mb-1.5">
                        Màu sắc thẻ
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PASTEL_THEMES).map(([key, theme]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNewColor(key)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border-2 flex items-center gap-2 transition-all ${
                              theme.bg
                            } ${
                              newColor === key
                                ? "border-[#4A3F35] ring-2 ring-[#4A3F35]/15"
                                : theme.border
                            }`}
                          >
                            <span
                              className={`w-3 h-3 rounded-full ${theme.badge.split(" ")[0]}`}
                            />
                            <span>{theme.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="cute-btn-soft bg-white px-4 py-2.5 rounded-2xl text-sm font-bold text-[#8C7E72]"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="cute-btn bg-[#A8E6CF] hover:bg-[#93DFC2] px-5 py-2.5 rounded-2xl text-sm font-bold text-[#4A3F35]"
                      >
                        {creating ? "Đang tạo..." : "Tạo bộ thẻ ✨"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Danh sách bộ thẻ */}
            {loadingDecks ? (
              <div className="text-center py-16 text-[#8C7E72] font-semibold">
                <div className="text-4xl animate-bounce mb-2">🐣</div>
                Đang mở sổ tay của ní...
              </div>
            ) : decks.length === 0 ? (
              <div className="cute-card rounded-3xl p-10 text-center max-w-lg mx-auto my-6">
                <div className="text-5xl mb-3">🌱</div>
                <h3 className="text-lg font-bold text-[#4A3F35]">
                  Chưa có bộ thẻ từ vựng nào hết!
                </h3>
                <p className="text-sm text-[#8C7E72] mt-1 mb-6">
                  Hãy tạo bộ thẻ đầu tiên, sau đó nhập từ vựng hoặc tải file CSV /
                  Excel (2 cột Từ - Nghĩa) lên để bắt đầu học nha.
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="cute-btn bg-[#FF9EAA] text-[#4A3F35] font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Tạo bộ thẻ đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {decks.map((deck) => {
                  const theme =
                    PASTEL_THEMES[deck.color] || PASTEL_THEMES.pink;
                  const cardCount = deck.cards?.[0]?.count ?? 0;

                  return (
                    <Link
                      key={deck.id}
                      href={`/decks/${deck.id}`}
                      className={`cute-card cute-card-hover rounded-3xl p-6 flex flex-col justify-between ${theme.bg} ${theme.border}`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="w-12 h-12 rounded-2xl bg-white border-2 border-[#F0E4D7] flex items-center justify-center text-2xl shadow-xs">
                            {deck.icon || "🌸"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold px-3 py-1 rounded-full ${theme.badge}`}
                            >
                              {cardCount} từ vựng
                            </span>
                            <button
                              onClick={(e) =>
                                handleDeleteDeck(deck.id, deck.title, e)
                              }
                              title="Xóa bộ thẻ"
                              className="p-1.5 rounded-xl bg-white/80 hover:bg-[#FFE5EC] text-[#8C7E72] hover:text-[#D9534F] transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-[#4A3F35] line-clamp-1">
                          {deck.title}
                        </h3>
                        <p className="text-xs text-[#8C7E72] font-medium mt-1 line-clamp-2 min-h-[2rem]">
                          {deck.description || "Bấm vào để học hoặc thêm từ vựng mới ✨"}
                        </p>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#4A3F35]/10 flex items-center justify-between text-xs font-bold text-[#4A3F35]">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4" />
                          <span>Học & Quản lý thẻ</span>
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-5 text-center text-xs font-semibold text-[#8C7E72]">
        Made with 💖 MimoCard • Học từ vựng nhẹ nhàng mỗi ngày
      </footer>
    </div>
  );
}
