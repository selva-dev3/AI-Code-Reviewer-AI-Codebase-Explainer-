import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Code Reviewer & Codebase Explainer",
  description: "Next-generation AI assistant for code reviews and Retrieval-Augmented Generation codebase queries.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-slate-950">
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased relative">
        {/* Floating Ambient Glowing Auras */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/8 blur-[120px] animate-glow-drift" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-500/8 blur-[120px] animate-glow-drift" style={{ animationDelay: '-5s' }} />
        </div>
        
        {/* Root content layer */}
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
