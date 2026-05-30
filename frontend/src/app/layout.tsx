import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aetheria - AI Logistics Document Intelligence Infrastructure",
  description: "Enterprise-grade cognitive document ingestion, OCR layout recognition, operational validation, and semantic cargo intelligence platform.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark" suppressHydrationWarning>
      <body className="h-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
        <div className="absolute inset-0 bg-grid-overlay opacity-40 pointer-events-none z-0" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none z-0 neon-glow" />
        <div className="absolute bottom-10 right-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none z-0 neon-glow" />
        <main className="flex-1 flex flex-col min-h-screen z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
