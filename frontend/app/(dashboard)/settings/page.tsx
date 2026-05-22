'use client';

import React, { useState } from 'react';
import { Settings, ShieldAlert, Cpu, ToggleLeft, ToggleRight, Sparkles, Check } from 'lucide-react';
import Tilt3d from '@/components/ui/Tilt3d';

export default function SettingsPage() {
  const [model, setModel] = useState('claude-3-5-sonnet');
  const [sensitivity, setSensitivity] = useState('balanced');
  const [enableCache, setEnableCache] = useState(true);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [customPrompt, setCustomPrompt] = useState('Ensure code complies with TypeScript strict constraints, memory leaks, and basic connection leak audits.');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="text-indigo-400" />
          <span>System Settings</span>
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Customize AI processing rules, system prompts, context overlapping parameters, and fallback models.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <Check size={14} className="shrink-0" />
          <span>Settings successfully flushed to database config!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* LLM Model selector */}
        <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Cpu size={16} className="text-indigo-400" />
            <span>AI Model Preference</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                model === 'claude-3-5-sonnet' 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
              onClick={() => setModel('claude-3-5-sonnet')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-200">Claude 3.5 Sonnet</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 uppercase tracking-wider">Recommended</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">Fast, high-fidelity source reviews and strict Zod structure validation outputs.</p>
            </div>

            <div 
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                model === 'claude-3-opus' 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
              onClick={() => setModel('claude-3-opus')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-200">Claude 3 Opus</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase tracking-wider">High Latency</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">Premium reasoning capabilities, designed for heavy refactoring and RAG explanation tasks.</p>
            </div>

            <div 
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                model === 'gpt-4o' 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
              }`}
              onClick={() => setModel('gpt-4o')}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-200">GPT-4o</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 uppercase tracking-wider">Standard</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-normal">General-purpose model support for non-coding summaries and rapid responses.</p>
            </div>
          </div>
        </div>

        {/* Sensitivity & Auditing Thresholds */}
        <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <ShieldAlert size={16} className="text-indigo-400" />
            <span>Audit Sensitivity Rules</span>
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-950/30 rounded-lg border border-slate-850/40">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Scanning Sensitivity</h4>
                <p className="text-[10px] text-slate-500">Determine how critical line audits should report styling anomalies vs bugs.</p>
              </div>
              <select 
                className="bg-slate-950 border border-slate-855 text-slate-200 text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-indigo-500 transition-all border-slate-850"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
              >
                <option value="strict">Strict (Audits everything)</option>
                <option value="balanced">Balanced (Checks bugs & safety)</option>
                <option value="permissive">Permissive (Critical vulnerabilities only)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/30 rounded-lg border border-slate-850/40">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Maximum Tokens Count</h4>
                <p className="text-[10px] text-slate-500">Control upper bounds for source parsing tokens range.</p>
              </div>
              <input 
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
                className="w-24 text-right bg-slate-950 border border-slate-850 rounded-lg py-1.5 px-3 text-xs text-slate-200 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/30 rounded-lg border border-slate-850/40">
              <div>
                <h4 className="text-xs font-bold text-slate-200">Local Vector Embeddings Cache</h4>
                <p className="text-[10px] text-slate-500">Cache similarities local vectors to decrease overall tokens cost.</p>
              </div>
              <button 
                type="button"
                onClick={() => setEnableCache(!enableCache)}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {enableCache ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>
          </div>
        </div>

        {/* Custom AI prompt rules */}
        <div className="rounded-xl border border-slate-850/60 bg-slate-900/40 backdrop-blur-md p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            <span>Custom System Prompt Instructions</span>
          </h3>

          <div className="space-y-1.5">
            <p className="text-[10px] text-slate-500">Appended directly to the reviewer engine model prompts before code audits.</p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              className="w-full min-h-[100px] p-4 bg-slate-950/80 border border-slate-850 rounded-xl text-xs text-slate-250 font-mono outline-none focus:border-indigo-500 transition-all text-slate-300"
              placeholder="e.g. Reject any variables containing dynamic console commands..."
            />
          </div>
        </div>

        {/* Save trigger button */}
        <button 
          type="submit"
          className="w-full py-3 rounded-lg bg-indigo-650 hover:bg-indigo-600 text-white text-xs font-bold transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] bg-indigo-600"
        >
          Flush Configurations
        </button>

      </form>
    </div>
  );
}
