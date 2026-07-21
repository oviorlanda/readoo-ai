import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Sparkles, UserCheck, ShieldCheck } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      navigate(data.role === 'admin' ? '/admin' : '/chat');
    } catch {
      // Error handled by hook
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] text-slate-100 p-4 relative overflow-hidden">
      {/* Background subtle ambient radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10 space-y-6">
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl shadow-lg shadow-indigo-500/10 mb-2">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Readoo AI</h1>
          <p className="text-xs text-slate-400">Enterprise RAG & Multi-modal AI Assistant</p>
        </div>

        {/* Login Panel */}
        <div className="linear-panel p-7 space-y-5 border border-slate-800/80 bg-[#0D121D] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h2 className="text-base font-semibold text-slate-200">Masuk ke Akun Anda</h2>
            <span className="badge-tech font-mono text-[10px]">Portal Auth</span>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Email / Username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-linear"
                placeholder="Masukkan email/username..."
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-linear"
                placeholder="Masukkan password Anda..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-linear-primary w-full justify-center py-2.5 mt-2 text-sm font-semibold"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Memproses Masuk...' : 'Masuk'}
            </button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="pt-3 border-t border-slate-800/80 space-y-2">
            <p className="text-[11px] font-medium text-slate-400 text-center">Akun Demo (Klik untuk Isi Otomatis):</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('user', 'user')}
                className="btn-linear-secondary text-xs justify-center py-1.5"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> Demo User
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin')}
                className="btn-linear-secondary text-xs justify-center py-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Demo Admin
              </button>
            </div>
          </div>

          {/* Footer Links */}
          <div className="pt-2 flex justify-between text-xs text-slate-400 border-t border-slate-800/80">
            <Link to="/register" className="hover:text-indigo-400 transition-colors">
              Belum punya akun? <span className="text-indigo-400 underline font-medium">Daftar</span>
            </Link>
            <Link to="/forgot-password" className="hover:text-slate-200 transition-colors">
              Lupa Password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}