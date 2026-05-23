'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, KeyRound, Mail, Sparkles, UserPlus, LogIn, AlertCircle } from 'lucide-react';
import Tilt3d from '@/components/ui/Tilt3d';
import confetti from 'canvas-confetti';

interface FloatingToken {
  id: number;
  text: string;
  left: string;
  delay: string;
  duration: string;
  size: string;
  color: string;
}

const MOCK_TOKENS = [
  'const', 'async', 'await', '=>', '{ }', 'import', 'export', 'function',
  'return', 'class', 'interface', 'string', 'boolean', 'Promise', '[]'
];

const TOKEN_COLORS = [
  'text-cyan-500/12',
  'text-fuchsia-500/10',
  'text-amber-500/8',
  'text-violet-500/10',
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
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    setIsDemo(process.env.NEXT_PUBLIC_DEMO_MODE === 'true');

    // Build random floating code tokens with multi-color
    const generatedParticles: FloatingToken[] = Array.from({ length: 15 }).map((_, idx) => ({
      id: idx,
      text: MOCK_TOKENS[Math.floor(Math.random() * MOCK_TOKENS.length)],
      left: `${Math.random() * 90 + 5}%`,
      delay: `${Math.random() * -20}s`,
      duration: `${Math.random() * 15 + 15}s`,
      size: `${Math.random() * 0.4 + 0.8}rem`,
      color: TOKEN_COLORS[Math.floor(Math.random() * TOKEN_COLORS.length)],
    }));
    setParticles(generatedParticles);
  }, []);

  const handleDemoSignIn = () => {
    setLoading(true);
    setError(null);

    // Set cookie on browser
    document.cookie = "demo-auth-active=true; path=/; max-age=86400; SameSite=Lax";

    showToast('Demo access active! Redirecting...', 'info');

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06b6d4', '#d946ef', '#f59e0b', '#8b5cf6'],
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
      showToast('Demo account signed in! Redirecting...', 'success');
      confetti({
        particleCount: 80,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#d946ef', '#8b5cf6'],
      });
      setTimeout(() => {
        setLoading(false);
        window.location.href = '/';
      }, 1000);
      return;
    }

    try {
      if (activeTab === 'signin') {
        const response = await fetch('/api/auth/login/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Invalid credentials.');
        }

        showToast('Successfully logged in! Redirecting...', 'success');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#06b6d4', '#d946ef', '#f59e0b'],
        });
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        const response = await fetch('/api/auth/register/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Registration failed.');
        }

        showToast(result.message || 'Account created successfully!', 'success');
        setActiveTab('signin');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
      showToast(err.message || 'Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-6" style={{ backgroundColor: '#030712' }}>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${toast.type === 'success'
            ? 'border-emerald-500/20 text-emerald-400'
            : toast.type === 'error'
              ? 'border-rose-500/20 text-rose-400'
              : 'border-cyan-500/20 text-cyan-400'
          }`}
          style={{
            background: toast.type === 'success'
              ? 'rgba(16, 185, 129, 0.08)'
              : toast.type === 'error'
                ? 'rgba(244, 63, 94, 0.08)'
                : 'rgba(6, 182, 212, 0.08)',
          }}
        >
          {toast.type === 'success' ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          ) : toast.type === 'error' ? (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
          )}
          <span className="text-xs font-semibold">{toast.text}</span>
        </div>
      )}

      {/* Floating Code Particles Layer — Multi-color */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {particles.map(p => (
          <div
            key={p.id}
            className={`absolute bottom-0 ${p.color} font-mono select-none animate-code-float`}
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
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.1) 1px, transparent 1px)',
          backgroundSize: '36px 36px'
        }}
      />

      {/* Auth Form Card */}
      <div className="relative z-10 w-full max-w-md">
        <Tilt3d>
          <div className="glass-panel-tailwind rounded-2xl p-8 shadow-2xl relative overflow-hidden rainbow-rim"
            style={{
              background: 'rgba(10, 15, 30, 0.7)',
              border: '1px solid rgba(6, 182, 212, 0.1)',
            }}
          >

            <div className="flex flex-col items-center mb-8">
              <div className="p-3 rounded-xl text-cyan-400 mb-3"
                style={{
                  background: 'rgba(6, 182, 212, 0.1)',
                  border: '1px solid rgba(6, 182, 212, 0.15)',
                  boxShadow: '0 0 20px rgba(6, 182, 212, 0.15)',
                }}
              >
                <Terminal size={28} className="animate-pulse" />
              </div>
              <h1 className="text-xl font-bold tracking-tight aurora-text">AI Code Assistant</h1>
              <p className="text-xs text-slate-500 mt-1">Next-Gen Code Audit Workspace</p>
            </div>

            {/* Sliding highlight tab bar — gradient */}
            <div className="relative flex p-1 rounded-xl mb-6" style={{ background: 'rgba(3, 7, 18, 0.8)', border: '1px solid rgba(6, 182, 212, 0.06)' }}>
              <div
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-out shimmer-btn ${activeTab === 'signup' ? 'translate-x-[100%]' : 'translate-x-0'
                  }`}
              />
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold transition-colors relative z-10 ${activeTab === 'signin' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                onClick={() => { setActiveTab('signin'); setError(null); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold transition-colors relative z-10 ${activeTab === 'signup' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                onClick={() => { setActiveTab('signup'); setError(null); }}
              >
                Sign Up
              </button>
            </div>

            {/* Error alerts */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg text-rose-400 text-xs mb-4"
                style={{
                  background: 'rgba(244, 63, 94, 0.06)',
                  border: '1px solid rgba(244, 63, 94, 0.15)',
                }}
              >
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
                    className="w-full rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 outline-none transition-colors"
                    style={{
                      background: 'rgba(3, 7, 18, 0.8)',
                      border: '1px solid rgba(6, 182, 212, 0.08)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.08)'}
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
                    className="w-full rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 outline-none transition-colors"
                    style={{
                      background: 'rgba(3, 7, 18, 0.8)',
                      border: '1px solid rgba(6, 182, 212, 0.08)',
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.08)'}
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
                      className="w-full rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 outline-none transition-colors"
                      style={{
                        background: 'rgba(3, 7, 18, 0.8)',
                        border: '1px solid rgba(6, 182, 212, 0.08)',
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.4)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(6, 182, 212, 0.08)'}
                      required
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 py-3 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-40 shimmer-btn shadow-[0_4px_15px_rgba(6,182,212,0.2)]"
                disabled={loading}
              >
                {activeTab === 'signin' ? <LogIn size={14} /> : <UserPlus size={14} />}
                <span>{activeTab === 'signin' ? 'Sign In' : 'Sign Up'}</span>
              </button>
            </form>

            {/* Quick Demo Mode Login */}
            {isDemo && activeTab === 'signin' && (
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(6, 182, 212, 0.06)' }}>
                <div className="text-center mb-4">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Fast Local Testing</span>
                </div>
                <button
                  type="button"
                  onClick={handleDemoSignIn}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-cyan-400 hover:text-cyan-300 text-xs font-bold rounded-xl transition-all"
                  style={{
                    background: 'rgba(3, 7, 18, 0.8)',
                    border: '1px solid rgba(6, 182, 212, 0.12)',
                  }}
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
