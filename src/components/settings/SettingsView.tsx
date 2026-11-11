import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Settings,
  Building2,
  Users,
  Trash2,
  Activity,
  Plus,
  Save,
  CheckCircle2,
  RotateCcw,
  Search,
  Edit3,
  Shield,
  Lock,
  Phone,
  MapPin,
  FileText,
  Printer,
  AlertTriangle,
  X,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react';
import {
  ActivityCategory,
  ActivityActionType,
  TrashEntityType,
  User,
  UserRole,
} from '../../types';

type SettingsSubTab = 'FACTORY_INFO' | 'ACCOUNTS' | 'SOFT_DELETE' | 'ACTIVITY_LOG';

const ROLE_OPTIONS: { value: Exclude<UserRole, 'SUPER_ADMIN'>; label: string; emoji: string }[] = [
  { value: 'ADMIN', label: 'بەڕێوەبەر', emoji: '👔' },
  { value: 'ACCOUNTANT', label: 'ژمێریار', emoji: '🧮' },
  { value: 'REP', label: 'مەندوبی فرۆشتن', emoji: '🚚' },
  { value: 'CASHIER', label: 'کاشێری شۆرۆم', emoji: '🛒' },
];

const AVATAR_EMOJIS = ['👔', '👨‍💼', '🧮', '🚚', '🛒', '👷', '👤', '⭐'];

const TRASH_ENTITY_OPTIONS: { value: TrashEntityType; label: string }[] = [
  { value: 'INTAKE', label: 'وەسڵی وەرگرتن (کێڵگە)' },
  { value: 'DISPATCH', label: 'وەسڵی مەندوب و هەدیە' },
  { value: 'POS_SALE', label: 'وەسڵی شۆرۆم (POS)' },
  { value: 'RETURN', label: 'گەڕاوەی ٣ ڕۆژ' },
  { value: 'VOUCHER', label: 'سەنەدی پارەدان و قەرز' },
  { value: 'EXPENSE', label: 'خەرجی کارگە' },
  { value: 'BRANCH_EXPENSE', label: 'خەرجی شۆرۆم' },
  { value: 'CUSTOMER', label: 'کڕیاران (مارکێت)' },
  { value: 'SUPPLIER', label: 'کێڵگەکان (دابینکەر)' },
  { value: 'USER', label: 'ئەکاونتی بەکارهێنەر' },
];

export const SettingsView: React.FC = () => {
  const {
    factorySettings,
    updateFactorySettings,
    users,
    currentUser,
    addUser,
    updateUser,
    intakes,
    dispatches,
    posSales,
    returns,
    vouchers,
    expenses,
    branchExpenses,
    customers,
    suppliers,
    trashItems,
    softDeleteRecord,
    restoreTrashItem,
    permanentlyDeleteTrashItem,
    emptyTrash,
    activityLogs,
    clearActivityLogs,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('FACTORY_INFO');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'warn' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'warn' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  // ==========================================
  // 1. FACTORY INFO FORM STATE
  // ==========================================
  const [factoryForm, setFactoryForm] = useState({ ...factorySettings });

  const handleSaveFactoryInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryForm.factoryName.trim()) {
      showToast('تکایە ناوی کارگە بنووسە', 'warn');
      return;
    }
    updateFactorySettings({
      ...factoryForm,
      factoryName: factoryForm.factoryName.trim(),
      shortCode: factoryForm.shortCode.trim() || 'FFC-POS',
      returnWindowDays: Math.max(1, Number(factoryForm.returnWindowDays) || 3),
    });
    showToast('زانیارییەکانی کارگە بە سەرکەوتوویی پاشەکەوت کرا', 'success');
  };

  // ==========================================
  // 2. ACCOUNTS STATE (Never exposes isSuperAdmin)
  // ==========================================
  const visibleUsers = useMemo(() => users.filter(u => !u.isSuperAdmin), [users]);
  const [accountSearch, setAccountSearch] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<Exclude<UserRole, 'SUPER_ADMIN'>>('REP');
  const [userRoleTitleKu, setUserRoleTitleKu] = useState('مەندوبی فرۆشتن');
  const [userEmoji, setUserEmoji] = useState('🚚');
  const [userError, setUserError] = useState('');

  const filteredUsers = visibleUsers.filter(
    u =>
      u.name.toLowerCase().includes(accountSearch.toLowerCase()) ||
      u.phone.includes(accountSearch) ||
      u.roleTitleKu.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserName('');
    setUserPhone('');
    setUserPassword('');
    setUserRole('REP');
    setUserRoleTitleKu('مەندوبی فرۆشتن');
    setUserEmoji('🚚');
    setUserError('');
    setShowUserModal(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setUserName(u.name);
    setUserPhone(u.phone);
    setUserPassword('');
    setUserRole((u.role === 'SUPER_ADMIN' ? 'ADMIN' : u.role) as Exclude<UserRole, 'SUPER_ADMIN'>);
    setUserRoleTitleKu(u.roleTitleKu);
    setUserEmoji(u.avatarEmoji || '👤');
    setUserError('');
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');

    if (editingUser) {
      const res = updateUser(editingUser.id, {
        name: userName,
        phone: userPhone,
        password: userPassword || undefined,
        role: userRole,
        roleTitleKu: userRoleTitleKu.trim() || ROLE_OPTIONS.find(r => r.value === userRole)?.label || '',
        avatarEmoji: userEmoji,
      });
      if (!res.ok) {
        setUserError(res.error || 'هەڵە ڕوویدا');
        return;
      }
      setShowUserModal(false);
      showToast(`ئەکاونتی ${userName} نوێکرایەوە`, 'success');
    } else {
      const res = addUser({
        name: userName,
        phone: userPhone,
        password: userPassword,
        role: userRole,
        roleTitleKu: userRoleTitleKu.trim() || ROLE_OPTIONS.find(r => r.value === userRole)?.label || '',
        avatarEmoji: userEmoji,
        isActive: true,
      });
      if (!res.ok) {
        setUserError(res.error || 'هەڵە ڕوویدا');
        return;
      }
      setShowUserModal(false);
      showToast(`ئەکاونتی ${userName} بە سەرکەوتوویی دروستکرا`, 'success');
    }
  };

  const handleToggleUserActive = (u: User) => {
    if (u.id === currentUser.id) {
      showToast('ناتوانیت ئەکاونتی ئێستای خۆت ڕابگریت', 'warn');
      return;
    }
    const nextActive = u.isActive === false;
    updateUser(u.id, { isActive: nextActive });
    showToast(nextActive ? `ئەکاونتی ${u.name} چالاککرایەوە` : `ئەکاونتی ${u.name} ڕاگیرا`, 'success');
  };

  // ==========================================
  // 3. SOFT DELETE STATE
  // ==========================================
  const [trashFilterType, setTrashFilterType] = useState<'ALL' | TrashEntityType>('ALL');
  const [trashSearch, setTrashSearch] = useState('');
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const [sourceEntityType, setSourceEntityType] = useState<TrashEntityType>('DISPATCH');
  const [sourceSearch, setSourceSearch] = useState('');
  const [softDeleteReason, setSoftDeleteReason] = useState('');

  const filteredTrash = useMemo(() => {
    return trashItems.filter(item => {
      const matchesType = trashFilterType === 'ALL' || item.entityType === trashFilterType;
      const q = trashSearch.trim().toLowerCase();
      const matchesQ =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.entityLabelKu.toLowerCase().includes(q);
      return matchesType && matchesQ;
    });
  }, [trashItems, trashFilterType, trashSearch]);

  const activeSourceRecords = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase();
    let list: { id: string; title: string; subtitle: string; blocked?: boolean }[] = [];

    if (sourceEntityType === 'INTAKE') {
      list = intakes.map(i => ({
        id: i.id,
        title: `#${i.manualReceiptNo} • ${i.farmName}`,
        subtitle: `${i.date} • ${i.netWeightKg} کگم • ${i.totalAmount.toLocaleString()} د.ع`,
      }));
    } else if (sourceEntityType === 'DISPATCH') {
      list = dispatches.map(d => ({
        id: d.id,
        title: `#${d.manualReceiptNo} • ${d.customerName || d.destinationName}`,
        subtitle: `${d.date} • ${d.totalWeightKg} کگم • ${d.totalAmount.toLocaleString()} د.ع`,
      }));
    } else if (sourceEntityType === 'POS_SALE') {
      list = posSales.map(s => ({
        id: s.id,
        title: `#${s.saleNo} • ${s.customerName || 'کڕیار'}`,
        subtitle: `${s.date} • ${s.total.toLocaleString()} د.ع`,
      }));
    } else if (sourceEntityType === 'RETURN') {
      list = returns.map(r => ({
        id: r.id,
        title: `#${r.manualReceiptNo} • ${r.sourceName}`,
        subtitle: `${r.date} • ${r.totalWeightKg} کگم`,
      }));
    } else if (sourceEntityType === 'VOUCHER') {
      list = vouchers.map(v => ({
        id: v.id,
        title: `#${v.voucherNo} • ${v.partyName}`,
        subtitle: `${v.date} • ${v.amount.toLocaleString()} د.ع`,
      }));
    } else if (sourceEntityType === 'EXPENSE') {
      list = expenses.map(e => ({
        id: e.id,
        title: e.title,
        subtitle: `${e.date} • ${e.amount.toLocaleString()} د.ع`,
      }));
    } else if (sourceEntityType === 'BRANCH_EXPENSE') {
      list = branchExpenses.map(e => ({
        id: e.id,
        title: e.title,
        subtitle: `${e.date} • ${e.amount.toLocaleString()} د.ع`,
      }));
    } else if (sourceEntityType === 'CUSTOMER') {
      list = customers.map(c => ({
        id: c.id,
        title: c.name,
        subtitle: `قەرز: ${c.currentDebt.toLocaleString()} د.ع • ${c.phone || 'بێ ژمارە'}`,
      }));
    } else if (sourceEntityType === 'SUPPLIER') {
      list = suppliers.map(s => ({
        id: s.id,
        title: s.name,
        subtitle: `باڵانس: ${s.currentBalance.toLocaleString()} د.ع • ${s.phone}`,
      }));
    } else if (sourceEntityType === 'USER') {
      list = visibleUsers.map(u => ({
        id: u.id,
        title: u.name,
        subtitle: `${u.roleTitleKu} • ${u.phone}`,
        blocked: u.id === currentUser.id,
      }));
    }

    return list.filter(
      r => !q || r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
    );
  }, [
    sourceEntityType,
    sourceSearch,
    intakes,
    dispatches,
    posSales,
    returns,
    vouchers,
    expenses,
    branchExpenses,
    customers,
    suppliers,
    visibleUsers,
    currentUser.id,
  ]);

  const handleSoftDelete = (entityType: TrashEntityType, id: string, title: string) => {
    const ok = softDeleteRecord(entityType, id, softDeleteReason);
    if (ok) {
      showToast(`"${title}" نێردرا بۆ سەبەتەی سۆفت دیلیت`, 'success');
      setSoftDeleteReason('');
    } else {
      showToast('نەتوانرا ئەم تۆمارە سۆفت دیلیت بکرێت', 'warn');
    }
  };

  // ==========================================
  // 4. ACTIVITY LOG STATE
  // ==========================================
  const [logCategoryFilter, setLogCategoryFilter] = useState<'ALL' | ActivityCategory>('ALL');
  const [logDateFilter, setLogDateFilter] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [confirmClearLogs, setConfirmClearLogs] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredLogs = useMemo(() => {
    const q = logSearch.trim().toLowerCase();
    return activityLogs.filter(entry => {
      const catOk = logCategoryFilter === 'ALL' || entry.category === logCategoryFilter;
      const dateOk = !logDateFilter || entry.date === logDateFilter;
      const qOk =
        !q ||
        entry.title.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        entry.userName.toLowerCase().includes(q) ||
        (entry.refNo && entry.refNo.toLowerCase().includes(q));
      return catOk && dateOk && qOk;
    });
  }, [activityLogs, logCategoryFilter, logDateFilter, logSearch]);

  const getActionBadge = (action: ActivityActionType) => {
    switch (action) {
      case 'CREATE':
        return { label: 'دروستکردن', cls: 'bg-[#34C759]/12 text-[#1F7A34]' };
      case 'UPDATE':
        return { label: 'نوێکردنەوە', cls: 'bg-[#0071E3]/12 text-[#0071E3]' };
      case 'DELETE':
        return { label: 'سۆفت دیلیت', cls: 'bg-[#FF9500]/14 text-[#B25000]' };
      case 'RESTORE':
        return { label: 'گەڕاندنەوە', cls: 'bg-[#10B981]/12 text-[#047857]' };
      case 'PURGE':
        return { label: 'سڕینەوەی یەکجاری', cls: 'bg-[#FF3B30]/12 text-[#D70015]' };
      case 'LOGIN':
        return { label: 'چوونەژوورەوە', cls: 'bg-[#5856D6]/12 text-[#5856D6]' };
      case 'LOGOUT':
        return { label: 'چوونەدەرەوە', cls: 'bg-slate-200 text-slate-700' };
    }
  };

  const getCategoryLabel = (cat: ActivityCategory) => {
    switch (cat) {
      case 'AUTH':
        return 'چوونەژوورەوە';
      case 'INTAKE':
        return 'وەرگرتن';
      case 'PRODUCTION':
        return 'بەرهەمهێنان';
      case 'CUSTODY':
        return 'عەهدە';
      case 'SALES':
        return 'فرۆشتن';
      case 'RETURN':
        return 'گەڕاوە';
      case 'FINANCE':
        return 'دارایی و قەرز';
      case 'SETTINGS':
        return 'سیتین و ئەکاونت';
      case 'TRASH':
        return 'سۆفت دیلیت';
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 left-5 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-bold flex items-center gap-2 apple-sheet no-print ${
            toast.type === 'success'
              ? 'bg-[#1D1D1F] text-white border-black/10'
              : 'bg-[#FF9500] text-white border-[#FF9500]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="apple-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/12 text-[#0071E3] flex items-center justify-center shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              سیتینی کارگە، ئەکاونتەکان، سۆفت دیلیت و ئەکتیڤتی لۆگ
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              بەڕێوەبردنی زانیارییەکانی کارگە، دروستکردنی ئەکاونت بۆ کارمەندان، گەڕاندنەوەی سڕدراوەکان و چاودێری تۆماری چالاکییەکان
            </p>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="apple-segmented overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveSubTab('FACTORY_INFO')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'FACTORY_INFO' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>زانیاری کارگە</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ACCOUNTS')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'ACCOUNTS' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#5856D6]" />
            <span>ئەکاونتەکان ({visibleUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('SOFT_DELETE')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'SOFT_DELETE' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-[#FF9500]" />
            <span>سۆفت دیلیت ({trashItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ACTIVITY_LOG')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'ACTIVITY_LOG' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#34C759]" />
            <span>ئەکتیڤتی لۆگ ({activityLogs.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FACTORY INFO (زانیاری کارگە) */}
      {/* ========================================================================= */}
      {activeSubTab === 'FACTORY_INFO' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form onSubmit={handleSaveFactoryInfo} className="lg:col-span-8 apple-card p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#0071E3]" />
                زانیاری گشتی و ناسنامەی کارگە
              </h3>
              {factorySettings.updatedAt && (
                <span className="text-[11px] text-[#86868B] font-medium">
                  دوایین نوێکردنەوە: {factorySettings.updatedAt}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-[#515154] block mb-1.5">ناوی کارگە *</label>
                <input
                  type="text"
                  required
                  value={factoryForm.factoryName}
                  onChange={e => setFactoryForm(f => ({ ...f, factoryName: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-[#515154] block mb-1.5">کۆدی سیستەم (Short Code)</label>
                <input
                  type="text"
                  value={factoryForm.shortCode}
                  onChange={e => setFactoryForm(f => ({ ...f, shortCode: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-mono font-bold text-left"
                  dir="ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#515154] block mb-1.5">وەسف / ناونیشانی ژێر لۆگۆ</label>
                <input
                  type="text"
                  value={factoryForm.tagline}
                  onChange={e => setFactoryForm(f => ({ ...f, tagline: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[#515154] block mb-1.5">ناوی فرۆشگای تایبەت (شۆرۆم)</label>
                <input
                  type="text"
                  value={factoryForm.showroomName}
                  onChange={e => setFactoryForm(f => ({ ...f, showroomName: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-[#515154] block mb-1.5">ژمارەی مۆڵەت / تۆماری بازرگانی</label>
                <input
                  type="text"
                  value={factoryForm.licenseNo}
                  onChange={e => setFactoryForm(f => ({ ...f, licenseNo: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-[#515154] block mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#0071E3]" />
                  ژمارەی مۆبایلی ١
                </label>
                <input
                  type="text"
                  value={factoryForm.phone1}
                  onChange={e => setFactoryForm(f => ({ ...f, phone1: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-[#515154] block mb-1.5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-[#0071E3]" />
                  ژمارەی مۆبایلی ٢
                </label>
                <input
                  type="text"
                  value={factoryForm.phone2}
                  onChange={e => setFactoryForm(f => ({ ...f, phone2: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="font-bold text-[#515154] block mb-1.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#FF9500]" />
                  ناونیشانی کارگە
                </label>
                <input
                  type="text"
                  value={factoryForm.address}
                  onChange={e => setFactoryForm(f => ({ ...f, address: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#515154] block mb-1.5">دراو</label>
                  <input
                    type="text"
                    value={factoryForm.currency}
                    onChange={e => setFactoryForm(f => ({ ...f, currency: e.target.value }))}
                    className="apple-input w-full px-3.5 py-2.5 font-bold text-center"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#515154] block mb-1.5">ماوەی گەڕاوە (ڕۆژ)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={factoryForm.returnWindowDays}
                    onChange={e =>
                      setFactoryForm(f => ({ ...f, returnWindowDays: Number(e.target.value) || 3 }))
                    }
                    className="apple-input w-full px-3.5 py-2.5 font-bold text-center tabular-nums"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#515154] block mb-1.5 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-[#34C759]" />
                  تێبینی خوارەوەی وەسڵەکان
                </label>
                <input
                  type="text"
                  value={factoryForm.receiptFooter}
                  onChange={e => setFactoryForm(f => ({ ...f, receiptFooter: e.target.value }))}
                  className="apple-input w-full px-3.5 py-2.5"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-black/[0.06] flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                پاشەکەوتکردنی زانیاری کارگە
              </button>
            </div>
          </form>

          {/* Live Brand & Receipt Preview Card */}
          <div className="lg:col-span-4 space-y-4">
            <div className="apple-card p-5 space-y-4">
              <div className="text-xs font-extrabold text-[#1D1D1F] pb-2 border-b border-black/[0.06]">
                پێشبینینی ناسنامەی کارگە و وەسڵ
              </div>

              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0071E3] to-[#1D4ED8] flex items-center justify-center text-white text-xl shadow-xs">
                    🍗
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-[#1D1D1F]">
                      {factoryForm.factoryName || 'کارگەی مریشکی فرێش'}
                    </div>
                    <div className="text-[11px] font-bold text-[#0071E3]">
                      {factoryForm.shortCode || 'FFC-POS'} • {factoryForm.showroomName}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-[#515154] space-y-1 pt-2 border-t border-slate-200/70">
                  <div>ناونیشان: {factoryForm.address}</div>
                  <div dir="ltr" className="text-right font-mono">
                    {factoryForm.phone1} {factoryForm.phone2 ? `| ${factoryForm.phone2}` : ''}
                  </div>
                  <div>مۆڵەت: {factoryForm.licenseNo}</div>
                  <div>ماوەی گەڕاوەی فرێش: {factoryForm.returnWindowDays} ڕۆژ</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-dashed border-slate-300 text-center text-[11px] font-semibold text-[#515154]">
                  {factoryForm.receiptFooter}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACCOUNTS MANAGEMENT (دروستکردنی ئەکاونتەکان) */}
      {/* ========================================================================= */}
      {activeSubTab === 'ACCOUNTS' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">کۆی ئەکاونتەکان</div>
              <div className="text-2xl font-black text-[#1D1D1F] mt-1 tabular-nums">
                {visibleUsers.length}
              </div>
            </div>
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">ئەکاونتی چالاک</div>
              <div className="text-2xl font-black text-[#34C759] mt-1 tabular-nums">
                {visibleUsers.filter(u => u.isActive !== false).length}
              </div>
            </div>
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">بەڕێوەبەر و ژمێریار</div>
              <div className="text-2xl font-black text-[#0071E3] mt-1 tabular-nums">
                {visibleUsers.filter(u => u.role === 'ADMIN' || u.role === 'ACCOUNTANT').length}
              </div>
            </div>
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">مەندوب و کاشێر</div>
              <div className="text-2xl font-black text-[#5856D6] mt-1 tabular-nums">
                {visibleUsers.filter(u => u.role === 'REP' || u.role === 'CASHIER').length}
              </div>
            </div>
          </div>

          {/* Search & Create Bar */}
          <div className="apple-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#86868B] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={accountSearch}
                onChange={e => setAccountSearch(e.target.value)}
                placeholder="گەڕان بەپێی ناو، ژ. مۆبایل یان ڕۆڵ..."
                className="apple-input w-full pr-10 pl-4 py-2 text-xs font-medium"
              />
            </div>

            <button
              type="button"
              onClick={openCreateUserModal}
              className="px-5 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              دروستکردنی ئەکاونتی نوێ
            </button>
          </div>

          {/* Users Table */}
          <div className="apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#FBFBFD] border-b border-black/[0.06] text-[#86868B] font-bold">
                    <th className="p-3.5">کارمەند</th>
                    <th className="p-3.5">ژمارەی مۆبایل (لۆگین)</th>
                    <th className="p-3.5">ڕۆڵ و دەسەڵات</th>
                    <th className="p-3.5 text-center">دۆخ</th>
                    <th className="p-3.5 text-left">کردارەکان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {filteredUsers.map(u => {
                    const isActive = u.isActive !== false;
                    const isSelf = u.id === currentUser.id;
                    return (
                      <tr key={u.id} className="hover:bg-[#F8FAFC] transition-colors">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-2xl bg-[#F5F5F7] flex items-center justify-center text-lg">
                              {u.avatarEmoji || '👤'}
                            </span>
                            <div>
                              <div className="font-extrabold text-[#1D1D1F] flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] font-bold">
                                    تۆ
                                  </span>
                                )}
                              </div>
                              {u.createdAt && (
                                <div className="text-[10px] text-[#86868B]">دروستکراوە: {u.createdAt}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#1D1D1F]" dir="ltr">
                          <span className="inline-block w-full text-right">{u.phone}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6FF] text-[#1D4ED8] font-bold text-[11px]">
                            <Shield className="w-3 h-3" />
                            {u.roleTitleKu}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                              isActive
                                ? 'bg-[#34C759]/12 text-[#1F7A34] hover:bg-[#34C759]/20'
                                : 'bg-[#FF3B30]/12 text-[#D70015] hover:bg-[#FF3B30]/20'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <UserCheck className="w-3 h-3" />
                                چالاک
                              </>
                            ) : (
                              <>
                                <UserX className="w-3 h-3" />
                                ڕاگیراو
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditUserModal(u)}
                              className="px-3 py-1.5 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-[#0071E3]" />
                              دەستکاری
                            </button>
                            <button
                              type="button"
                              disabled={isSelf}
                              onClick={() => handleSoftDelete('USER', u.id, u.name)}
                              className="px-3 py-1.5 rounded-full bg-[#FF3B30]/8 hover:bg-[#FF3B30]/15 text-[#D70015] font-semibold text-[11px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              title={isSelf ? 'ناتوانرێت ئەکاونتی ئێستات بسڕیتەوە' : 'سۆفت دیلیت'}
                            >
                              <Trash2 className="w-3 h-3" />
                              سۆفت دیلیت
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SOFT DELETE & RESTORE (سۆفت دیلیت و گەڕاندنەوە) */}
      {/* ========================================================================= */}
      {activeSubTab === 'SOFT_DELETE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left/First: Trash Bin (Restore / Purge) */}
          <div className="lg:col-span-7 apple-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
              <div>
                <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-[#FF9500]" />
                  سەبەتەی سۆفت دیلیت ({trashItems.length})
                </h3>
                <p className="text-[11px] text-[#86868B] mt-0.5">
                  هەر تۆمارێک لێرە بێت دەتوانرێت بگەڕێندرێتەوە بۆ سیستەم یان بە یەکجاری بسڕدرێتەوە
                </p>
              </div>

              {trashItems.length > 0 && (
                <div>
                  {!confirmEmptyTrash ? (
                    <button
                      type="button"
                      onClick={() => setConfirmEmptyTrash(true)}
                      className="px-3.5 py-1.5 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/18 text-[#D70015] font-bold text-[11px] cursor-pointer"
                    >
                      بەتاڵکردنەوەی سەبەتە
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          emptyTrash();
                          setConfirmEmptyTrash(false);
                          showToast('سەبەتەی سۆفت دیلیت بەتاڵکرایەوە', 'success');
                        }}
                        className="px-3 py-1 rounded-full bg-[#FF3B30] text-white font-bold text-[11px] cursor-pointer"
                      >
                        دڵنیام بیسڕەوە
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmEmptyTrash(false)}
                        className="px-2.5 py-1 rounded-full bg-[#F5F5F7] text-[#515154] font-semibold text-[11px] cursor-pointer"
                      >
                        نەخێر
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#86868B] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={trashSearch}
                  onChange={e => setTrashSearch(e.target.value)}
                  placeholder="گەڕان لە سەبەتەدا..."
                  className="apple-input w-full pr-9 pl-3 py-2 text-xs"
                />
              </div>
              <select
                value={trashFilterType}
                onChange={e => setTrashFilterType(e.target.value as 'ALL' | TrashEntityType)}
                className="apple-input px-3 py-2 text-xs font-semibold"
              >
                <option value="ALL">هەموو جۆرەکان</option>
                {TRASH_ENTITY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-black/[0.05] max-h-[520px] overflow-y-auto">
              {filteredTrash.length === 0 ? (
                <div className="py-14 text-center text-xs text-[#86868B]">
                  سەبەتەی سۆفت دیلیت بەتاڵە — هیچ تۆمارێکی سڕدراو نییە.
                </div>
              ) : (
                filteredTrash.map(item => (
                  <div
                    key={item.id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-full bg-[#FF9500]/12 text-[#B25000] text-[10px] font-bold">
                          {item.entityLabelKu}
                        </span>
                        <span className="font-extrabold text-xs text-[#1D1D1F]">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-[#515154]">{item.subtitle}</div>
                      <div className="text-[10px] text-[#86868B] flex items-center gap-2 flex-wrap">
                        <span>سڕدراوە لەلایەن: {item.deletedBy}</span>
                        <span>• {item.deletedAt} {item.deletedTime}</span>
                        {item.reason && <span className="text-[#B25000]">• هۆکار: {item.reason}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          restoreTrashItem(item.id);
                          showToast(`"${item.title}" گەڕێندرایەوە`, 'success');
                        }}
                        className="px-3 py-1.5 rounded-full bg-[#34C759]/12 hover:bg-[#34C759]/22 text-[#1F7A34] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        گەڕاندنەوە
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          permanentlyDeleteTrashItem(item.id);
                          showToast(`"${item.title}" بە یەکجاری سڕایەوە`, 'warn');
                        }}
                        className="px-2.5 py-1.5 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#D70015] font-bold text-[11px] cursor-pointer"
                        title="سڕینەوەی یەکجاری"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right/Second: Soft Delete Records from Live Data */}
          <div className="lg:col-span-5 apple-card p-5 space-y-4">
            <div className="pb-3 border-b border-black/[0.06]">
              <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
                سۆفت دیلیتی تۆمارە چالاکەکان
              </h3>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                جۆری تۆمار هەڵبژێرە بۆ ناردنی وەسڵ یان تۆمارێکی هەڵە بۆ سەبەتەی سۆفت دیلیت
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-[#515154] block mb-1">جۆری تۆمار:</label>
                <select
                  value={sourceEntityType}
                  onChange={e => setSourceEntityType(e.target.value as TrashEntityType)}
                  className="apple-input w-full px-3 py-2 font-bold text-xs"
                >
                  {TRASH_ENTITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#86868B] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sourceSearch}
                    onChange={e => setSourceSearch(e.target.value)}
                    placeholder="گەڕان لە تۆمارەکان..."
                    className="apple-input w-full pr-9 pl-3 py-2 text-xs"
                  />
                </div>
                <input
                  type="text"
                  value={softDeleteReason}
                  onChange={e => setSoftDeleteReason(e.target.value)}
                  placeholder="هۆکاری سڕینەوە (ئارەزوومەندانە)..."
                  className="apple-input w-full px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="divide-y divide-black/[0.05] max-h-[420px] overflow-y-auto">
              {activeSourceRecords.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#86868B]">
                  هیچ تۆمارێکی چالاک لەم بەشەدا نەدۆزرایەوە
                </div>
              ) : (
                activeSourceRecords.map(rec => (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-[#1D1D1F] truncate">{rec.title}</div>
                      <div className="text-[10px] text-[#86868B] truncate">{rec.subtitle}</div>
                    </div>
                    <button
                      type="button"
                      disabled={rec.blocked}
                      onClick={() => handleSoftDelete(sourceEntityType, rec.id, rec.title)}
                      className="px-3 py-1.5 rounded-full bg-[#FF9500]/12 hover:bg-[#FF9500]/22 text-[#B25000] font-bold text-[11px] shrink-0 disabled:opacity-40 cursor-pointer"
                    >
                      سۆفت دیلیت
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: ACTIVITY LOG (ئەکتیڤتی لۆگ) */}
      {/* ========================================================================= */}
      {activeSubTab === 'ACTIVITY_LOG' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 no-print">
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">کۆی چالاکی تۆمارکراو</div>
              <div className="text-2xl font-black text-[#1D1D1F] mt-1 tabular-nums">
                {activityLogs.length}
              </div>
            </div>
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">چالاکییەکانی ئەمڕۆ</div>
              <div className="text-2xl font-black text-[#0071E3] mt-1 tabular-nums">
                {activityLogs.filter(l => l.date === todayStr).length}
              </div>
            </div>
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">سۆفت دیلیت و گەڕاندنەوە</div>
              <div className="text-2xl font-black text-[#FF9500] mt-1 tabular-nums">
                {activityLogs.filter(l => l.category === 'TRASH').length}
              </div>
            </div>
            <div className="apple-card p-4">
              <div className="text-[11px] font-semibold text-[#86868B]">چوونەژوورەوە و ڕێکخستن</div>
              <div className="text-2xl font-black text-[#5856D6] mt-1 tabular-nums">
                {activityLogs.filter(l => l.category === 'AUTH' || l.category === 'SETTINGS').length}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="apple-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#86868B] absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="گەڕان بەپێی کارمەند، وەسڵ یان وردەکاری..."
                  className="apple-input w-full pr-9 pl-3 py-2 text-xs"
                />
              </div>

              <select
                value={logCategoryFilter}
                onChange={e => setLogCategoryFilter(e.target.value as 'ALL' | ActivityCategory)}
                className="apple-input px-3 py-2 text-xs font-semibold"
              >
                <option value="ALL">هەموو بەشەکان</option>
                <option value="AUTH">چوونەژوورەوە</option>
                <option value="INTAKE">وەرگرتن</option>
                <option value="PRODUCTION">بەرهەمهێنان</option>
                <option value="CUSTODY">عەهدە</option>
                <option value="SALES">فرۆشتن</option>
                <option value="RETURN">گەڕاوە</option>
                <option value="FINANCE">دارایی و قەرز</option>
                <option value="SETTINGS">سیتین و ئەکاونت</option>
                <option value="TRASH">سۆفت دیلیت</option>
              </select>

              <input
                type="date"
                value={logDateFilter}
                onChange={e => setLogDateFilter(e.target.value)}
                className="apple-input px-3 py-2 text-xs font-medium"
              />
              {logDateFilter && (
                <button
                  type="button"
                  onClick={() => setLogDateFilter('')}
                  className="px-2.5 py-1.5 rounded-full bg-[#F5F5F7] text-[11px] font-bold text-[#515154]"
                >
                  هەموو ڕۆژەکان
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
                چاپکردن
              </button>

              {!confirmClearLogs ? (
                <button
                  type="button"
                  onClick={() => setConfirmClearLogs(true)}
                  className="px-3.5 py-2 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30]/18 text-[#D70015] font-bold text-xs cursor-pointer"
                >
                  پاککردنەوەی لۆگ
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      clearActivityLogs();
                      setConfirmClearLogs(false);
                      showToast('لۆگی چالاکییەکان پاککرایەوە', 'success');
                    }}
                    className="px-3 py-1.5 rounded-full bg-[#FF3B30] text-white font-bold text-xs cursor-pointer"
                  >
                    دڵنیام پاکبکرێتەوە
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearLogs(false)}
                    className="px-2.5 py-1.5 rounded-full bg-[#F5F5F7] text-[#515154] font-semibold text-xs cursor-pointer"
                  >
                    نەخێر
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Activity Table */}
          <div className="apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#FBFBFD] border-b border-black/[0.06] text-[#86868B] font-bold">
                    <th className="p-3.5">بەروار و کات</th>
                    <th className="p-3.5">کارمەند</th>
                    <th className="p-3.5">بەش</th>
                    <th className="p-3.5">جۆری کردار</th>
                    <th className="p-3.5">ناونیشان و وردەکاری</th>
                    <th className="p-3.5 text-left">ژ. سەرچاوە</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05]">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-14 text-center text-[#86868B]">
                        هێشتا هیچ چالاکییەک تۆمار نەکراوە یان لەگەڵ گەڕانەکەدا ناگونجێت.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map(entry => {
                      const badge = getActionBadge(entry.action);
                      return (
                        <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors">
                          <td className="p-3.5 whitespace-nowrap">
                            <div className="font-bold text-[#1D1D1F] tabular-nums flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#86868B]" />
                              {entry.date}
                            </div>
                            <div className="text-[10px] text-[#86868B] tabular-nums pr-4">
                              {entry.time}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-[#1D1D1F]">{entry.userName}</div>
                            <div className="text-[10px] text-[#0071E3] font-semibold">
                              {entry.userRoleTitle}
                            </div>
                          </td>
                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                              {getCategoryLabel(entry.category)}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badge.cls}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-[#1D1D1F]">{entry.title}</div>
                            <div className="text-[11px] text-[#515154] mt-0.5">{entry.details}</div>
                          </td>
                          <td className="p-3.5 text-left font-mono text-[11px] font-bold text-[#0071E3]">
                            {entry.refNo ? `#${entry.refNo}` : '---'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CREATE / EDIT USER MODAL */}
      {/* ========================================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-[#1D1D1F]">
                {editingUser ? `دەستکاریکردنی ئەکاونتی ${editingUser.name}` : 'دروستکردنی ئەکاونتی نوێ'}
              </h3>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#515154] mb-1">ناوی تەواوی کارمەند *</label>
                <input
                  type="text"
                  required
                  placeholder="نموونە: هێمن عومەر"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="apple-input w-full px-3.5 py-2.5 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#515154] mb-1">ژمارەی مۆبایل (بۆ لۆگین) *</label>
                  <input
                    type="text"
                    required
                    placeholder="0770..."
                    value={userPhone}
                    onChange={e => setUserPhone(e.target.value)}
                    className="apple-input w-full px-3.5 py-2.5 font-mono font-bold text-left"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#515154] mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#0071E3]" />
                    {editingUser ? 'وشەی نهێنی نوێ (ئارەزوومەندانە)' : 'وشەی نهێنی *'}
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    placeholder={editingUser ? 'بەتاڵی بهێڵە بۆ نەگۆڕین' : '1234'}
                    value={userPassword}
                    onChange={e => setUserPassword(e.target.value)}
                    className="apple-input w-full px-3.5 py-2.5 font-mono font-bold text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#515154] mb-1">ئاستی دەسەڵات (Role)</label>
                  <select
                    value={userRole}
                    onChange={e => {
                      const val = e.target.value as Exclude<UserRole, 'SUPER_ADMIN'>;
                      setUserRole(val);
                      const matched = ROLE_OPTIONS.find(r => r.value === val);
                      if (matched) {
                        setUserRoleTitleKu(matched.label);
                        setUserEmoji(matched.emoji);
                      }
                    }}
                    className="apple-input w-full px-3 py-2.5 font-bold"
                  >
                    {ROLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.emoji} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#515154] mb-1">ناونیشانی پیشە</label>
                  <input
                    type="text"
                    value={userRoleTitleKu}
                    onChange={e => setUserRoleTitleKu(e.target.value)}
                    className="apple-input w-full px-3 py-2.5 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#515154] mb-1">ئایکۆن (Avatar)</label>
                <div className="flex flex-wrap gap-1.5">
                  {AVATAR_EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setUserEmoji(em)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border transition-all cursor-pointer ${
                        userEmoji === em
                          ? 'bg-[#EFF6FF] border-[#0071E3] scale-105'
                          : 'bg-[#F5F5F7] border-transparent hover:bg-slate-200'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>

              {userError && (
                <div className="p-2.5 rounded-xl bg-[#FF3B30]/10 text-[#D70015] font-bold text-center">
                  {userError}
                </div>
              )}

              <div className="flex gap-2.5 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="w-1/2 py-2.5 bg-[#F5F5F7] text-[#515154] rounded-full font-semibold cursor-pointer"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-full cursor-pointer"
                >
                  {editingUser ? 'پاشەکەوتکردن' : 'دروستکردنی ئەکاونت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
