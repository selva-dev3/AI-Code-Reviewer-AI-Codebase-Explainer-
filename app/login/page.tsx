'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, KeyRound, Mail, Sparkles, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import Tilt3d from '@/components/ui/Tilt3d';
import confetti from 'canvas-confetti';

interface FloatingToken {
  id: number;
  text: string;
  left: string;
  delay: string;
  duration: string;
  size: string;
}

const MOCK_TOKENS = [
  'const', 'async', 'await', '=>', '{ }', 'import', 'export', 'function', 
  'return', 'class', 'interface', 'string', 'boolean', 'Promise', '[]'
];

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [particles, setParticles] = useState<FloatingToken[]>([]);

  // Supabase Client for client-side authentication
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
  const supabase = createBrowserClient(supabaseUrl, supabaseKey);

  useEffect(() => {
    // Check if we are running in Demo Mode
    setIsDemo(process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || true);

    // Build random floating code tokens to avoid hydration mismatches
    const generatedParticles: FloatingToken[] = Array.from({ length: 15 }).map((_, idx) => ({
      id: idx,
      text: MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)],
      left: `${Math.random() * 90 + 5}%`,
      delay: `${Math.random() * -20}s`,
      duration: `${Math.random() * 15 + 15}s`,
      size: `${Math.random() * 0.4 + 0.8}rem`
    }));
    setParticles(generatedParticles);
  }, []);

  const handleDemoSignIn = () => {
    setLoading(true);
    setError(null);
    
    // Set cookie on browser
    document.cookie = "demo-auth-active=true; path=/; max-age=86400; SameSite=Lax";
    
    // Play confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      setLoading(false);
      window.location.href = '/';
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (activeTab === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    // In demo mode, any valid submission acts as a successful login simulation
    if (isDemo) {
      document.cookie = "demo-auth-active=true; path=/; max-age=86400; SameSite=Lax";
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        setLoading(false);
        window.location.href = '/';
      }, 1000);
      return;
    }

    try {
      if (activeTab === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        window.location.href = '/';
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (signUpError) throw signUpError;
        
        // Supabase sign up might require email verification, explain to user
        alert('Verification email has been sent! Please check your inbox.');
        setActiveTab('signin');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 p-6">
      
      {/* Floating Code Particles Layer */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute bottom-0 text-indigo-500/10 font-mono select-none animate-code-float"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
              fontSize: p.size,
            }}
          >
            {p.text}
          </div>
        ))}
      </div>

      {/* Cyber Grid tech background */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }}
      />

      {/* Auth Form Card */}
      <div className="relative z-10 w-full max-w-md">
        <Tilt3d>
          <div className="glass-panel-tailwind rounded-2xl border border-slate-850/70 p-8 shadow-2xl relative overflow-hidden bg-slate-900/40 backdrop-blur-xl">
            
            {/* Top Glowing Mesh inside Card */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-[2px]" />

            <div className="flex flex-col items-center mb-8">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 mb-3 border border-indigo-500/20">
                <Terminal size={28} className="animate-pulse" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">AI Code Assistant</h1>
              <p className="text-xs text-slate-500 mt-1">Next-Gen Code Audit Workspace</p>
            </div>

            {/* Sliding highlight tab bar */}
            <div className="relative flex p-1 bg-slate-950 border border-slate-850 rounded-xl mb-6">
              <div 
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-indigo-600 rounded-lg transition-transform duration-300 ease-out ${
                  activeTab === 'signup' ? 'translate-x-[100%]' : 'translate-x-0'
                }`}
              />
              <button 
                type="button"
                className={`flex-1 py-2 text-xs font-bold transition-colors relative z-10 ${
                  activeTab === 'signin' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => { setActiveTab('signin'); setError(null); }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`flex-1 py-2 text-xs font-bold transition-colors relative z-10 ${
                  activeTab === 'signup' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => { setActiveTab('signup'); setError(null); }}
              >
                Sign Up
              </button>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-455 text-xs text-rose-450 mb-4 text-rose-400">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-850 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                    <KeyRound size={14} />
                  </div>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-850 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>
              </div>

              {activeTab === 'signup' && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                      <KeyRound size={14} />
                    </div>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-855 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors border-slate-850"
                      required
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full flex items-center justify-center gap-1.5 py-3 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold rounded-xl transition-all shadow-[0_4px_15px_rgba(99,102,241,0.3)] disabled:opacity-40"
                disabled={loading}
              >
                {activeTab === 'signin' ? <LogIn size={14} /> : <UserPlus size={14} />}
                <span>{activeTab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
              </button>
            </form>

            {/* Quick Demo Mode Login */}
            {isDemo && activeTab === 'signin' && (
              <div className="mt-6 pt-6 border-t border-slate-850/60">
                <div className="text-center mb-4">
                  <span className="text-[9px] font-bold text-slate-650 uppercase tracking-wider text-slate-500">Fast Local Testing</span>
                </div>
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-indigo-400 hover:text-indigo-300 text-xs font-bold rounded-xl transition-all"
                  disabled={loading}
                >
                  <Sparkles size={12} className="animate-pulse" />
                  <span>Interactive Demo Access</span>
                </button>
              </div>
            )}

          </div>
        </Tilt3d>
      </div>

    </div>
  );
}
