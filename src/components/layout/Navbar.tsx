import React from 'react';
import { useApp } from '../../context/AppContext';
import { Calendar, Cloud, KeyRound, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { currentUser, setShowLoginModal } = useApp();
  const today = new Date().toLocaleDateString('ckb-IQ', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const getRoleBadgeClasses = () => {
    switch (currentUser?.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return 'bg-[#34C759]/10 border-[#34C759]/20 text-[#248A3D] hover:bg-[#34C759]/18';
      case 'ACCOUNTANT':
        return 'bg-[#0071E3]/10 border-[#0071E3]/20 text-[#0071E3] hover:bg-[#0071E3]/18';
      case 'REP':
        return 'bg-[#AF52DE]/10 border-[#AF52DE]/20 text-[#AF52DE] hover:bg-[#AF52DE]/18';
      default:
        return 'bg-[#FF9500]/10 border-[#FF9500]/20 text-[#B25000] hover:bg-[#FF9500]/18';
    }
  };

  return (
    <header className="h-16 apple-glass border-b border-black/[0.06] px-4 md:px-6 flex items-center justify-between sticky top-0 z-30 no-print">
      {/* Brand & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            className="md:hidden w-9 h-9 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] flex items-center justify-center text-[#1D1D1F] transition-colors"
            aria-label="کردنەوەی لیست"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="w-9 h-9 rounded-2xl bg-[#1D1D1F] flex items-center justify-center shadow-sm text-white text-lg">
          🍗
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-extrabold text-[#1D1D1F] tracking-tight">
              کارگەی مریشکی فرێش
            </h1>
            <span className="text-[10px] bg-[#0071E3]/10 text-[#0071E3] font-bold px-2 py-0.5 rounded-full">
              FFC-POS
            </span>
          </div>
          <p className="hidden sm:block text-[11px] text-[#86868B]">
            سیستەمی بەڕێوەبردنی کارگە، مەندوب، شۆرۆم و ژمێریاری
          </p>
        </div>
      </div>

      {/* Status Pills & Account Switcher */}
      <div className="flex items-center gap-2.5">
        <div className="hidden lg:flex items-center gap-1.5 bg-[#F5F5F7] border border-black/[0.04] px-3 py-1.5 rounded-full text-[11px] font-medium text-[#515154]">
          <Cloud className="w-3.5 h-3.5 text-[#F6821F]" />
          <span>Cloudflare Pages</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium text-[#515154] bg-[#F5F5F7] border border-black/[0.04] px-3.5 py-1.5 rounded-full">
          <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
          <span>{today}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowLoginModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${getRoleBadgeClasses()}`}
          title="گۆڕینی ئەکاونت یان چوونەژوورەوە"
        >
          <span className="text-sm">{currentUser?.role === 'SUPER_ADMIN' ? '👔' : currentUser?.avatarEmoji || '👤'}</span>
          <span className="font-bold">
            {currentUser?.role === 'SUPER_ADMIN' ? 'بەڕێوەبەری کارگە' : currentUser?.name}
          </span>
          <KeyRound className="w-3 h-3 opacity-60 mr-0.5" />
        </button>
      </div>
    </header>
  );
};
