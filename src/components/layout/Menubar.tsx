import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { TabType } from './Sidebar';
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
  ChevronDown,
  LogOut,
  Clock,
  Menu,
  X,
  Check,
  Cloud,
} from 'lucide-react';

interface MenubarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

interface MenuSubItem {
  id: TabType;
  label: string;
  description: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  matchTabs?: TabType[];
}

interface MenuGroup {
  key: 'dashboard' | 'factory' | 'sales' | 'finance';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  directTab?: TabType;
  items: MenuSubItem[];
}

const MENU_GROUPS: MenuGroup[] = [
  {
    key: 'dashboard',
    label: 'داشبۆرد',
    icon: LayoutDashboard,
    directTab: 'dashboard',
    items: [
      {
        id: 'dashboard',
        label: 'داشبۆردی سەرەکی',
        description: 'کورتەی ئامارەکان، کۆگا و چالاکی ئەمڕۆ',
        badge: 'سەرەکی',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    key: 'factory',
    label: 'کارگە و کۆگا',
    icon: Factory,
    items: [
      {
        id: 'intake',
        label: '١. وەرگرتنی مریشک (کێڵگە)',
        description: 'تۆمارکردنی وەسڵ و کێشی مریشکی زیندوو',
        badge: 'قۆناغی ١',
        icon: Truck,
      },
      {
        id: 'production',
        label: '٢. سەربڕین و پارچەکردن',
        description: 'جیاکردنەوەی بەشەکان و ڕێندەمەنتی ڕۆژانە',
        badge: 'قۆناغی ٢',
        icon: Factory,
      },
      {
        id: 'ready-for-sale',
        label: '٣. ئامادە بۆ فرۆشتن',
        description: 'کۆگای ئامادە، نرخدانان و گۆڕینی گەڕاوە',
        badge: 'قۆناغی ٣',
        icon: PackageCheck,
      },
    ],
  },
  {
    key: 'sales',
    label: 'ناردن و فرۆشتن',
    icon: ShoppingBag,
    items: [
      {
        id: 'custody',
        label: '٤. ناردن بۆ مەندوب و شۆرۆم',
        description: 'بارگواستنەوە و عەهدەی مەندوب و فرۆشگا',
        badge: 'قۆناغی ٤',
        icon: ClipboardList,
      },
      {
        id: 'rep-sales',
        label: '٥. فرۆشتنی مەندوب و گەڕاوە',
        description: 'وەسڵی دەستی و گەڕاوەی ٣ ڕۆژی مارکێتەکان',
        badge: 'قۆناغی ٥',
        icon: Send,
        matchTabs: ['rep-sales', 'dispatch', 'returns'],
      },
      {
        id: 'pos',
        label: '٦. فرۆشگای شۆرۆم (POS)',
        description: 'کاشێری بارکۆد، قەرز، ئەلکترۆنی و گەڕاوەی شۆرۆم',
        badge: 'قۆناغی ٦',
        icon: ShoppingBag,
      },
      {
        id: 'gifts',
        label: '٧. دیاری و هەدیە',
        description: 'بەخشینی بێبەرامبەر بە تێچووی کارگە',
        badge: 'قۆناغی ٧',
        icon: Gift,
      },
    ],
  },
  {
    key: 'finance',
    label: 'ژمێریاری و ڕاپۆرت',
    icon: Calculator,
    items: [
      {
        id: 'accounting',
        label: '٨. کەشف حساب و دانەوەی قەرز',
        description: 'کەشف حسابی کڕیار و کێڵگە و سەنەدەکان',
        badge: 'قۆناغی ٨',
        icon: Calculator,
      },
      {
        id: 'reports',
        label: '٩. قازانج و زەرەر و ڕاپۆرتی ڕۆژانە',
        description: 'ڕاپۆرتی P&L و تەسفییەی ڕۆژانەی مەندوب و شۆرۆم',
        badge: 'قۆناغی ٩',
        icon: FileSpreadsheet,
      },
    ],
  },
];

export const Menubar: React.FC<MenubarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, hasAccess, logout } = useApp();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenGroup(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Filter accessible items per group
  const accessibleGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => hasAccess(item.id)),
  })).filter(group => group.items.length > 0);

  const isItemActive = (item: MenuSubItem) =>
    item.id === activeTab || (item.matchTabs ? item.matchTabs.includes(activeTab) : false);

  const isGroupActive = (group: MenuGroup) => group.items.some(isItemActive);

  const activeGroupObj = accessibleGroups.find(isGroupActive) || accessibleGroups[0];
  const activeItemObj =
    activeGroupObj?.items.find(isItemActive) || activeGroupObj?.items[0];

  const handleSelectTab = (tab: TabType) => {
    setActiveTab(tab);
    setOpenGroup(null);
    setMobileOpen(false);
  };

  const formattedDateTime = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} • ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const displayName =
    currentUser?.role === 'SUPER_ADMIN' ? 'بەڕێوەبەری کارگە' : currentUser?.name || 'بەکارهێنەر';
  const displayRole =
    currentUser?.role === 'SUPER_ADMIN' ? 'بەڕێوەبەر' : currentUser?.roleTitleKu || '';
  const avatarInitial =
    currentUser?.role === 'SUPER_ADMIN' ? 'م' : currentUser?.name?.trim()?.[0] || 'ک';

  const ActiveBreadIcon = activeItemObj?.icon || LayoutDashboard;

  return (
    <div ref={menuContainerRef} className="sticky top-0 z-40 no-print">
      {/* Main Executive White Menubar */}
      <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 lg:px-7 flex items-center justify-between gap-3">
        {/* Right Side (RTL Start): Brand + Grouped Horizontal Menubar */}
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(prev => !prev)}
            className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200/80 flex items-center justify-center text-slate-700 transition-colors shrink-0"
            aria-label="مینۆ"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Brand Emblem */}
          <button
            type="button"
            onClick={() => {
              if (hasAccess('dashboard')) handleSelectTab('dashboard');
            }}
            className="flex items-center gap-2.5 text-right shrink-0 group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#1D4ED8] flex items-center justify-center shadow-sm shadow-[#0071E3]/25 text-white text-lg transition-transform group-hover:scale-105">
              🍗
            </div>
            <div>
              <div className="text-[13px] font-extrabold text-slate-900 tracking-tight leading-tight">
                کارگەی مریشکی فرێش
              </div>
              <div className="text-[10px] font-bold text-[#0071E3] tracking-tight">
                سیستەمی کارگە و شۆرۆم
              </div>
            </div>
          </button>

          {/* Subtle Vertical Divider */}
          <div className="hidden lg:block h-7 w-px bg-slate-200/90 mx-1 shrink-0" />

          {/* Desktop Horizontal Menubar Groups */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {accessibleGroups.map(group => {
              const active = isGroupActive(group);
              const isOpen = openGroup === group.key;
              const isSingleDirect = group.directTab && group.items.length === 1;

              return (
                <div key={group.key} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSingleDirect && group.directTab) {
                        handleSelectTab(group.directTab);
                      } else if (group.items.length === 1) {
                        handleSelectTab(group.items[0].id);
                      } else {
                        setOpenGroup(prev => (prev === group.key ? null : group.key));
                      }
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#EFF6FF] border border-[#3B82F6]/45 text-[#1D4ED8] font-bold shadow-[0_1px_2px_rgba(37,99,235,0.08)]'
                        : isOpen
                        ? 'bg-slate-100 border border-slate-200 text-slate-900 font-semibold'
                        : 'border border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 font-semibold'
                    }`}
                  >
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] shrink-0" />}
                    <span>{group.label}</span>
                    {!isSingleDirect && group.items.length > 1 && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-150 ${
                          isOpen ? 'rotate-180 text-[#1D4ED8]' : 'opacity-65'
                        }`}
                      />
                    )}
                  </button>

                  {/* Floating Dropdown Panel */}
                  {isOpen && group.items.length > 1 && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-80 bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/10 p-2 z-50 apple-sheet">
                      <div className="px-2.5 py-1.5 mb-1 flex items-center justify-between text-[10px] font-bold text-slate-400 border-b border-slate-100">
                        <span>{group.label}</span>
                        <span>{group.items.length} بەش</span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map(item => {
                          const Icon = item.icon;
                          const itemActive = isItemActive(item);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectTab(item.id)}
                              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-right transition-all cursor-pointer ${
                                itemActive
                                  ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    itemActive
                                      ? 'bg-[#2563EB] text-white shadow-xs'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate">{item.label}</div>
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {item.description}
                                  </div>
                                </div>
                              </div>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                                  itemActive
                                    ? 'bg-[#DBEAFE] text-[#1D4ED8]'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {item.badge}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Left Side (RTL End): Live Badges, Profile & Sign Out */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cloud Live Pill */}
          <div className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#10B981]/25 text-[#047857] text-[11px] font-bold">
            <Cloud className="w-3.5 h-3.5 text-[#10B981]" />
            <span>سیستەم چالاکە</span>
          </div>

          {/* Live Date & Clock Pill */}
          <div className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-slate-200/90 text-slate-600 text-[11px] font-semibold tabular-nums">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
            <Clock className="w-3.5 h-3.5 text-[#0071E3]" />
            <span dir="ltr">{formattedDateTime}</span>
          </div>

          {/* Profile Info */}
          <div className="hidden sm:flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full">
            <div className="w-8 h-8 rounded-full bg-[#EFF6FF] border border-[#3B82F6]/25 text-[#1D4ED8] flex items-center justify-center font-extrabold text-xs shrink-0">
              {avatarInitial}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-extrabold text-slate-800 max-w-[130px] truncate">
                {displayName}
              </div>
              <div className="text-[10px] font-extrabold text-[#0071E3] truncate">
                {displayRole}
              </div>
            </div>
          </div>

          {/* Crisp Red Outlined Sign Out Button */}
          <button
            type="button"
            onClick={logout}
            className="px-3 py-1.5 rounded-full bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5]/70 text-[#DC2626] text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="چوونەدەرەوە"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">چوونەدەرەوە</span>
          </button>
        </div>
      </header>

      {/* Secondary Breadcrumb & Status Strip */}
      <div className="bg-[#F8FAFC]/95 backdrop-blur-sm border-b border-slate-200/75 px-4 lg:px-7 py-2 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ActiveBreadIcon className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
          <span className="text-slate-500 font-medium truncate">{activeGroupObj?.label}</span>
          <span className="text-slate-300">/</span>
          <span className="font-extrabold text-slate-900 truncate">{activeItemObj?.label}</span>
        </div>

        {/* Quick Sub-item Switch Pills inside same group on desktop OR Live status */}
        <div className="flex items-center gap-3 shrink-0">
          {activeGroupObj && activeGroupObj.items.length > 1 && (
            <div className="hidden xl:flex items-center gap-1">
              {activeGroupObj.items.map(sub => {
                const subActive = isItemActive(sub);
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectTab(sub.id)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] transition-all cursor-pointer ${
                      subActive
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] font-bold border border-[#3B82F6]/30'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 font-medium'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-extrabold text-[#047857] tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span>FFC-POS • کارکردن: کراوەیە</span>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-slate-200 shadow-lg max-h-[75vh] overflow-y-auto p-3 space-y-3 apple-sheet">
          {accessibleGroups.map(group => (
            <div key={group.key} className="space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-extrabold text-slate-400">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const itemActive = isItemActive(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                        itemActive
                          ? 'bg-[#EFF6FF] border border-[#3B82F6]/35 text-[#1D4ED8] font-bold'
                          : 'bg-slate-50/70 text-slate-700 font-semibold hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {itemActive && <Check className="w-4 h-4 text-[#2563EB]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
