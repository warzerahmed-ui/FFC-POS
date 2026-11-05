import React from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, Cloud, ShieldCheck, UserCheck, KeyRound } from 'lucide-react';

interface NavbarProps {
  currentTab?: string;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { currentUser, setShowLoginModal } = useApp();
  const today = new Date().toLocaleDateString('ckb-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 bg-white/80 backdrop-blur-2xl border-b border-black/[0.06] px-6 flex items-center justify-between sticky top-0 z-30 no-print transition-all">
      {/* Apple Brand & Factory */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-b from-[#1D1D1F] to-[#2C2C2E] flex items-center justify-center shadow-md shadow-black/10 text-white font-semibold text-lg">
          🍗
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-[#1D1D1F] tracking-tight">
              کارگەی مریشکی فرێش
            </h1>
            <span className="text-[10px] bg-[#0071E3]/10 text-[#0071E3] font-semibold px-2 py-0.5 rounded-full border border-[#0071E3]/15">
              FFC-POS
            </span>
          </div>
          <p className="text-[11px] text-[#86868B]">سیستەمی بەڕێوەبردنی کارگە، مەندوب، فرۆشگا و ژمێریاری</p>
        </div>
      </div>

      {/* Apple Status Badges & User Switcher */}
      <div className="flex items-center gap-3">
        {/* Cloudflare Badge */}
        <div className="hidden md:flex items-center gap-2 bg-[#F5F5F7] border border-black/[0.04] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#1D1D1F]">
          <Cloud className="w-3.5 h-3.5 text-[#F6821F]" />
          <span>Cloudflare Edge (FFC-POS)</span>
        </div>

        {/* Date Pill */}
        <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium text-[#515154] bg-[#F5F5F7] border border-black/[0.04] px-3.5 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
          <span>{today}</span>
        </div>

        {/* Active User Badge / Switch Button */}
        <button
          onClick={() => setShowLoginModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-sm ${
            currentUser?.role === 'SUPER_ADMIN'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 hover:bg-amber-500/20'
              : currentUser?.role === 'ADMIN'
              ? 'bg-[#34C759]/10 border-[#34C759]/20 text-[#248A3D] hover:bg-[#34C759]/20'
              : currentUser?.role === 'ACCOUNTANT'
              ? 'bg-[#0071E3]/10 border-[#0071E3]/20 text-[#0071E3] hover:bg-[#0071E3]/20'
              : currentUser?.role === 'REP'
              ? 'bg-[#AF52DE]/10 border-[#AF52DE]/20 text-[#AF52DE] hover:bg-[#AF52DE]/20'
              : 'bg-[#FF9500]/10 border-[#FF9500]/20 text-[#FF9500] hover:bg-[#FF9500]/20'
          }`}
          title="گۆڕینی ئەکاونت یان چوونەژوورەوە"
        >
          <span className="text-sm">{currentUser?.avatarEmoji || '👤'}</span>
          <span className="font-bold">{currentUser?.name}</span>
          <span className="text-[10px] opacity-75 font-mono">({currentUser?.roleTitleKu})</span>
          <KeyRound className="w-3 h-3 opacity-60 mr-1" />
        </button>
      </div>
    </header>
  );
};
