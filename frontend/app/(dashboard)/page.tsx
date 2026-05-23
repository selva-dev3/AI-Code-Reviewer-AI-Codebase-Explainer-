'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Bug, ShieldAlert, Code2, Database, BarChart2 } from 'lucide-react';
import Tilt3d from '@/components/ui/Tilt3d';

interface DashboardStats {
  total_reviews: number;
  critical_bugs: number;
  codebase_projects: number;
  quality_index: string;
}

interface RecentReview {
  id: string;
  name: string;
  date: string;
  language: string;
  issues: number;
}

interface DashboardData {
  stats: DashboardStats;
  recent_reviews: RecentReview[];
}

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error('Failed to fetch dashboard data');
        const json: DashboardData = await res.json();
        setData(json);
      } catch (err: any) {
        console.error('Dashboard fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const stats = [
    {
      name: 'Total Code Reviews',
      value: loading ? '—' : String(data?.stats.total_reviews ?? 0),
      icon: Code2,
      color: 'text-cyan-400',
      glowColor: 'rgba(6,182,212,0.15)',
    },
    {
      name: 'Critical Bugs Found',
      value: loading ? '—' : String(data?.stats.critical_bugs ?? 0),
      icon: ShieldAlert,
      color: 'text-rose-400',
      glowColor: 'rgba(244,63,94,0.15)',
    },
    {
      name: 'Codebase Projects',
      value: loading ? '—' : String(data?.stats.codebase_projects ?? 0),
      icon: Database,
      color: 'text-fuchsia-400',
      glowColor: 'rgba(217,70,239,0.15)',
    },
    {
      name: 'Quality Index',
      value: loading ? '—' : (data?.stats.quality_index ?? 'N/A'),
      icon: BarChart2,
      color: 'text-amber-400',
      glowColor: 'rgba(245,158,11,0.15)',
    },
  ];

  const recentReviews = data?.recent_reviews ?? [];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner — Aurora Gradient Mesh */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 lg:p-12 shadow-xl rainbow-rim"
        style={{
          background:
            'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.08) 40%, rgba(217,70,239,0.06) 70%, transparent 100%)',
          border: '1px solid rgba(6,182,212,0.12)',
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(6,182,212,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.15) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mb-4">
            Next-Gen AI Code Workspace
          </h2>
          <p className="text-slate-300 text-sm lg:text-base leading-relaxed mb-8">
            Perform granular inline source reviews with streamed Claude analysis, or index
            code repositories into a fast vector search context to query questions in RAG.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/review"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 shimmer-btn shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_30px_rgba(6,182,212,0.4)]"
            >
              <span>New Code Review</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/explain"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-slate-200 transition-all hover:text-white"
              style={{
                background: 'rgba(10, 15, 30, 0.7)',
                border: '1px solid rgba(6, 182, 212, 0.12)',
              }}
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
              <div
                className="h-full rounded-xl backdrop-blur-md p-6 flex flex-col justify-between min-h-[140px]"
                style={{
                  background: 'rgba(10, 15, 30, 0.5)',
                  border: '1px solid rgba(6, 182, 212, 0.08)',
                }}
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {stat.name}
                  </span>
                  <div
                    className={`p-2 rounded-lg ${stat.color}`}
                    style={{ background: stat.glowColor }}
                  >
                    <Icon size={18} />
                  </div>
                </div>
                <div className={`text-3xl font-bold tracking-tight mt-4 text-slate-100 ${loading ? 'animate-pulse' : ''}`}>
                  {stat.value}
                </div>
              </div>
            </Tilt3d>
          );
        })}
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activities */}
        <div
          className="lg:col-span-3 rounded-xl backdrop-blur-md p-6"
          style={{
            background: 'rgba(10, 15, 30, 0.5)',
            border: '1px solid rgba(6, 182, 212, 0.08)',
          }}
        >
          <h3 className="text-lg font-bold text-slate-200 mb-6">Recent Code Reviews</h3>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-xl animate-pulse"
                  style={{ background: 'rgba(3, 7, 18, 0.5)' }}
                />
              ))}
            </div>
          ) : recentReviews.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Code2 size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reviews yet. Start your first code review!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between p-4 rounded-xl transition-all group"
                  style={{
                    background: 'rgba(3, 7, 18, 0.5)',
                    border: '1px solid rgba(6, 182, 212, 0.06)',
                  }}
                >
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-cyan-400 transition-colors">
                      {review.name}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span
                        className="px-2 py-0.5 rounded font-mono"
                        style={{
                          background: 'rgba(10, 15, 30, 0.8)',
                          border: '1px solid rgba(6, 182, 212, 0.08)',
                        }}
                      >
                        {review.language}
                      </span>
                      <span>•</span>
                      <span>{review.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {review.issues > 0 ? (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                        <Bug size={14} />
                        <span>
                          {review.issues} bug{review.issues > 1 ? 's' : ''}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-bold text-emerald-400">Clean</span>
                    )}
                    <Link
                      href="/review"
                      className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors"
                      style={{
                        background: 'rgba(10, 15, 30, 0.6)',
                        border: '1px solid rgba(6, 182, 212, 0.08)',
                      }}
                    >
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System Architecture */}
        <div
          className="lg:col-span-2 rounded-xl backdrop-blur-md p-6 flex flex-col justify-between"
          style={{
            background: 'rgba(10, 15, 30, 0.5)',
            border: '1px solid rgba(6, 182, 212, 0.08)',
          }}
        >
          <div>
            <h3 className="text-lg font-bold text-slate-200 mb-6">Pipeline Specs</h3>
            <ul className="space-y-4">
              <li className="flex gap-3 items-start text-sm">
                <div className="mt-0.5 text-cyan-400 font-bold">✓</div>
                <div>
                  <strong className="text-slate-200">Neon PostgreSQL</strong>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Database storage layer, user sessions, RLS policies and migrations.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 items-start text-sm">
                <div className="mt-0.5 text-fuchsia-400 font-bold">✓</div>
                <div>
                  <strong className="text-slate-200">Kimi Moonshot API</strong>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Dual system prompt workflows streaming JSON review objects and chat
                    answer blocks.
                  </p>
                </div>
              </li>
              <li className="flex gap-3 items-start text-sm">
                <div className="mt-0.5 text-amber-400 font-bold">✓</div>
                <div>
                  <strong className="text-slate-200">OpenAI Embeddings + Cosine Search</strong>
                  <p className="text-xs text-slate-400 mt-0.5">
                    text-embedding-3-small vectors with in-memory cosine similarity
                    match for RAG context.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div
            className="mt-6 pt-4 text-center"
            style={{ borderTop: '1px solid rgba(6, 182, 212, 0.06)' }}
          >
            <span className="text-xs font-semibold tracking-wider uppercase aurora-text">
              Strict Types Compliant
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
