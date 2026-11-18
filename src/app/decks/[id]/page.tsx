"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase, Deck, Flashcard } from "@/lib/supabase";
import {
  parseFlashcardFile,
  downloadSampleCsv,
  ParsedCardRow,
} from "@/lib/fileParser";
import {
  ArrowLeft,
  Volume2,
  Shuffle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Upload,
  Download,
  Trash2,
  Check,
  Sparkles,
  FileSpreadsheet,
  Search,
} from "lucide-react";

export default function DeckDetailPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params?.id as string;

  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  // Chế độ hiển thị: "study" (Lật thẻ học) | "manage" (Thêm từ & Upload Excel/CSV)
  const [activeTab, setActiveTab] = useState<"study" | "manage">("study");

  // State cho chế độ Học (Study Mode)
  const [studyCards, setStudyCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [onlyUnlearned, setOnlyUnlearned] = useState(false);

  // State cho Thêm từ thủ công
  const [termInput, setTermInput] = useState("");
  const [defInput, setDefInput] = useState("");
  const [addingManual, setAddingManual] = useState(false);

  // State cho Upload file CSV / Excel
  const [previewRows, setPreviewRows] = useState<ParsedCardRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importingFile, setImportingFile] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Tìm kiếm trong danh sách thẻ
  const [searchQuery, setSearchQuery] = useState("");

  // Tải thông tin bộ thẻ và danh sách từ vựng
  useEffect(() => {
    if (!deckId) return;
    fetchDeckAndCards();
  }, [deckId]);

  async function fetchDeckAndCards() {
    setLoading(true);
    const { data: deckData, error: deckError } = await supabase
      .from("decks")
      .select("*")
      .eq("id", deckId)
      .single();

    if (deckError || !deckData) {
      router.push("/");
      return;
    }

    setDeck(deckData as Deck);

    const { data: cardsData } = await supabase
      .from("cards")
      .select("*")
      .eq("deck_id", deckId)
      .order("created_at", { ascending: true });

    const list = (cardsData as Flashcard[]) || [];
    setCards(list);
    // Nếu bộ thẻ chưa có từ nào thì mở sẵn tab Quản lý & Thêm từ cho tiện
    if (list.length === 0) {
      setActiveTab("manage");
    }
    setLoading(false);
  }

  // Đồng bộ danh sách thẻ học khi cards hoặc bộ lọc thay đổi
  useEffect(() => {
    const filtered = onlyUnlearned
      ? cards.filter((c) => !c.is_learned)
      : [...cards];
    setStudyCards(filtered);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [cards, onlyUnlearned]);

  const currentCard = studyCards[currentIndex];

  // Chuyển thẻ Trước / Tiếp
  const handleNext = useCallback(() => {
    if (studyCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % studyCards.length);
    }, 120);
  }, [studyCards.length]);

  const handlePrev = useCallback(() => {
    if (studyCards.length === 0) return;
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) =>
        prev - 1 < 0 ? studyCards.length - 1 : prev - 1
      );
    }, 120);
  }, [studyCards.length]);

  // Hỗ trợ phím tắt Space (lật thẻ), Mũi tên Trái/Phải (chuyển thẻ) khi ở tab Học
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (activeTab !== "study" || studyCards.length === 0) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.code === "ArrowRight") {
        handleNext();
      } else if (e.code === "ArrowLeft") {
        handlePrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, studyCards.length, handleNext, handlePrev]);

  // Trộn ngẫu nhiên thẻ học (Shuffle)
  function handleShuffle() {
    if (studyCards.length <= 1) return;
    const shuffled = [...studyCards].sort(() => Math.random() - 0.5);
    setIsFlipped(false);
    setStudyCards(shuffled);
    setCurrentIndex(0);
  }

  // Phát âm từ vựng bằng Web Speech API
  function speakTerm(text: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  // Đánh dấu Đã thuộc / Chưa thuộc
  async function toggleLearned(card: Flashcard, learned: boolean) {
    const { error } = await supabase
      .from("cards")
      .update({ is_learned: learned })
      .eq("id", card.id);

    if (!error) {
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, is_learned: learned } : c))
      );
      if (studyCards.length > 1) {
        handleNext();
      }
    }
  }

  // Thêm 1 thẻ thủ công
  async function handleAddSingleCard(e: React.FormEvent) {
    e.preventDefault();
    const cleanTerm = termInput.trim();
    const cleanDef = defInput.trim();
    if (!cleanTerm || !cleanDef) return;

    setAddingManual(true);
    const { data, error } = await supabase
      .from("cards")
      .insert([
        {
          deck_id: deckId,
          term: cleanTerm,
          definition: cleanDef,
          is_learned: false,
        },
      ])
      .select("*")
      .single();

    setAddingManual(false);
    if (!error && data) {
      setCards((prev) => [...prev, data as Flashcard]);
      setTermInput("");
      setDefInput("");
    }
  }

  // Chọn file CSV / Excel để đọc thử (Preview)
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setUploadMessage("");
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    try {
      const rows = await parseFlashcardFile(file);
      setPreviewRows(rows);
      if (rows.length === 0) {
        setUploadMessage(
          "Không tìm thấy dòng dữ liệu 2 cột (Từ - Nghĩa) hợp lệ trong file này 🙈"
        );
      }
    } catch {
      setUploadMessage("Không đọc được file. Bạn kiểm tra lại định dạng .csv hoặc .xlsx nha!");
    }
    e.target.value = "";
  }

  // Lưu toàn bộ từ vựng đã đọc từ CSV/Excel lên Supabase
  async function handleConfirmImport() {
    if (previewRows.length === 0) return;
    setImportingFile(true);

    const payload = previewRows.map((row) => ({
      deck_id: deckId,
      term: row.term,
      definition: row.definition,
      is_learned: false,
    }));

    const { data, error } = await supabase
      .from("cards")
      .insert(payload)
      .select("*");

    setImportingFile(false);
    if (!error && data) {
      setCards((prev) => [...prev, ...(data as Flashcard[])]);
      setUploadMessage(
        `🎉 Đã thêm thành công ${data.length} từ vựng từ file "${fileName}"!`
      );
      setPreviewRows([]);
      setFileName("");
    } else {
      setUploadMessage("Có lỗi khi lưu lên Supabase: " + (error?.message || ""));
    }
  }

  // Xóa 1 thẻ từ vựng
  async function handleDeleteCard(cardId: string) {
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (!error) {
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    }
  }

  const learnedCount = cards.filter((c) => c.is_learned).length;
  const progressPercent =
    cards.length > 0 ? Math.round((learnedCount / cards.length) * 100) : 0;

  const filteredManageCards = cards.filter(
    (c) =>
      c.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-[#8C7E72] font-bold">
        <div className="text-5xl animate-bounce mb-3">🐣</div>
        <p>Đang chuẩn bị thẻ từ vựng cho ní...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-12">
      {/* Header bộ thẻ */}
      <header className="sticky top-0 z-20 bg-[#FFFDF7]/90 backdrop-blur-md border-b-2 border-[#F2E6D8]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="cute-btn-soft bg-white p-2.5 rounded-2xl text-[#4A3F35] hover:bg-[#FFF0F3]"
              title="Quay lại trang chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{deck?.icon || "🌸"}</span>
                <h1 className="text-lg sm:text-xl font-bold text-[#4A3F35]">
                  {deck?.title}
                </h1>
              </div>
              <p className="text-xs text-[#8C7E72] font-semibold">
                Tổng cộng {cards.length} thẻ • Đã thuộc {learnedCount}/{cards.length} ({progressPercent}%)
              </p>
            </div>
          </div>

          {/* Nút chuyển Tab hình viên kẹo (Pill Tabs) */}
          <div className="flex items-center bg-[#FAF3EB] p-1.5 rounded-2xl border-2 border-[#EFE2D3]">
            <button
              onClick={() => setActiveTab("study")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "study"
                  ? "bg-[#FF9EAA] text-[#4A3F35] shadow-xs border border-[#4A3F35]"
                  : "text-[#8C7E72] hover:text-[#4A3F35]"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Học Flashcard</span>
            </button>
            <button
              onClick={() => setActiveTab("manage")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "manage"
                  ? "bg-[#A8E6CF] text-[#4A3F35] shadow-xs border border-[#4A3F35]"
                  : "text-[#8C7E72] hover:text-[#4A3F35]"
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Thêm từ & Excel ({cards.length})</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-6">
        {/* Thanh tiến độ dễ thương */}
        {cards.length > 0 && (
          <div className="mb-6 bg-white border-2 border-[#F0E4D7] rounded-2xl p-3.5 flex items-center gap-4">
            <span className="text-xs font-bold text-[#4A3F35] shrink-0">
              🌸 Tiến độ thuộc bài:
            </span>
            <div className="flex-1 h-3.5 bg-[#FAF3EB] rounded-full overflow-hidden border border-[#E6D7C3]">
              <div
                className="h-full bg-gradient-to-r from-[#FF9EAA] to-[#A8E6CF] transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-bold text-[#4A3F35] shrink-0">
              {learnedCount}/{cards.length} từ
            </span>
          </div>
        )}

        {activeTab === "study" ? (
          /* ================= TAB 1: CHẾ ĐỘ HỌC FLASHCARD 3D ================= */
          <div>
            {cards.length === 0 ? (
              <div className="cute-card rounded-3xl p-10 text-center my-6">
                <div className="text-5xl mb-3">🐣</div>
                <h2 className="text-xl font-bold text-[#4A3F35]">
                  Bộ thẻ này chưa có từ vựng nào!
                </h2>
                <p className="text-sm text-[#8C7E72] mt-1 mb-6">
                  Ní hãy bấm sang mục thêm từ để nhập tay hoặc tải file CSV /
                  Excel 2 cột lên nha.
                </p>
                <button
                  onClick={() => setActiveTab("manage")}
                  className="cute-btn bg-[#A8E6CF] px-6 py-3 rounded-2xl font-bold text-sm text-[#4A3F35] inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm từ vựng ngay</span>
                </button>
              </div>
            ) : studyCards.length === 0 ? (
              <div className="cute-card rounded-3xl p-10 text-center my-6 bg-[#F0FBF6]">
                <div className="text-5xl mb-3">🎉</div>
                <h2 className="text-xl font-bold text-[#4A3F35]">
                  Tuyệt vời! Ní đã thuộc hết tất cả các từ trong bộ thẻ này!
                </h2>
                <p className="text-sm text-[#8C7E72] mt-1 mb-6">
                  Bạn có thể bấm xem lại toàn bộ thẻ để ôn tập thêm lần nữa nha.
                </p>
                <button
                  onClick={() => setOnlyUnlearned(false)}
                  className="cute-btn bg-[#FF9EAA] px-6 py-3 rounded-2xl font-bold text-sm text-[#4A3F35]"
                >
                  Ôn lại tất cả {cards.length} thẻ 🌸
                </button>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                {/* Thanh công cụ phía trên thẻ */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-full bg-white border-2 border-[#F0E4D7] text-xs font-bold text-[#4A3F35]">
                      Thẻ {currentIndex + 1} / {studyCards.length}
                    </span>
                    <button
                      onClick={() => setOnlyUnlearned((v) => !v)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                        onlyUnlearned
                          ? "bg-[#FFE599] border-[#4A3F35] text-[#4A3F35]"
                          : "bg-white border-[#F0E4D7] text-[#8C7E72] hover:text-[#4A3F35]"
                      }`}
                    >
                      {onlyUnlearned
                        ? "🐣 Đang lọc: Chưa thuộc"
                        : "📚 Hiển thị: Tất cả"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShuffle}
                      className="cute-btn-soft bg-white px-3.5 py-1.5 rounded-2xl text-xs font-bold text-[#4A3F35] flex items-center gap-1.5"
                      title="Trộn ngẫu nhiên"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>Trộn thẻ</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsFlipped(false);
                        setCurrentIndex(0);
                      }}
                      className="cute-btn-soft bg-white px-3 py-1.5 rounded-2xl text-xs font-bold text-[#8C7E72] hover:text-[#4A3F35] flex items-center gap-1"
                      title="Quay về thẻ đầu tiên"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Đầu tiên</span>
                    </button>
                  </div>
                </div>

                {/* KHUNG THẺ LẬT 3D (3D FLIP CARD) */}
                <div
                  onClick={() => setIsFlipped((f) => !f)}
                  className="perspective-1000 cursor-pointer select-none mb-6"
                >
                  <div
                    className={`relative w-full h-80 sm:h-96 transform-style-3d ${
                      isFlipped ? "rotate-y-180" : ""
                    }`}
                  >
                    {/* MẶT TRƯỚC: TỪ VỰNG (TERM) */}
                    <div className="absolute inset-0 backface-hidden cute-card rounded-3xl p-5 flex flex-col">
                      <div className="flex-1 rounded-2xl border-2 border-dashed border-[#EADBC8] bg-[#FFFDF9] p-6 flex flex-col justify-between relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFE5EC] text-[#7A2E3D]">
                            🌱 TỪ VỰNG (Mặt trước)
                          </span>
                          <button
                            type="button"
                            onClick={(e) => speakTerm(currentCard.term, e)}
                            className="cute-btn-soft bg-white px-3 py-1.5 rounded-xl text-xs font-bold text-[#4A3F35] flex items-center gap-1.5 hover:bg-[#FFF0F3]"
                            title="Nghe phát âm"
                          >
                            <Volume2 className="w-4 h-4 text-[#FF8093]" />
                            <span>Phát âm</span>
                          </button>
                        </div>

                        <div className="my-auto text-center px-2">
                          <p className="text-3xl sm:text-4xl font-bold text-[#4A3F35] break-words leading-snug">
                            {currentCard.term}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-xs font-semibold text-[#8C7E72]">
                          <span>
                            {currentCard.is_learned
                              ? "🌸 Đã thuộc lòng"
                              : "🐣 Đang học"}
                          </span>
                          <span>👆 Chạm hoặc ấn Space để lật xem nghĩa</span>
                        </div>
                      </div>
                    </div>

                    {/* MẶT SAU: NGHĨA CỦA TỪ (DEFINITION) */}
                    <div className="absolute inset-0 backface-hidden rotate-y-180 cute-card rounded-3xl p-5 flex flex-col bg-[#FFF5F7]">
                      <div className="flex-1 rounded-2xl border-2 border-dashed border-[#FFB3C6] bg-white p-6 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#C9F5E1] text-[#225C43]">
                            💡 NGHĨA CỦA TỪ (Mặt sau)
                          </span>
                          <span className="text-xs font-bold text-[#8C7E72]">
                            {currentCard.term}
                          </span>
                        </div>

                        <div className="my-auto text-center px-2">
                          <p className="text-2xl sm:text-3xl font-bold text-[#4A3F35] break-words leading-relaxed">
                            {currentCard.definition}
                          </p>
                        </div>

                        <div className="text-center text-xs font-semibold text-[#8C7E72]">
                          👆 Chạm lần nữa để quay lại mặt từ vựng
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nút điều hướng & Đánh dấu Đã thuộc / Chưa thuộc */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    onClick={handlePrev}
                    className="cute-btn-soft bg-white py-3 rounded-2xl font-bold text-sm text-[#4A3F35] flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Thẻ trước</span>
                  </button>

                  <button
                    onClick={() => toggleLearned(currentCard, false)}
                    className={`cute-btn py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 ${
                      !currentCard.is_learned
                        ? "bg-[#FFE599] text-[#4A3F35]"
                        : "bg-white text-[#4A3F35]"
                    }`}
                  >
                    <span>🐣 Cần ôn lại</span>
                  </button>

                  <button
                    onClick={() => toggleLearned(currentCard, true)}
                    className={`cute-btn py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-1.5 ${
                      currentCard.is_learned
                        ? "bg-[#A8E6CF] text-[#4A3F35]"
                        : "bg-[#E6FAF2] text-[#4A3F35]"
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>🌸 Đã thuộc</span>
                  </button>

                  <button
                    onClick={handleNext}
                    className="cute-btn-soft bg-white py-3 rounded-2xl font-bold text-sm text-[#4A3F35] flex items-center justify-center gap-1.5"
                  >
                    <span>Thẻ tiếp</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= TAB 2: THÊM TỪ THỦ CÔNG & IMPORT CSV/EXCEL ================= */
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CỘT 1: Nhập tay từng từ */}
              <div className="cute-card rounded-3xl p-6">
                <h2 className="text-lg font-bold text-[#4A3F35] flex items-center gap-2 mb-1">
                  <span>✍️ Thêm từ vựng thủ công</span>
                </h2>
                <p className="text-xs text-[#8C7E72] font-medium mb-4">
                  Nhập từng cặp Từ vựng - Nghĩa rồi nhấn Enter hoặc nút Thêm nha.
                </p>

                <form onSubmit={handleAddSingleCard} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                      Từ vựng (Cột 1) *
                    </label>
                    <input
                      type="text"
                      required
                      value={termInput}
                      onChange={(e) => setTermInput(e.target.value)}
                      placeholder="VD: Serendipity"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#4A3F35] mb-1">
                      Nghĩa của từ (Cột 2) *
                    </label>
                    <input
                      type="text"
                      required
                      value={defInput}
                      onChange={(e) => setDefInput(e.target.value)}
                      placeholder="VD: Sự tình cờ may mắn"
                      className="w-full px-4 py-2.5 rounded-2xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-sm font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingManual}
                    className="w-full cute-btn bg-[#FF9EAA] hover:bg-[#FF8DA0] py-3 rounded-2xl font-bold text-sm text-[#4A3F35] flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>
                      {addingManual ? "Đang lưu..." : "Thêm vào bộ thẻ ✨"}
                    </span>
                  </button>
                </form>
              </div>

              {/* CỘT 2: Upload file CSV hoặc Excel 2 cột */}
              <div className="cute-card rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="text-lg font-bold text-[#4A3F35] flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-[#3B9B74]" />
                      <span>Tải file CSV / Excel (2 cột)</span>
                    </h2>
                    <button
                      type="button"
                      onClick={downloadSampleCsv}
                      className="text-xs font-bold text-[#3B9B74] hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải file mẫu</span>
                    </button>
                  </div>
                  <p className="text-xs text-[#8C7E72] font-medium mb-4">
                    Hỗ trợ <code>.csv</code>, <code>.xlsx</code>,{" "}
                    <code>.xls</code> gồm 2 cột: <b>Cột A (Từ vựng)</b> và{" "}
                    <b>Cột B (Nghĩa)</b>.
                  </p>

                  <label className="block border-2 border-dashed border-[#FF9EAA] bg-[#FFF5F7] hover:bg-[#FFEBF0] transition-colors rounded-2xl p-6 text-center cursor-pointer">
                    <Upload className="w-8 h-8 text-[#FF8093] mx-auto mb-2" />
                    <span className="block text-sm font-bold text-[#4A3F35]">
                      Bấm để chọn file CSV hoặc Excel
                    </span>
                    <span className="block text-xs text-[#8C7E72] mt-1">
                      Tự động đọc toàn bộ từ vựng trong 1 nốt nhạc 🐣
                    </span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {uploadMessage && (
                    <div className="mt-3 p-3 rounded-2xl bg-[#F0FBF6] border border-[#A8E6CF] text-xs font-bold text-[#225C43]">
                      {uploadMessage}
                    </div>
                  )}
                </div>

                {/* Bảng xem trước (Preview) khi vừa chọn file */}
                {previewRows.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#F0E4D7]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#4A3F35]">
                        🔍 Đọc được <b>{previewRows.length}</b> từ từ file{" "}
                        <code>{fileName}</code>:
                      </span>
                      <button
                        onClick={() => setPreviewRows([])}
                        className="text-xs font-bold text-[#D9534F]"
                      >
                        Hủy
                      </button>
                    </div>

                    <div className="max-h-36 overflow-y-auto rounded-xl border border-[#E6D7C3] bg-[#FFFDF9] p-2 text-xs space-y-1 mb-3">
                      {previewRows.slice(0, 15).map((r, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between gap-2 py-1 px-2 rounded-lg bg-white border border-[#F2E6D8]"
                        >
                          <span className="font-bold text-[#4A3F35] truncate">
                            {r.term}
                          </span>
                          <span className="text-[#8C7E72] truncate">
                            {r.definition}
                          </span>
                        </div>
                      ))}
                      {previewRows.length > 15 && (
                        <div className="text-center text-[#8C7E72] py-1 font-semibold">
                          ... và {previewRows.length - 15} từ khác nữa
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleConfirmImport}
                      disabled={importingFile}
                      className="w-full cute-btn bg-[#A8E6CF] hover:bg-[#93DFC2] py-2.5 rounded-2xl font-bold text-sm text-[#4A3F35]"
                    >
                      {importingFile
                        ? "Đang nhập vào bộ thẻ..."
                        : `Lưu tất cả ${previewRows.length} từ vào bộ thẻ 🌸`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* DANH SÁCH TỪ VỰNG TRONG BỘ THẺ */}
            <div className="cute-card rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-bold text-[#4A3F35]">
                  📋 Danh sách từ vựng trong bộ ({cards.length} từ)
                </h3>

                {cards.length > 0 && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-[#8C7E72] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm từ hoặc nghĩa..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FFFDF9] border-2 border-[#E6D7C3] focus:border-[#FF9EAA] focus:outline-none text-xs font-semibold"
                    />
                  </div>
                )}
              </div>

              {cards.length === 0 ? (
                <p className="text-center py-8 text-sm text-[#8C7E72] font-medium">
                  Chưa có từ nào trong bộ thẻ. Hãy nhập ở form bên trên nha! 🌱
                </p>
              ) : (
                <div className="divide-y divide-[#F2E6D8]">
                  {filteredManageCards.map((c, idx) => (
                    <div
                      key={c.id}
                      className="py-3 flex items-center justify-between gap-4 hover:bg-[#FFFDF9] px-2 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-xs font-bold text-[#8C7E72] w-6 shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 flex-1 min-w-0">
                          <div className="font-bold text-sm text-[#4A3F35] flex items-center gap-1.5">
                            <span className="truncate">{c.term}</span>
                            <button
                              type="button"
                              onClick={() => speakTerm(c.term)}
                              className="text-[#8C7E72] hover:text-[#FF8093] shrink-0"
                              title="Nghe phát âm"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-sm font-medium text-[#8C7E72] truncate">
                            {c.definition}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            c.is_learned
                              ? "bg-[#C9F5E1] text-[#225C43]"
                              : "bg-[#FAF3EB] text-[#8C7E72]"
                          }`}
                        >
                          {c.is_learned ? "🌸 Đã thuộc" : "🐣 Đang học"}
                        </span>
                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="p-1.5 rounded-xl text-[#8C7E72] hover:text-[#D9534F] hover:bg-[#FFF0F3]"
                          title="Xóa từ này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
