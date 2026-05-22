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
          colors: ['#6366f1', '#8b5cf6', '#3b82f6']
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
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <label className="text-sm font-semibold text-slate-200">Source Editor</label>
            <select 
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-indigo-500 transition-colors"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map(lang => (
                <option key={lang.value} value={lang.value}>{lang.label}</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-800/80 rounded-xl overflow-hidden bg-slate-955/80">
            <textarea
              className="w-full min-h-[350px] p-6 bg-slate-950/80 text-slate-100 font-mono text-xs leading-relaxed outline-none resize-y"
              placeholder="// Paste your source code code block here..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-455 text-sm bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-550 text-white font-semibold text-sm transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
            disabled={isLoading || !code.trim()}
          >
            <Sparkles size={16} className="animate-pulse" />
            <span>Perform Audit</span>
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
          {/* Editor Side */}
          <div className="lg:col-span-3 rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md flex flex-col relative overflow-hidden">
            
            {/* Show Laser Scanner overlay if compiling/loading */}
            {isLoading && <LaserScanner />}

            <div className="h-14 border-b border-slate-800/60 flex items-center justify-between px-6 bg-slate-950/30">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Language:</span>
                <span className="text-xs font-bold text-slate-200 capitalize">{language}</span>
              </div>
              <button 
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs hover:bg-slate-850 text-slate-300 transition-colors"
                onClick={() => setHasReviewed(false)}
              >
                Reset Code
              </button>
            </div>

            <div className="flex bg-slate-950/90 min-h-[450px] relative">
              {/* Line Numbers column */}
              <div className="w-12 bg-slate-950 border-r border-slate-900 text-right pr-3 select-none py-6 font-mono text-[10px] text-slate-600 leading-[22px]">
                {code.split('\n').map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`transition-colors duration-200 ${
                      activeLine === idx + 1 ? 'text-indigo-400 font-bold' : ''
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
                    lineBg = 'bg-indigo-500/10';
                    borderLeft = 'border-l-2 border-indigo-500';
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
          <div className="lg:col-span-2 rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 max-h-[700px] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <span className="font-bold text-slate-200">Analysis Output</span>
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-indigo-400">
                  <div className="w-3 h-3 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin" />
                  <span>Auditing...</span>
                </div>
              )}
            </div>

            {/* Severity Cards */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="bg-rose-500/5 border border-rose-500/20 py-2.5 rounded-lg text-center">
                <div className="text-rose-455 font-bold text-base text-rose-400">{criticalCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Critical</div>
              </div>
              <div className="bg-orange-500/5 border border-orange-500/20 py-2.5 rounded-lg text-center">
                <div className="text-orange-455 font-bold text-base text-orange-400">{majorCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Major</div>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 py-2.5 rounded-lg text-center">
                <div className="text-amber-455 font-bold text-base text-amber-400">{minorCount}</div>
                <div className="text-[10px] text-slate-400 font-medium">Minor</div>
              </div>
              <div className="bg-blue-500/5 border border-blue-500/20 py-2.5 rounded-lg text-center">
                <div className="text-blue-455 font-bold text-base text-blue-400">{styleCount}</div>
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
                  let borderClass = 'border-slate-800';
                  let bgClass = 'bg-slate-900/30';
                  let badgeClass = 'bg-slate-800 text-slate-300';
                  
                  if (item.severity === 'critical') {
                    borderClass = 'border-rose-900/30';
                    bgClass = 'bg-rose-500/5';
                    badgeClass = 'bg-rose-500/10 text-rose-455 text-rose-400';
                  } else if (item.severity === 'major') {
                    borderClass = 'border-orange-900/30';
                    bgClass = 'bg-orange-500/5';
                    badgeClass = 'bg-orange-500/10 text-orange-455 text-orange-400';
                  } else if (item.severity === 'minor') {
                    borderClass = 'border-amber-900/30';
                    bgClass = 'bg-amber-500/5';
                    badgeClass = 'bg-amber-500/10 text-amber-455 text-amber-400';
                  }

                  return (
                    <div 
                      key={index}
                      className={`rounded-xl border ${borderClass} ${bgClass} transition-all duration-200 overflow-hidden ${
                        isHighlighted ? 'ring-1 ring-indigo-500/50 scale-[1.01] shadow-[0_0_15px_rgba(99,102,241,0.1)]' : ''
                      }`}
                      onMouseEnter={() => { if (item.line) setActiveLine(item.line); }}
                      onMouseLeave={() => { if (item.line) setActiveLine(null); }}
                    >
                      <div 
                        className="px-4 py-3 flex items-center justify-between cursor-pointer border-b border-slate-850/50 bg-slate-950/20"
                        onClick={() => toggleFix(index)}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${badgeClass}`}>
                            {item.severity || item.type}
                          </span>
                          {item.line && (
                            <span className="text-[10px] font-semibold text-slate-500 font-mono">
                              Line {item.line}
                            </span>
                          )}
                        </div>
                        {item.fix && (
                          <div className="flex items-center gap-1 text-[10px] text-indigo-400 font-semibold">
                            <span>{expandedFixes[index] ? 'Hide' : 'Fix'}</span>
                            {expandedFixes[index] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <p className="text-xs text-slate-300 leading-relaxed">{item.message}</p>
                        
                        {item.fix && expandedFixes[index] && (
                          <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/80 font-mono text-[10px] shadow-inner animate-fade-in">
                            <div className="bg-slate-900 px-3 py-1.5 text-[9px] font-semibold text-slate-500 border-b border-slate-850">
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
