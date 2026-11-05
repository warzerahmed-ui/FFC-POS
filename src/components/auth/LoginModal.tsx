import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Lock,
  Phone,
  ShieldCheck,
  CheckCircle,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
} from 'lucide-react';

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
      setErrorMessage('ژمارەی مۆبایل یان پاسۆرد هەڵەیە!');
    }
  };

  // Only display normal visible roles in quick switcher (NEVER show Super Admin!)
  const visibleRoles = users.filter(u => !u.isSuperAdmin);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-[#F5F5F7] to-white border-b border-black/[0.06] text-center relative">
          <button
            onClick={() => setShowLoginModal(false)}
            className="absolute left-4 top-4 w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-xs font-bold text-[#86868B] transition-colors"
          >
            ✕
          </button>

          <div className="w-12 h-12 rounded-2xl bg-[#1D1D1F] text-white flex items-center justify-center mx-auto mb-2 text-2xl shadow-md">
            🍗
          </div>
          <h3 className="font-extrabold text-lg text-[#1D1D1F] tracking-tight">
            چوونەژوورەوە بۆ سیستەمی FFC-POS
          </h3>
          <p className="text-xs text-[#86868B] mt-0.5">
            کارگەی مریشکی فرێش - دیاریکردنی دەسەڵات و ڕۆڵەکان
          </p>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Direct Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#0071E3]" />
                ژمارەی مۆبایل
              </label>
              <input
                type="text"
                required
                placeholder="0770XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-all text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                پاسۆرد
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.08] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-all text-left pr-10"
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
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-center font-bold">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-xl shadow-md shadow-[#0071E3]/25 flex items-center justify-center gap-1.5 transition-all text-xs"
            >
              <KeyRound className="w-4 h-4" />
              چوونەژوورەوە بە ئەکاونت
            </button>
          </form>

          {/* Quick Role Switcher for Testing (Super admin is NEVER listed here!) */}
          <div className="pt-3 border-t border-black/[0.06] space-y-2">
            <span className="text-[11px] font-bold text-[#86868B] block text-center">
              یان هەڵبژاردنی خێرای ڕۆڵە گشتییەکان:
            </span>

            <div className="grid grid-cols-2 gap-2">
              {visibleRoles.map((roleUser) => {
                const isCurrent = currentUser?.id === roleUser.id;
                return (
                  <button
                    key={roleUser.id}
                    type="button"
                    onClick={() => {
                      switchUser(roleUser.id);
                      setShowLoginModal(false);
                    }}
                    className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-[#0071E3]/10 border-[#0071E3] text-[#0071E3]'
                        : 'bg-[#F5F5F7] hover:bg-[#EAEAEA] border-black/[0.04] text-[#1D1D1F]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{roleUser.avatarEmoji}</span>
                      {isCurrent && <CheckCircle className="w-3.5 h-3.5 text-[#0071E3]" />}
                    </div>
                    <div className="font-bold text-xs mt-1">{roleUser.roleTitleKu}</div>
                    <div className="text-[10px] text-[#86868B] mt-0.5 truncate">
                      {roleUser.role === 'REP'
                        ? 'فرۆش، دیاری، گەڕاوە'
                        : roleUser.role === 'CASHIER'
                        ? 'تەنها شۆرومی خۆی'
                        : 'دەسەڵاتی گشتی'}
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
