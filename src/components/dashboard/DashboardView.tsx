import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  Factory,
  PackageCheck,
  RotateCcw,
  Users,
  ArrowUpRight,
  Gift,
  Store,
  ShoppingBag,
  Boxes,
  Calculator,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { TabType } from '../../types';

interface DashboardViewProps {
  setActiveTab: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const {
    intakes,
    products,
    dispatches,
    returns,
    customers,
    suppliers,
    branchStock,
    posSales,
    custodyTransfers,
    branchDeliveries,
    factorySettings,
    currentUser,
    hasAccess,
  } = useApp();

  const totalLiveIntakeKg = intakes.reduce((sum, i) => sum + i.netWeightKg, 0);
  const totalReadyStockKg = products.reduce((sum, p) => sum + p.inStockKg, 0);
  const totalReturnsKg = returns.reduce((sum, r) => sum + r.totalWeightKg, 0);
  const totalReturnsLoss = returns.reduce((sum, r) => sum + r.totalLossAmount, 0);
  const totalCustomerDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  const repSalesList = dispatches.filter(d => d.destinationType === 'REP');
  const repSalesKg = repSalesList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const repSalesIQD = repSalesList.reduce((sum, d) => sum + d.totalAmount, 0);

  const giftKg = dispatches
    .filter(d => d.destinationType === 'GIFT')
    .reduce((sum, d) => sum + d.totalWeightKg, 0);

  const totalBranchStockKg = branchStock.reduce((sum, b) => sum + b.inStockKg, 0);
  const totalPOSSalesIQD = posSales.reduce((sum, s) => sum + s.total, 0);

  // Automatic 3-Day Freshness Expiry Alert (Batches in Rep Custody or Showroom near/past returnWindowDays)
  const freshWindowDays = factorySettings.returnWindowDays || 3;
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const expiryWarnings = [
    ...custodyTransfers
      .filter(t => t.direction === 'LOAD')
      .map(t => {
        const dMs = new Date(t.date.slice(0, 10)).getTime();
        const ageDays = Number.isFinite(dMs) ? Math.floor((todayMs - dMs) / 86400000) : 0;
        return {
          id: t.id,
          label: `${t.holderName} • وەسڵ #${t.receiptNo}`,
          date: t.date,
          weightKg: t.totalWeightKg,
          ageDays,
          targetTab: 'custody' as TabType,
        };
      }),
    ...branchDeliveries.map(b => {
      const dMs = new Date(b.date.slice(0, 10)).getTime();
      const ageDays = Number.isFinite(dMs) ? Math.floor((todayMs - dMs) / 86400000) : 0;
      return {
        id: b.id,
        label: `فرۆشگای شۆرۆم • وەسڵ #${b.manualReceiptNo}`,
        date: b.date,
        weightKg: b.totalWeightKg,
        ageDays,
        targetTab: 'pos' as TabType,
      };
    }),
  ].filter(w => w.ageDays >= Math.max(2, freshWindowDays - 1));

  const formatIQD = (val: number) => `${val.toLocaleString()} د.ع`;

  const isCashier = currentUser.role === 'CASHIER';
  const isRep = currentUser.role === 'REP';
  const displayName = currentUser.role === 'SUPER_ADMIN' ? 'بەڕێوەبەری کارگە' : currentUser.name;
  const displayRole = currentUser.role === 'SUPER_ADMIN' ? 'بەڕێوەبەر' : currentUser.roleTitleKu;
  const displayEmoji = currentUser.role === 'SUPER_ADMIN' ? '👔' : currentUser.avatarEmoji || '👤';

  return (
    <div className="space-y-6">
      {/* Apple Control Center Hero Card */}
      <div className="apple-card p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 bg-[#0071E3]/10 text-[#0071E3] px-3 py-1 rounded-full text-[11px] font-bold">
            <span>{displayEmoji}</span>
            <span>داشبۆردی زیرەک • {displayRole}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1D1D1F] tracking-tight mt-3">
            بەخێربێیت، {displayName}
          </h2>
          <p className="text-[#86868B] text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            {isCashier
              ? 'کۆگا، فرۆشتنی خێرا بە بارکۆد و تەرازوو، وەسڵی 80mm و سەندوقی شۆرۆم.'
              : isRep
              ? 'بەڕێوەبردنی فرۆشی مەندوبان، دیاری و هەدیە، و گەڕاوەی ٣ ڕۆژ.'
              : 'بەڕێوەبردنی تەواوی وەرگرتنی زیندوو، مەندوبان، فرۆشگای POS، گەڕاوەی ٣ ڕۆژ و کەشف حساب.'}
          </p>
        </div>

        {/* Role-Filtered Action Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {hasAccess('intake') && (
            <button
              onClick={() => setActiveTab('intake')}
              className="px-4 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Truck className="w-3.5 h-3.5" />
              + باری کێڵگە
            </button>
          )}

          {hasAccess('production') && (
            <button
              onClick={() => setActiveTab('production')}
              className="px-4 py-2.5 bg-[#5856D6]/15 hover:bg-[#5856D6]/25 text-[#4947C2] font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <Factory className="w-3.5 h-3.5 text-[#5856D6]" />
              سەربڕین و پارچەکردن
            </button>
          )}

          {hasAccess('ready-for-sale') && (
            <button
              onClick={() => setActiveTab('ready-for-sale')}
              className="px-4 py-2.5 bg-[#34C759]/15 hover:bg-[#34C759]/25 text-[#1B7A34] font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <PackageCheck className="w-3.5 h-3.5 text-[#248A3D]" />
              ئامادە بۆ فرۆشتن
            </button>
          )}

          {hasAccess('rep-sales') && (
            <button
              onClick={() => setActiveTab('rep-sales')}
              className="px-4 py-2.5 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#34C759]" />
              فرۆشتنی مەندوب و گەڕاوە
            </button>
          )}

          {hasAccess('pos') && (
            <button
              onClick={() => setActiveTab('pos')}
              className="px-4 py-2.5 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <Store className="w-3.5 h-3.5" />
              فرۆشگای POS
            </button>
          )}
        </div>
      </div>

      {/* Automatic 3-Day Freshness Expiry Alert */}
      {expiryWarnings.length > 0 && (hasAccess('custody') || hasAccess('pos')) && (
        <div className="p-4 rounded-3xl bg-[#FF9500]/10 border border-[#FF9500]/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF9500] text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#9A3412]">
                ئاگادارکردنەوەی ماوەی فرێش ({freshWindowDays} ڕۆژ): {expiryWarnings.length} باری مەندوب / شۆرۆم ماوەکەیان نزیکبووەتەوە یان تێپەڕیوە!
              </div>
              <div className="text-[11px] text-[#7C2D12] mt-0.5 flex flex-wrap gap-2">
                {expiryWarnings.slice(0, 3).map(w => (
                  <span key={w.id} className="bg-white/70 px-2 py-0.5 rounded-full font-bold">
                    {w.label} ({w.ageDays} ڕۆژ • {w.weightKg} کگم)
                  </span>
                ))}
              </div>
            </div>
          </div>
          {hasAccess('custody') && (
            <button
              type="button"
              onClick={() => setActiveTab('custody')}
              className="px-4 py-2 rounded-full bg-[#FF9500] hover:bg-[#E08600] text-white text-xs font-bold shrink-0 transition-all"
            >
              پشکنینی عەهدە و گەڕاوە
            </button>
          )}
        </div>
      )}

      {/* Bento KPI Grid (Strictly RBAC Filtered) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {hasAccess('intake') && (
          <div className="apple-card apple-card-hover p-5">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">کێشی زیندووی هاتوو</span>
              <div className="w-8 h-8 rounded-full bg-[#FF9500]/12 text-[#FF9500] flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#1D1D1F] tabular-nums">
              {totalLiveIntakeKg.toLocaleString()}{' '}
              <span className="text-xs font-medium text-[#86868B]">کگم</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between">
              <span>وەجبەکانی کێڵگە:</span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">{intakes.length} وەسڵ</span>
            </div>
          </div>
        )}

        {hasAccess('rep-sales') && (
          <div className="apple-card apple-card-hover p-5">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">فرۆشی مەندوبەکان</span>
              <div className="w-8 h-8 rounded-full bg-[#34C759]/12 text-[#248A3D] flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#1D1D1F] tabular-nums">
              {repSalesKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between">
              <span>داهاتی مەندوب:</span>
              <span className="font-bold text-[#248A3D] tabular-nums">{formatIQD(repSalesIQD)}</span>
            </div>
          </div>
        )}

        {hasAccess('pos') && (
          <div className="apple-card apple-card-hover p-5">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">فرۆشی شۆرۆم (POS)</span>
              <div className="w-8 h-8 rounded-full bg-[#0071E3]/12 text-[#0071E3] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0071E3] tabular-nums">
              {formatIQD(totalPOSSalesIQD)}
            </div>
            <div className="text-xs text-[#86868B] mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between">
              <span>کۆگای شۆرۆم:</span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">{totalBranchStockKg.toFixed(1)} کگم</span>
            </div>
          </div>
        )}

        {isCashier && (
          <div className="apple-card apple-card-hover p-5">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">مەخزەنی سەلاجەی فرۆشگا</span>
              <div className="w-8 h-8 rounded-full bg-[#34C759]/12 text-[#248A3D] flex items-center justify-center">
                <Boxes className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#248A3D] tabular-nums">
              {totalBranchStockKg.toFixed(1)} <span className="text-xs font-medium text-[#86868B]">کگم</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between">
              <span>ژمارەی وەسڵەکان:</span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">{posSales.length} وەسڵ</span>
            </div>
          </div>
        )}

        {hasAccess('returns') && (
          <div className="apple-card apple-card-hover p-5">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">گەڕاوە و تەلەفی ٣ ڕۆژ</span>
              <div className="w-8 h-8 rounded-full bg-[#FF3B30]/12 text-[#FF3B30] flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#FF3B30] tabular-nums">
              {totalReturnsKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between">
              <span>زیانی تەلەف:</span>
              <span className="font-bold text-[#FF3B30] tabular-nums">-{formatIQD(totalReturnsLoss)}</span>
            </div>
          </div>
        )}

        {hasAccess('accounting') && (
          <div className="apple-card apple-card-hover p-5">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">قەرزی بازاڕ (مارکێتەکان)</span>
              <div className="w-8 h-8 rounded-full bg-[#5856D6]/12 text-[#5856D6] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#5856D6] tabular-nums">
              {formatIQD(totalCustomerDebt)}
            </div>
            <div className="text-xs text-[#86868B] mt-3 pt-2.5 border-t border-black/[0.05] flex items-center justify-between">
              <span>قەرزی کێڵگەکان:</span>
              <span className="font-bold text-[#FF9500] tabular-nums">{formatIQD(totalSupplierDebt)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Role-Specific Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasAccess('ready-for-sale') && (
          <button
            type="button"
            onClick={() => setActiveTab('ready-for-sale')}
            className="apple-card apple-card-hover p-5 text-right flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-1 rounded-full">
                  ئامادە بۆ فرۆشتن
                </span>
                <PackageCheck className="w-4 h-4 text-[#0071E3]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">کۆگای بەرهەمە ئامادەکان</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                ئامادەکردنی باری کێڵگە و فرۆشتنی ڕاستەوخۆی بەرهەمە پاککراوەکان لە کارگەوە.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs w-full">
              <span className="text-[#86868B]">کۆی بەرهەمی ئامادە:</span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">{totalReadyStockKg.toLocaleString()} کگم</span>
            </div>
          </button>
        )}

        {hasAccess('rep-sales') && (
          <button
            type="button"
            onClick={() => setActiveTab('rep-sales')}
            className="apple-card apple-card-hover p-5 text-right flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-1 rounded-full">
                  فرۆشتنی مەندوب و گەڕاوە
                </span>
                <Truck className="w-4 h-4 text-[#0071E3]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">فرۆش و گەڕاوەی ٣ ڕۆژ</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                تۆمارکردنی فرۆشی مەندوب بە وەسڵی دەستی و گەڕاوەی تەلەف بە هەمان ژمارەی وەسڵ.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs w-full">
              <span className="text-[#86868B]">کۆی باری فرۆشراو:</span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">{repSalesKg.toLocaleString()} کگم</span>
            </div>
          </button>
        )}

        {hasAccess('pos') && (
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="apple-card apple-card-hover p-5 text-right flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#248A3D] bg-[#34C759]/12 px-2.5 py-1 rounded-full">
                  فرۆشگای تایبەت (شۆرۆم)
                </span>
                <Store className="w-4 h-4 text-[#34C759]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">پۆسی کاشێر و کۆگای بارکۆد</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                داخلکردنی کۆگا و فرۆشتن بە سکانەری بارکۆد و تەرازوو لەگەڵ وەسڵی 80mm.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs w-full">
              <span className="text-[#86868B]">کۆگای شۆرۆم:</span>
              <span className="font-bold text-[#1D1D1F] tabular-nums">{totalBranchStockKg.toFixed(1)} کگم</span>
            </div>
          </button>
        )}

        {hasAccess('gifts') && (
          <button
            type="button"
            onClick={() => setActiveTab('gifts')}
            className="apple-card apple-card-hover p-5 text-right flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#AF52DE] bg-[#AF52DE]/12 px-2.5 py-1 rounded-full">
                  دیاری و هەدیە
                </span>
                <Gift className="w-4 h-4 text-[#AF52DE]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">هەدیە و نموونەی بەلاش</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                دەرکردنی بەرهەم بە نرخی ٠ دینار بە وەسڵی فەرمی لە کۆگای کارگە.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs w-full">
              <span className="text-[#86868B]">کۆی بەخشراو:</span>
              <span className="font-bold text-[#AF52DE] tabular-nums">{giftKg.toLocaleString()} کگم</span>
            </div>
          </button>
        )}

        {hasAccess('accounting') && (
          <button
            type="button"
            onClick={() => setActiveTab('accounting')}
            className="apple-card apple-card-hover p-5 text-right flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#5856D6] bg-[#5856D6]/12 px-2.5 py-1 rounded-full">
                  ژمێریاری و سافکردن
                </span>
                <Calculator className="w-4 h-4 text-[#5856D6]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">کەشف حساب و سەنەدات</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                سافکردنی قەرز بە کات و بەروار، دەرهێنانی کەشف حساب بە ناو یان بەروار بۆ بەروار.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs w-full">
              <span className="text-[#86868B]">قەرزی مارکێتەکان:</span>
              <span className="font-bold text-[#5856D6] tabular-nums">{formatIQD(totalCustomerDebt)}</span>
            </div>
          </button>
        )}

        {hasAccess('reports') && (
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="apple-card apple-card-hover p-5 text-right flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#FF9500] bg-[#FF9500]/12 px-2.5 py-1 rounded-full">
                  قازانج و خەرجی (P&L)
                </span>
                <FileSpreadsheet className="w-4 h-4 text-[#FF9500]" />
              </div>
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">ڕاپۆرتی دارایی گشتی</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                پوختەی داهات، تێچووی کێڵگە، تەلەفی ٣ ڕۆژ، خەرجی کارگە و قازانجی خاوێن.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between text-xs w-full">
              <span className="text-[#86868B]">تەلەفی ٣ ڕۆژ:</span>
              <span className="font-bold text-[#FF3B30] tabular-nums">-{formatIQD(totalReturnsLoss)}</span>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};
