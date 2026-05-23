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
    <html lang="en" className="h-full" style={{ backgroundColor: '#030712' }}>
      <body className="min-h-full text-slate-100 antialiased relative" style={{ backgroundColor: '#030712' }}>
        {/* Aurora Ambient Mesh — 3 color orbs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {/* Cyan blob — top-left */}
          <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full bg-cyan-500/[0.07] blur-[140px] animate-aurora-shift" />
          {/* Magenta blob — bottom-right */}
          <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-500/[0.06] blur-[140px] animate-aurora-shift" style={{ animationDelay: '-3s' }} />
          {/* Amber blob — center */}
          <div className="absolute top-[40%] right-[20%] w-[35%] h-[35%] rounded-full bg-amber-500/[0.04] blur-[120px] animate-aurora-shift" style={{ animationDelay: '-6s' }} />
        </div>
        
        {/* Root content layer */}
        <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
      </body>
    </html>
  );
}
