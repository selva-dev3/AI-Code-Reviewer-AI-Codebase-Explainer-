'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Code2, Database, Menu, X, Terminal, LogOut, BarChart3, Settings } from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'AI Reviewer', href: '/review', icon: Code2 },
    { name: 'Codebase Explainer', href: '/explain', icon: Database },
    { name: 'Workspace Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'System Settings', href: '/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    // Clear demo mode cookie
    document.cookie = "demo-auth-active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    
    try {
      await fetch('/api/auth/logout/', {
        method: 'POST',
      });
    } catch (e) {
      // ignore
    }
    
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 w-64 bg-slate-900/80 border-r border-slate-850/60 backdrop-blur-xl flex flex-col z-50 transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
              <Terminal size={20} className="animate-pulse" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-slate-100 to-indigo-300 bg-clip-text text-transparent">
              AI Code Reviewer
            </span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? 'bg-slate-800 text-indigo-400 shadow-[inset_4px_0_0_#6366f1]' 
                    : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} className={isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-300'} />
                <span>{item.name}</span>
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#6366f1]" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800/60 text-xs text-slate-500 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 animate-pulse" />
            <span>Workspace Context: Local</span>
          </div>
          <div>v1.0.0 (Tailwind & 3D)</div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col lg:pl-64">
        <header className="h-16 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-450 hover:bg-slate-800 lg:hidden transition-colors"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle Menu"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h1 className="font-bold text-base text-slate-100 tracking-tight">
              {menuItems.find(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))?.name || 'Dashboard'}
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 border border-slate-800/60 rounded-full text-xs font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span>Demo Mode Active</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white rounded-full text-xs font-semibold transition-colors"
            >
              <LogOut size={12} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
