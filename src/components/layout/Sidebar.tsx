import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Truck,
  Send,
  Gift,
  RotateCcw,
  ShoppingBag,
  Calculator,
  FileSpreadsheet,
  LogOut,
  ShieldCheck,
  User,
} from 'lucide-react';

export type TabType = 
  | 'dashboard' 
  | 'intake' 
  | 'rep-sales'
  | 'gifts'
  | 'returns' 
  | 'pos' 
  | 'accounting' 
  | 'reports'
  | 'dispatch'; // for backward compatibility

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'داشبۆردی سەرەکی',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'intake' as TabType,
      label: 'وەرگرتنی مریشک (کێڵگە)',
      icon: Truck,
      badge: 'وەسڵ',
    },
    {
      id: 'rep-sales' as TabType,
      label: 'فرۆشی مەندوب',
      icon: Send,
      badge: 'مارکێت',
    },
    {
      id: 'gifts' as TabType,
      label: 'دیاری و هەدیە',
      icon: Gift,
      badge: 'بەلاش',
    },
    {
      id: 'returns' as TabType,
      label: 'گەڕاوەی ٣ ڕۆژ',
      icon: RotateCcw,
      badge: 'تەلەف',
    },
    {
      id: 'pos' as TabType,
      label: 'فرۆشگای تایبەت (POS)',
      icon: ShoppingBag,
      badge: '80mm',
    },
    {
      id: 'accounting' as TabType,
      label: 'ژمێریاری و کەشف حساب',
      icon: Calculator,
      badge: 'قەرز',
    },
    {
      id: 'reports' as TabType,
      label: 'ڕاپۆرتی قازانج و خەرجی',
      icon: FileSpreadsheet,
      badge: 'P & L',
    },
  ];

  const { currentUser, hasAccess, setShowLoginModal } = useApp();
  const accessibleMenuItems = menuItems.filter(item => hasAccess(item.id));

  return (
    <aside className="w-64 bg-[#FBFBFD]/90 backdrop-blur-xl border-l border-black/[0.05] flex flex-col justify-between p-3.5 shrink-0 no-print min-h-[calc(100vh-4rem)]">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-[#86868B] px-3 py-2 uppercase tracking-wider flex items-center justify-between">
          <span>بەشەکانی کارگە</span>
          <span className="text-[10px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
            {accessibleMenuItems.length} بەش
          </span>
        </div>

        {accessibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-[#0071E3] text-white shadow-sm shadow-[#0071E3]/30 font-bold'
                  : 'text-[#424245] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-[#86868B] group-hover:text-[#0071E3]'
                  }`}
                />
                <span className="tracking-tight">{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-black/[0.04] text-[#86868B] group-hover:bg-black/[0.06]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Session Profile Card */}
      <div className="mt-6 space-y-2">
        <div className="p-3.5 rounded-2xl bg-white border border-black/[0.06] shadow-sm text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentUser?.avatarEmoji || '👤'}</span>
              <div>
                <div className="font-bold text-[#1D1D1F] text-[11px] flex items-center gap-1">
                  <span>{currentUser?.name}</span>
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded font-bold">SUPER</span>
                  )}
                </div>
                <div className="text-[10px] text-[#86868B] font-medium">{currentUser?.roleTitleKu}</div>
              </div>
            </div>

            <button
              onClick={() => setShowLoginModal(true)}
              className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-red-50 text-[#86868B] hover:text-[#FF3B30] transition-colors"
              title="گۆڕینی یوزەر یان چوونەدەرەوە"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10px] text-[#86868B]">
            <span>مۆبایل:</span>
            <span className="font-mono font-bold text-[#1D1D1F]">{currentUser?.phone}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
