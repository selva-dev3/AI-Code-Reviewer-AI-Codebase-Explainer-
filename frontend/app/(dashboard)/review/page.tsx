'use client';

import React, { useState, useEffect } from 'react';
import { useReview } from '@/hooks/useReview';
import { Bug, Sparkles, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, ArrowRight, Play } from 'lucide-react';
import confetti from 'canvas-confetti';
import LaserScanner from '@/components/ui/LaserScanner';

const LANGUAGES = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'go', label: 'Go' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
];

export default function ReviewPage() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [expandedFixes, setExpandedFixes] = useState<Record<number, boolean>>({});
  const { isLoading, reviews, error, startReview } = useReview();
  const [hasReviewed, setHasReviewed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setHasReviewed(true);
    await startReview(code, language);
  };

  useEffect(() => {
    if (hasReviewed && !isLoading && !error && reviews.length > 0) {
      const hasCritical = reviews.some(r => r.severity === 'critical');
      if (!hasCritical) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#06b6d4', '#d946ef', '#8b5cf6', '#f59e0b']
        });
      }
    }
  }, [isLoading, reviews, error, hasReviewed]);

  const toggleFix = (index: number) => {
    setExpandedFixes(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const criticalCount = reviews.filter(r => r.severity === 'critical').length;
  const majorCount = reviews.filter(r => r.severity === 'major').length;
  const minorCount = reviews.filter(r => r.severity === 'minor').length;
  const styleCount = reviews.filter(r => r.type === 'style').length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-slate-400 text-sm">
          Paste your code, select the source language, and execute the audit. Claude Sonnet scans line by line.
        </p>
      </div>

      {!hasReviewed || error ? (
        <form onSubmit={handleSubmit} className="rounded-xl backdrop-blur-md p-6 space-y-6"
          style={{
            background: 'rgba(10, 15, 30, 0.5)',
            border: '1px solid rgba(6, 182, 212, 0.08)',
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <label className="text-sm font-semibold text-slate-200">Source Editor</label>
            <select 
              className="text-slate-200 text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer transition-colors"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                background: 'rgba(3, 7, 18, 0.8)',
                border: '1px solid rgba(6, 182, 212, 0.1)',
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(6, 182, 212, 0.08)' }}>
            <textarea
              className="w-full min-h-[350px] p-6 text-slate-100 font-mono text-xs leading-relaxed outline-none resize-y"
              placeholder="// Paste your source code code block here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ background: 'rgba(3, 7, 18, 0.8)' }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm p-3 rounded-lg"
              style={{
                background: 'rgba(244, 63, 94, 0.06)',
                border: '1px solid rgba(244, 63, 94, 0.15)',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5 shimmer-btn shadow-[0_4px_15px_rgba(6,182,212,0.2)]"
            disabled={isLoading || !code.trim()}
          >
            <Sparkles size={16} className="animate-pulse" />
            <span>Perform Audit</span>
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Editor Side */}
          <div className="lg:col-span-3 rounded-xl backdrop-blur-md flex flex-col relative overflow-hidden"
            style={{
              background: 'rgba(10, 15, 30, 0.5)',
              border: '1px solid rgba(6, 182, 212, 0.08)',
            }}
          >
            
            {/* Show Laser Scanner overlay if compiling/loading */}
            {isLoading && <LaserScanner />}

            <div className="h-14 flex items-center justify-between px-6"
              style={{
                borderBottom: '1px solid rgba(6, 182, 212, 0.06)',
                background: 'rgba(3, 7, 18, 0.3)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Language:</span>
                <span className="text-xs font-bold text-slate-200 capitalize">{language}</span>
              </div>
              <button 
                className="px-3 py-1.5 rounded-lg text-xs text-slate-300 transition-colors hover:text-cyan-400"
                style={{
                  background: 'rgba(3, 7, 18, 0.8)',
                  border: '1px solid rgba(6, 182, 212, 0.08)',
                }}
                onClick={() => setHasReviewed(false)}
              >
                Reset Code
              </button>
            </div>

            <div className="flex min-h-[450px] relative" style={{ background: 'rgba(3, 7, 18, 0.9)' }}>
              {/* Line Numbers column */}
              <div className="w-12 border-r border-slate-900 text-right pr-3 select-none py-6 font-mono text-[10px] text-slate-600 leading-[22px]"
                style={{ background: 'rgba(3, 7, 18, 1)' }}
              >
                {code.split('\n').map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`transition-colors duration-200 ${
                      activeLine === idx + 1 ? 'text-cyan-400 font-bold' : ''
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>

              {/* Code lines */}
              <div className="flex-1 py-6 overflow-x-auto font-mono text-xs leading-[22px] text-slate-300">
                {code.split('\n').map((line, idx) => {
                  const lineNumber = idx + 1;
                  const isHighlighted = activeLine === lineNumber;
                  const lineReview = reviews.find(r => r.line === lineNumber);
                  
                  let lineBg = 'hover:bg-slate-900/30';
                  let borderLeft = 'border-l-2 border-transparent';
                  
                  if (isHighlighted) {
                    lineBg = 'bg-cyan-500/10';
                    borderLeft = 'border-l-2 border-cyan-500';
                  } else if (lineReview) {
                    if (lineReview.severity === 'critical') {
                      lineBg = 'bg-rose-500/5';
                      borderLeft = 'border-l-2 border-rose-500/60';
                    } else if (lineReview.severity === 'major') {
                      lineBg = 'bg-orange-500/5';
                      borderLeft = 'border-l-2 border-orange-500/60';
                    } else if (lineReview.severity === 'minor') {
                      lineBg = 'bg-amber-500/5';
                      borderLeft = 'border-l-2 border-amber-500/60';
                    }
                  }

                  return (
                    <div 
                      key={idx}
                      className={`px-4 whitespace-pre select-text transition-all duration-150 ${lineBg} ${borderLeft} cursor-pointer`}
                      onMouseEnter={() => { if (lineReview) setActiveLine(lineNumber); }}
                      onMouseLeave={() => { if (lineReview) setActiveLine(null); }}
                    >
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Results Side */}
          <div className="lg:col-span-2 rounded-xl backdrop-blur-md p-6 max-h-[700px] overflow-y-auto"
            style={{
              background: 'rgba(10, 15, 30, 0.5)',
              border: '1px solid rgba(6, 182, 212, 0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-slate-200">Analysis Output</span>
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-cyan-400">
                  <div className="w-3 h-3 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                  <span>Auditing...</span>
                </div>
              )}
            </div>

            {/* Severity Cards */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="py-2.5 rounded-lg text-center" style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.15)' }}>
                <div className="text-rose-400 font-bold text-base">{criticalCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Critical</div>
              </div>
              <div className="py-2.5 rounded-lg text-center" style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)' }}>
                <div className="text-orange-400 font-bold text-base">{majorCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Major</div>
              </div>
              <div className="py-2.5 rounded-lg text-center" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="text-amber-400 font-bold text-base">{minorCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Minor</div>
              </div>
              <div className="py-2.5 rounded-lg text-center" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)' }}>
                <div className="text-cyan-400 font-bold text-base">{styleCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Style</div>
              </div>
            </div>

            {reviews.length === 0 && !isLoading ? (
              <div className="text-center py-12 text-slate-500 space-y-3">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                <p className="text-xs">No bugs identified. The snippet is clean!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((item, index) => {
                  const isHighlighted = activeLine === item.line;
                  let borderColor = 'rgba(6, 182, 212, 0.06)';
                  let bgColor = 'rgba(10, 15, 30, 0.3)';
                  let badgeClass = 'text-slate-300';
                  let badgeBg = 'rgba(30, 41, 59, 0.5)';
                  
                  if (item.severity === 'critical') {
                    borderColor = 'rgba(244, 63, 94, 0.15)';
                    bgColor = 'rgba(244, 63, 94, 0.04)';
                    badgeClass = 'text-rose-400';
                    badgeBg = 'rgba(244, 63, 94, 0.1)';
                  } else if (item.severity === 'major') {
                    borderColor = 'rgba(249, 115, 22, 0.15)';
                    bgColor = 'rgba(249, 115, 22, 0.04)';
                    badgeClass = 'text-orange-400';
                    badgeBg = 'rgba(249, 115, 22, 0.1)';
                  } else if (item.severity === 'minor') {
                    borderColor = 'rgba(245, 158, 11, 0.15)';
                    bgColor = 'rgba(245, 158, 11, 0.04)';
                    badgeClass = 'text-amber-400';
                    badgeBg = 'rgba(245, 158, 11, 0.1)';
                  }

                  return (
                    <div 
                      key={index}
                      className={`rounded-xl transition-all duration-200 overflow-hidden ${
                        isHighlighted ? 'ring-1 ring-cyan-500/50 scale-[1.01] shadow-[0_0_15px_rgba(6,182,212,0.1)]' : ''
                      }`}
                      style={{ background: bgColor, border: `1px solid ${borderColor}` }}
                      onMouseEnter={() => { if (item.line) setActiveLine(item.line); }}
                      onMouseLeave={() => { if (item.line) setActiveLine(null); }}
                    >
                      <div 
                        className="px-4 py-3 flex items-center justify-between cursor-pointer"
                        style={{ borderBottom: '1px solid rgba(6, 182, 212, 0.04)', background: 'rgba(3, 7, 18, 0.2)' }}
                        onClick={() => toggleFix(index)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${badgeClass}`}
                            style={{ background: badgeBg }}
                          >
                            {item.severity || item.type}
                          </span>
                          {item.line && (
                            <span className="text-[10px] font-semibold text-slate-500 font-mono">
                              Line {item.line}
                            </span>
                          )}
                        </div>
                        {item.fix && (
                          <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-semibold">
                            <span>{expandedFixes[index] ? 'Hide' : 'Fix'}</span>
                            {expandedFixes[index] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
                        
                        {item.fix && expandedFixes[index] && (
                          <div className="rounded-lg overflow-hidden font-mono text-[10px] shadow-inner animate-fade-in"
                            style={{
                              border: '1px solid rgba(6, 182, 212, 0.08)',
                              background: 'rgba(3, 7, 18, 0.8)',
                            }}
                          >
                            <div className="px-3 py-1.5 text-[9px] font-semibold text-slate-500"
                              style={{
                                background: 'rgba(10, 15, 30, 0.8)',
                                borderBottom: '1px solid rgba(6, 182, 212, 0.06)',
                              }}
                            >
                              Diff Comparison
                            </div>
                            <pre className="p-3 text-emerald-400 whitespace-pre-wrap leading-normal">
                              <code>{item.fix}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
