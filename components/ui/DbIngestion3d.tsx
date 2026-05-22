'use client';

import React from 'react';
import { Database, FileCode, Check } from 'lucide-react';

interface DbIngestion3dProps {
  status: 'idle' | 'indexing' | 'success';
  filesCount: number;
}

export default function DbIngestion3d({ status, filesCount }: DbIngestion3dProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 glass-panel-tailwind rounded-xl border border-slate-800 bg-slate-900/40 relative overflow-hidden min-h-[300px]">
      
      {/* Tech Grid Background */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(var(--color-indigo-500) 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      />

      {status === 'indexing' && (
        <div className="relative w-48 h-48 flex items-center justify-center perspective-1000 preserve-3d">
          
          {/* Glowing Backlight */}
          <div className="absolute w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />

          {/* 3D Cylinder Stack (spinning rings) */}
          <div className="absolute w-28 h-32 flex flex-col justify-between items-center preserve-3d animate-cylinder-spin">
            
            {/* Top Ring */}
            <div className="w-24 h-6 border-2 border-indigo-400 rounded-[50%] shadow-[0_0_15px_rgba(129,140,248,0.5)] bg-slate-900/80" />
            
            {/* Middle Ring */}
            <div className="w-24 h-6 border-2 border-indigo-500 rounded-[50%] shadow-[0_0_15px_rgba(99,102,241,0.5)] bg-slate-900/80" />
            
            {/* Bottom Ring */}
            <div className="w-24 h-6 border-2 border-violet-500 rounded-[50%] shadow-[0_0_15px_rgba(139,92,246,0.5)] bg-slate-900/80" />
          </div>

          {/* Vertical connecting pillars */}
          <div className="absolute w-24 h-28 border-l border-r border-indigo-500/30 pointer-events-none" />

          {/* Falling file cubes */}
          <div className="absolute flex flex-col items-center gap-2 animate-bounce duration-1000" style={{ transform: 'translateY(-60px)' }}>
            <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg border border-indigo-300/30">
              <FileCode size={16} className="text-white animate-pulse" />
            </div>
            <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-transparent animate-pulse" />
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center gap-4 animate-float">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Check size={32} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <h4 className="text-lg font-bold text-slate-100">Index Built Successfully</h4>
            <p className="text-xs text-slate-400 mt-1">Ingested {filesCount} files into pgvector storage</p>
          </div>
        </div>
      )}

      {status === 'idle' && (
        <div className="flex flex-col items-center gap-4 text-center text-slate-400">
          <div className="p-4 bg-slate-800/40 rounded-full border border-slate-700">
            <Database size={32} className="text-slate-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-200">Database Offline</h4>
            <p className="text-xs max-w-[240px] mt-1">Ready to create dynamic RAG embeds when files are supplied.</p>
          </div>
        </div>
      )}

      {status === 'indexing' && (
        <div className="mt-6 text-center z-10">
          <h4 className="text-sm font-bold text-indigo-400 tracking-wider uppercase animate-pulse">Vector Index Ingest</h4>
          <p className="text-xs text-slate-400 mt-1">Splitting source code, embedding tokens and writing vectors...</p>
        </div>
      )}
    </div>
  );
}
