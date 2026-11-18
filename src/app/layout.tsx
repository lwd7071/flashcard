import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MimoCard 🐣 - Sổ tay Flashcard học từ vựng",
  description: "Web học từ vựng bằng Flashcard nhẹ nhàng, dễ thương, hỗ trợ nhập file CSV và Excel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${quicksand.className} antialiased selection:bg-[#FFD6E0] selection:text-[#4A3F35]`}>
        {children}
      </body>
    </html>
  );
}
