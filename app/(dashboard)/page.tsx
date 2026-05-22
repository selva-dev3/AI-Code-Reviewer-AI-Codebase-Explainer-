import React from 'react';
import Link from 'next/link';
import { ArrowRight, Bug, ShieldAlert, Code2, Database, BarChart2 } from 'lucide-react';
import Tilt3d from '@/components/ui/Tilt3d';

export default async function DashboardHome() {
  const stats = [
    { name: 'Total Code Reviews', value: '14', icon: Code2, color: 'text-indigo-400', glow: 'shadow-indigo-500/10' },
    { name: 'Critical Bugs Found', value: '3', icon: ShieldAlert, color: 'text-rose-400', glow: 'shadow-rose-500/10' },
    { name: 'Codebase Projects', value: '2', icon: Database, color: 'text-violet-400', glow: 'shadow-violet-500/10' },
    { name: 'Quality Index', value: 'A-', icon: BarChart2, color: 'text-amber-400', glow: 'shadow-amber-500/10' },
  ];

  const recentReviews = [
    { id: '1', name: 'Authentication middleware validation fix', date: '2 hours ago', language: 'TypeScript', issues: 3 },
    { id: '2', name: 'Database pool connection leak patch', date: '1 day ago', language: 'Go', issues: 1 },
    { id: '3', name: 'CSS mobile layout styling fix', date: '3 days ago', language: 'CSS', issues: 0 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent p-8 lg:p-12 shadow-xl">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-4">
            Next-Gen AI Code Workspace
          </h2>
          <p className="text-slate-355 text-sm lg:text-base leading-relaxed text-slate-300 mb-8">
            Perform granular inline source reviews with streamed Claude analysis, or index code repositories into a fast vector search context to query questions in RAG.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link 
              href="/review" 
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-indigo-650 hover:bg-indigo-600 font-semibold text-white transition-all shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transform hover:-translate-y-0.5 bg-indigo-600"
            >
              <span>New Code Review</span>
              <ArrowRight size={16} />
            </Link>
            <Link 
              href="/explain" 
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 font-semibold text-slate-200 transition-all"
            >
              <span>Query Codebase</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3D Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Tilt3d key={stat.name} className="h-full">
              <div className="h-full rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.name}</span>
                  <div className={`p-2 rounded-lg bg-slate-850/80 ${stat.color}`}>
                    <Icon size={18} />
                  </div>
                </div>
                <div className="text-3xl font-bold tracking-tight mt-4 text-slate-100">{stat.value}</div>
              </div>
            </Tilt3d>
          );
        })}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-3 rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Recent Code Reviews</h3>
          <div className="space-y-4">
            {recentReviews.map((review) => (
              <div 
                key={review.id}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-800/50 bg-slate-950/40 hover:border-slate-750/70 transition-all group"
              >
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-indigo-400 transition-colors">
                    {review.name}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono">{review.language}</span>
                    <span>•</span>
                    <span>{review.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {review.issues > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                      <Bug size={14} />
                      <span>{review.issues} bug{review.issues > 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-emerald-400">Clean</span>
                  )}
                  <Link 
                    href={`/review`} 
                    className="p-2 rounded-lg bg-slate-905 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Architecture */}
        <div className="lg:col-span-2 rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-200 mb-6">Pipeline Specs</h3>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start text-sm">
                <div className="mt-0.5 text-indigo-400 font-bold">✓</div>
                <div>
                  <strong className="text-slate-200">Supabase (PostgreSQL)</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Database storage layer, user sessions refresh, storage paths, RLS policies.</p>
                </div>
              </li>
              <li className="flex gap-3 items-start text-sm">
                <div className="mt-0.5 text-indigo-400 font-bold">✓</div>
                <div>
                  <strong className="text-slate-200">Claude-Sonnet-4-6 API</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Dual system prompt workflows streaming JSON review objects and chat answer blocks.</p>
                </div>
              </li>
              <li className="flex gap-3 items-start text-sm">
                <div className="mt-0.5 text-indigo-400 font-bold">✓</div>
                <div>
                  <strong className="text-slate-200">pgvector ANN Indexing</strong>
                  <p className="text-xs text-slate-400 mt-0.5">Cosine similarity metrics via custom match_code_chunks database RPC function.</p>
                </div>
              </li>
            </ul>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-800/40 text-center">
            <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Strict Types Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
