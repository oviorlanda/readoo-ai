import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../services/api';
import { Mail, Sparkles, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const data = await auth.forgotPassword(email);
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengirim email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F17] text-slate-100 p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl shadow-lg shadow-indigo-500/10 mb-2">
            <Sparkles className="w-7 h-7 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Reset Password</h1>
          <p className="text-xs text-slate-400">Masukkan email Anda untuk menerima tautan pemulihan</p>
        </div>

        <div className="linear-panel p-7 space-y-5 border border-slate-800/80 bg-[#0D121D] shadow-2xl">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-medium">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-linear"
                placeholder="email@example.com"
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
                <Mail className="w-4 h-4" />
              )}
              {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-slate-800/80">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali ke Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}