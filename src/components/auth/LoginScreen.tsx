import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Phone, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { FactoryLogo } from '../layout/FactoryLogo';

export const LoginScreen: React.FC = () => {
  const { login, factorySettings } = useApp();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    const result = await login(phone, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'ژمارەی مۆبایل یان وشەی نهێنی هەڵەیە');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-gradient-to-b from-[#FBFBFD] via-[#F5F5F7] to-[#E8E8ED]">
      <div className="w-full max-w-sm apple-sheet">
        <div className="text-center mb-8">
          <FactoryLogo size="xl" className="mx-auto shadow-xl shadow-black/15" />
          <h1 className="mt-5 text-2xl font-extrabold text-[#1D1D1F] tracking-tight">
            {factorySettings.shortCode}
          </h1>
          <p className="mt-1 text-xs text-[#86868B]">
            {factorySettings.factoryName} • چوونەژوورەوە بۆ سیستەم
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="apple-glass rounded-[28px] border border-black/[0.06] shadow-xl shadow-black/[0.06] p-6 space-y-4"
        >
          <div className="relative">
            <Phone className="w-4 h-4 text-[#86868B] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              inputMode="tel"
              autoComplete="username"
              required
              autoFocus
              placeholder="ژمارەی مۆبایل"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="apple-input w-full pr-11 pl-4 py-3.5 text-sm font-semibold text-left"
              dir="ltr"
            />
          </div>

          <div className="relative">
            <Lock className="w-4 h-4 text-[#86868B] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="وشەی نهێنی"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="apple-input w-full pr-11 pl-11 py-3.5 text-sm font-semibold text-left"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-[#FF3B30]/10 text-[#D70015] text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm shadow-[#0071E3]/30 transition-all active:scale-[0.985]"
          >
            {loading ? 'تکایە چاوەڕێ بە...' : 'چوونەژوورەوە'}
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-[11px] text-[#86868B] mt-6">
          دەسەڵاتەکان بەپێی ڕۆڵی ئەکاونتەکەت دیاری دەکرێن
        </p>
      </div>
    </div>
  );
};
