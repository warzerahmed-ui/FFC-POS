import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Truck,
  Factory,
  PackageCheck,
  ClipboardList,
  Send,
  Gift,
  ShoppingBag,
  Calculator,
  FileSpreadsheet,
  LogOut,
  X,
} from 'lucide-react';

export type TabType =
  | 'dashboard'
  | 'intake'
  | 'production'
  | 'ready-for-sale'
  | 'custody'
  | 'rep-sales'
  | 'gifts'
  | 'returns'
  | 'pos'
  | 'accounting'
  | 'reports'
  | 'dispatch';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  mobileOpen = false,
  onCloseMobile,
}) => {
  const { currentUser, hasAccess, logout } = useApp();

  const menuItems = [
    { id: 'dashboard' as TabType, label: 'داشبۆردی سەرەکی', icon: LayoutDashboard, badge: null },
    { id: 'intake' as TabType, label: '١. وەرگرتنی مریشک (کێڵگە)', icon: Truck, badge: 'قۆناغی ١' },
    { id: 'production' as TabType, label: '٢. سەربڕین و پارچەکردن', icon: Factory, badge: 'قۆناغی ٢' },
    { id: 'ready-for-sale' as TabType, label: '٣. ئامادە بۆ فرۆشتن', icon: PackageCheck, badge: 'قۆناغی ٣' },
    { id: 'custody' as TabType, label: '٤. ناردن بۆ مەندوب و شۆرۆم', icon: ClipboardList, badge: 'عەهدە' },
    { id: 'rep-sales' as TabType, label: '٥. فرۆشتنی مەندوب و گەڕاوە', icon: Send, badge: 'مارکێت' },
    { id: 'pos' as TabType, label: '٦. فرۆشگای شۆرۆم (POS)', icon: ShoppingBag, badge: 'دوکان' },
    { id: 'gifts' as TabType, label: '٧. دیاری و هەدیە', icon: Gift, badge: 'فری' },
    { id: 'accounting' as TabType, label: '٨. کەشف حساب و دانەوەی قەرز', icon: Calculator, badge: 'قەرز' },
    { id: 'reports' as TabType, label: '٩. قازانج و زەرەر و ڕاپۆرتی ڕۆژانە', icon: FileSpreadsheet, badge: 'P & L' },
  ];

  const accessibleMenuItems = menuItems.filter(item => hasAccess(item.id));

  const handleSelect = (id: TabType) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between p-3.5">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold text-[#86868B] px-3 py-2 flex items-center justify-between">
          <span>بەشەکانی سیستەم</span>
          <span className="text-[10px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full tabular-nums">
            {accessibleMenuItems.length} بەش
          </span>
        </div>

        {accessibleMenuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                isActive
                  ? 'bg-[#0071E3] text-white shadow-sm shadow-[#0071E3]/25 font-bold'
                  : 'text-[#424245] hover:text-[#1D1D1F] hover:bg-black/[0.04]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-105 ${
                    isActive ? 'text-white' : 'text-[#86868B] group-hover:text-[#0071E3]'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-white/20 text-white font-bold'
                      : 'bg-black/[0.04] text-[#86868B]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Discreet Account Pill (Never reveals Super Admin badge) */}
      <div className="mt-6">
        <div className="p-3 rounded-2xl bg-white border border-black/[0.06] shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl shrink-0">
              {currentUser?.role === 'SUPER_ADMIN' ? '👔' : currentUser?.avatarEmoji || '👤'}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-[#1D1D1F] text-xs truncate">
                {currentUser?.role === 'SUPER_ADMIN' ? 'بەڕێوەبەری کارگە' : currentUser?.name}
              </div>
              <div className="text-[10px] text-[#86868B] truncate">
                {currentUser?.role === 'SUPER_ADMIN' ? 'بەڕێوەبەر' : currentUser?.roleTitleKu}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              logout();
              if (onCloseMobile) onCloseMobile();
            }}
            className="p-2 rounded-xl bg-[#F5F5F7] hover:bg-[#FF3B30]/10 text-[#86868B] hover:text-[#FF3B30] transition-colors shrink-0"
            title="چوونەدەرەوە"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 apple-glass border-l border-black/[0.06] flex-col shrink-0 no-print min-h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#FBFBFD] h-full shadow-2xl border-l border-black/[0.08] flex flex-col z-10 apple-sheet">
            <div className="h-14 px-4 border-b border-black/[0.06] flex items-center justify-between">
              <span className="font-extrabold text-sm text-[#1D1D1F]">FFC-POS</span>
              <button
                type="button"
                onClick={onCloseMobile}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#86868B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </aside>
        </div>
      )}
    </>
  );
};
