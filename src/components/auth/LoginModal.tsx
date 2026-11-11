import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, Phone, CheckCircle, KeyRound, Eye, EyeOff, X } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { users, currentUser, showLoginModal, setShowLoginModal, login, switchUser } = useApp();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!showLoginModal) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const success = login(phone, password);
    if (success) {
      setPhone('');
      setPassword('');
      setShowLoginModal(false);
    } else {
      setErrorMessage('ژمارەی مۆبایل یان وشەی نهێنی هەڵەیە!');
    }
  };

  // Strictly exclude hidden Super Admin from any public switcher
  const visibleRoles = users.filter(u => !u.isSuperAdmin);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 no-print">
      <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-black/[0.08] apple-sheet">
        {/* Header */}
        <div className="p-6 bg-[#FBFBFD] border-b border-black/[0.06] text-center relative">
          <button
            type="button"
            onClick={() => setShowLoginModal(false)}
            className="absolute left-4 top-4 w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] flex items-center justify-center text-[#86868B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center mx-auto mb-2.5 text-2xl shadow-sm">
            🍗
          </div>
          <h3 className="font-extrabold text-base text-[#1D1D1F] tracking-tight">
            چوونەژوورەوە بۆ FFC-POS
          </h3>
          <p className="text-[11px] text-[#86868B] mt-0.5">
            هەڵبژاردنی ڕۆڵ و دەسەڵاتی کارمەندان
          </p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Credentials Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="text-[#515154] font-semibold mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#0071E3]" />
                ژمارەی مۆبایل یان ناوی بەکارهێنەر
              </label>
              <input
                type="text"
                required
                placeholder="0770XXXXXXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="apple-input w-full px-3.5 py-2.5 text-xs font-mono font-bold text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="text-[#515154] font-semibold mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                وشەی نهێنی
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="apple-input w-full px-3.5 py-2.5 text-xs font-mono font-bold text-left pr-10"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#86868B] hover:text-[#1D1D1F]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-[#FF3B30]/10 text-[#D70015] rounded-xl text-center font-bold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-1.5 transition-all text-xs active:scale-[0.985]"
            >
              <KeyRound className="w-4 h-4" />
              چوونەژوورەوە
            </button>
          </form>

          {/* Quick Role Switcher (Public Roles Only) */}
          <div className="pt-4 border-t border-black/[0.06] space-y-2.5">
            <span className="text-[11px] font-semibold text-[#86868B] block text-center">
              گۆڕینی خێرای ئەکاونتەکان
            </span>

            <div className="grid grid-cols-2 gap-2">
              {visibleRoles.map(roleUser => {
                const isCurrent = currentUser?.id === roleUser.id;
                return (
                  <button
                    key={roleUser.id}
                    type="button"
                    onClick={() => {
                      switchUser(roleUser.id);
                      setShowLoginModal(false);
                    }}
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#0071E3]/8 border-[#0071E3]/40 text-[#0071E3]'
                        : 'bg-[#F5F5F7] hover:bg-[#EBEBF0] border-black/[0.04] text-[#1D1D1F]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{roleUser.avatarEmoji}</span>
                      {isCurrent && <CheckCircle className="w-4 h-4 text-[#0071E3]" />}
                    </div>
                    <div className="font-bold text-xs mt-1.5">{roleUser.roleTitleKu}</div>
                    <div className="text-[10px] text-[#86868B] mt-0.5 truncate">
                      {roleUser.role === 'REP'
                        ? 'فرۆش، دیاری، گەڕاوە'
                        : roleUser.role === 'CASHIER'
                        ? 'فرۆشگای شۆرۆم'
                        : 'هەموو بەشەکان'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
