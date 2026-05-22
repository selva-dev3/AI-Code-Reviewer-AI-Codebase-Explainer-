'use client';

import React from 'react';
import Tilt3d from '@/components/ui/Tilt3d';
import { BarChart3, TrendingUp, ShieldAlert, Award, Clock, ArrowUpRight, Zap } from 'lucide-react';

export default function AnalyticsPage() {
  const codeScores = [
    { name: 'Security Health', score: 94, color: 'stroke-emerald-500', text: 'text-emerald-400' },
    { name: 'Maintainability', score: 88, color: 'stroke-indigo-500', text: 'text-indigo-400' },
    { name: 'Documentation', score: 82, color: 'stroke-violet-500', text: 'text-violet-400' },
    { name: 'Performance Index', score: 96, color: 'stroke-amber-500', text: 'text-amber-400' },
  ];

  const auditHistory = [
    { label: 'Mon', value: 4 },
    { label: 'Tue', value: 7 },
    { label: 'Wed', value: 12 },
    { label: 'Thu', value: 9 },
    { label: 'Fri', value: 18 },
    { label: 'Sat', value: 5 },
    { label: 'Sun', value: 8 },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="text-indigo-400" />
            <span>Workspace Analytics</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Aggregated audit quality statistics, vulnerability patterns, and AI efficiency tracking.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
            <span>Range: </span>
            <span className="font-semibold text-white">Last 7 Days</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Tilt3d>
          <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 h-full flex flex-col justify-between min-h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Average Code Score</span>
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Award size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-100 flex items-baseline gap-1">
                <span>91.5</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp size={12} /> +2.4%
                </span>
              </div>
            </div>
          </div>
        </Tilt3d>

        <Tilt3d>
          <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 h-full flex flex-col justify-between min-h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estimated Developer Hours Saved</span>
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-100">34 hrs</div>
            </div>
          </div>
        </Tilt3d>

        <Tilt3d>
          <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 h-full flex flex-col justify-between min-h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vulnerabilities Detected</span>
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-455 text-rose-450">
                <ShieldAlert size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-100">4 Critical</div>
            </div>
          </div>
        </Tilt3d>

        <Tilt3d>
          <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 h-full flex flex-col justify-between min-h-[130px]">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Queries Audited</span>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <Zap size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-bold text-slate-100">63 Scans</div>
            </div>
          </div>
        </Tilt3d>
      </div>

      {/* Analytics Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Weekly Activity (Animated CSS bars) */}
        <div className="lg:col-span-3 rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6">
          <h3 className="text-sm font-bold text-slate-200 mb-6">Scan Frequencies</h3>
          
          <div className="flex items-end justify-between h-[180px] pt-4 px-2">
            {auditHistory.map((item, idx) => {
              const heightPercent = `${(item.value / 20) * 100}%`;
              return (
                <div key={idx} className="flex flex-col items-center gap-2 w-1/8 h-full justify-end">
                  <div className="text-[10px] text-slate-400 font-mono font-semibold">{item.value}</div>
                  
                  {/* Animated Bar */}
                  <div className="w-8 bg-slate-950 border border-slate-850 rounded-lg relative overflow-hidden flex-1 flex flex-col justify-end">
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-650 via-indigo-500 to-violet-400 rounded-b-md transition-all duration-1000 ease-out delay-150 animate-pulse bg-indigo-600"
                      style={{ height: heightPercent }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Circular Progress (Average health categories) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-slate-200 mb-6">Quality Radar Breakdown</h3>
          <div className="grid grid-cols-2 gap-4">
            {codeScores.map((score, idx) => {
              const radius = 24;
              const circumference = 2 * Math.PI * radius;
              const strokeOffset = circumference - (score.score / 100) * circumference;

              return (
                <div key={idx} className="flex flex-col items-center p-3 rounded-xl bg-slate-950/40 border border-slate-850/30">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle 
                        cx="32" 
                        cy="32" 
                        r={radius} 
                        fill="transparent" 
                        stroke="#131b2e" 
                        strokeWidth="3.5" 
                      />
                      <circle 
                        cx="32" 
                        cy="32" 
                        r={radius} 
                        fill="transparent" 
                        className={`${score.color} transition-all duration-1000 ease-out`}
                        strokeWidth="3.5" 
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeOffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-slate-250 font-mono text-slate-200">{score.score}%</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-3">{score.name}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Critical Security Inferences */}
      <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-6">Security Inference Log</h3>
        
        <div className="space-y-4">
          <div className="flex items-start justify-between p-4 rounded-xl border border-rose-900/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors">
            <div className="flex gap-3">
              <ShieldAlert className="text-rose-455 mt-0.5 shrink-0 text-rose-450" size={16} />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Database Pool Connection Leak Detected</h4>
                <p className="text-[10px] text-slate-400 mt-1">Found in database.go: Line 45. Connections created are not defer-closed.</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-rose-455 px-2 py-0.5 rounded bg-rose-500/10 uppercase tracking-wider text-rose-450">Critical</span>
          </div>

          <div className="flex items-start justify-between p-4 rounded-xl border border-amber-900/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors">
            <div className="flex gap-3">
              <ShieldAlert className="text-amber-455 mt-0.5 shrink-0" size={16} />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Weak JWT Encryption Signing Algorithm</h4>
                <p className="text-[10px] text-slate-400 mt-1">Found in auth.ts: Line 112. Defaults to insecure header alg parsing.</p>
              </div>
            </div>
            <span className="text-[9px] font-bold text-amber-455 px-2 py-0.5 rounded bg-amber-500/10 uppercase tracking-wider">Minor</span>
          </div>
        </div>
      </div>

    </div>
  );
}
