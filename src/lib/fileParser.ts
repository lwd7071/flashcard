import * as XLSX from "xlsx";

export interface ParsedCardRow {
  term: string;
  definition: string;
}

// Danh sách từ khóa tiêu đề thường gặp ở dòng 1 để tự động bỏ qua
const HEADER_KEYWORDS_COL1 = ["từ", "tu", "từ vựng", "tu vung", "term", "word", "vocabulary", "vocab", "front"];
const HEADER_KEYWORDS_COL2 = ["nghĩa", "nghia", "ý nghĩa", "meaning", "definition", "back", "translation"];

/**
 * Đọc file CSV hoặc Excel (.csv, .xlsx, .xls) có 2 cột: Cột 1 (Từ) - Cột 2 (Nghĩa)
 */
export async function parseFlashcardFile(file: File): Promise<ParsedCardRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array", codepage: 65001 });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const worksheet = workbook.Sheets[firstSheetName];
  // Đọc dữ liệu dưới dạng mảng 2 chiều (mỗi dòng là 1 mảng các cột)
  const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, {
    header: 1,
    defval: "",
  });

  const parsedCards: ParsedCardRow[] = [];

  rows.forEach((row, index) => {
    if (!row || row.length < 2) return;

    const col1 = String(row[0] ?? "").trim();
    const col2 = String(row[1] ?? "").trim();

    // Bỏ qua dòng trống
    if (!col1 || !col2) return;

    // Kiểm tra nếu dòng đầu tiên là dòng tiêu đề (VD: "Từ vựng | Nghĩa") thì bỏ qua
    if (index === 0) {
      const lower1 = col1.toLowerCase();
      const lower2 = col2.toLowerCase();
      if (
        HEADER_KEYWORDS_COL1.includes(lower1) ||
        HEADER_KEYWORDS_COL2.includes(lower2)
      ) {
        return;
      }
    }

    parsedCards.push({
      term: col1,
      definition: col2,
    });
  });

  return parsedCards;
}

/**
 * Tạo và tải xuống file CSV mẫu 2 cột có BOM UTF-8 (hiển thị đúng tiếng Việt trong Excel)
 */
export function downloadSampleCsv() {
  const csvContent =
    "\uFEFFTừ vựng,Nghĩa\n" +
    "Serendipity,Sự tình cờ may mắn\n" +
    "Resilient,Kiên cường / Bền bỉ\n" +
    "Cozy,Ấm cúng, dễ chịu\n" +
    "Adorable,Đáng yêu, dễ thương\n" +
    "Fluent,Lưu loát, trôi chảy\n";

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "mau_tu_vung_mimocard.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
