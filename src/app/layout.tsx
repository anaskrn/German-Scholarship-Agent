import type { Metadata } from "next";
import { Geist, Noto_Sans_SC, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit-display", subsets: ["latin"] });
// Geist has no CJK glyphs; Noto Sans SC is only downloaded when Chinese text is on screen.
const notoSc = Noto_Sans_SC({ variable: "--font-noto-sc", weight: ["400", "500", "600"], preload: false });

export const metadata: Metadata = {
  title: "ScholarPath",
  description: "Find the scholarship that actually fits you, and write the application.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${outfit.variable} ${notoSc.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
