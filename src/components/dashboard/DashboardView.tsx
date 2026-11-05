import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  Truck,
  RotateCcw,
  Users,
  ArrowUpRight,
  Gift,
  Store,
  ShoppingBag,
  CreditCard,
  Boxes,
} from 'lucide-react';
import { TabType } from '../layout/Sidebar';

interface DashboardViewProps {
  setActiveTab: (tab: TabType) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab }) => {
  const { intakes, dispatches, returns, customers, suppliers, branchStock, posSales, currentUser, hasAccess } = useApp();

  // Computations
  const totalLiveIntakeKg = intakes.reduce((sum, i) => sum + i.netWeightKg, 0);
  const totalDispatchedKg = dispatches.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const totalSalesRevenue = dispatches.reduce((sum, d) => sum + d.totalAmount, 0);

  const totalReturnsKg = returns.reduce((sum, r) => sum + r.totalWeightKg, 0);
  const totalReturnsLoss = returns.reduce((sum, r) => sum + r.totalLossAmount, 0);

  const totalCustomerDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const totalSupplierDebt = suppliers.reduce((sum, s) => sum + s.currentBalance, 0);

  // Rep Sales Breakdown
  const repSalesList = dispatches.filter(d => d.destinationType === 'REP');
  const repSalesKg = repSalesList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const repSalesIQD = repSalesList.reduce((sum, d) => sum + d.totalAmount, 0);

  const branchSalesKg = dispatches
    .filter(d => d.destinationType === 'BRANCH')
    .reduce((sum, d) => sum + d.totalWeightKg, 0);

  const giftKg = dispatches
    .filter(d => d.destinationType === 'GIFT')
    .reduce((sum, d) => sum + d.totalWeightKg, 0);

  const totalBranchStockKg = branchStock.reduce((sum, b) => sum + b.inStockKg, 0);
  const totalPOSSalesIQD = posSales.reduce((sum, s) => sum + s.total, 0);

  const formatIQD = (val: number) => {
    return new Intl.NumberFormat('ckb-IQ').format(val) + ' د.ع';
  };

  const isCashier = currentUser.role === 'CASHIER';
  const isRep = currentUser.role === 'REP';

  return (
    <div className="space-y-6">
      {/* Apple-style Hero Banner */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-black/[0.06] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#0071E3] font-semibold text-xs tracking-wider uppercase bg-[#0071E3]/10 px-3 py-1 rounded-full border border-[#0071E3]/15">
              داشبۆردی زیرەک • {currentUser?.roleTitleKu}
            </span>
            <span className="text-xs">{currentUser?.avatarEmoji}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-[#1D1D1F] tracking-tight mt-3">
            بەخێربێیت، {currentUser?.name}
          </h2>
          <p className="text-[#86868B] text-xs md:text-sm mt-1.5 max-w-2xl leading-relaxed">
            {isCashier
              ? 'چاودێری کۆگا و کاشێری لقی فرۆشگای تایبەت بە وەسڵی گەرمی 80mm'
              : isRep
              ? 'چاودێری فرۆشراوی مەندوبەکان، بەخشینی دیاری، و گەڕاوەی ٣ ڕۆژ'
              : 'ڕێکخستنی کێڵگەکان بە وەسڵی دەستی، مەندوبەکان، فرۆشگای تایبەت، گەڕاوەی ٣ ڕۆژ، و حسابی قەرزەکان.'}
          </p>
        </div>

        {/* Action Pills (Filtered by Role Permission) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {hasAccess('intake') && (
            <button
              onClick={() => setActiveTab('intake')}
              className="px-4 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/30 flex items-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Truck className="w-3.5 h-3.5" />
              + باری کێڵگە
            </button>
          )}

          {hasAccess('rep-sales') && (
            <button
              onClick={() => setActiveTab('rep-sales')}
              className="px-4 py-2.5 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] border border-black/[0.06] font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-[#34C759]" />
              فرۆشی مەندوب
            </button>
          )}

          {hasAccess('pos') && (
            <button
              onClick={() => setActiveTab('pos')}
              className="px-4 py-2.5 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Store className="w-3.5 h-3.5" />
              فرۆشگای تایبەت
            </button>
          )}
        </div>
      </div>

      {/* Role-Specific Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Farm Intake (Hidden from Rep & Cashier) */}
        {hasAccess('intake') && (
          <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">کێشی زیندووی هاتوو</span>
              <div className="w-8 h-8 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center font-bold">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#1D1D1F] tracking-tight">
              {totalLiveIntakeKg.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">کگم خاوێن</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
              <span>وەجبەکانی ئەمڕۆ:</span>
              <span className="font-bold text-[#1D1D1F]">{intakes.length} وەجبە</span>
            </div>
          </div>
        )}

        {/* Metric 2: Rep Sales or Store Sales depending on role */}
        {hasAccess('rep-sales') && (
          <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">فرۆشی مەندوبەکان</span>
              <div className="w-8 h-8 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#1D1D1F] tracking-tight">
              {repSalesKg.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">کگم</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
              <span>داهاتی مەندوب:</span>
              <span className="font-bold text-[#34C759]">{formatIQD(repSalesIQD)}</span>
            </div>
          </div>
        )}

        {/* If Cashier: Show POS Metrics */}
        {isCashier && (
          <>
            <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-[#86868B] mb-3">
                <span className="text-xs font-semibold">فرۆشی کاشێری فرۆشگا</span>
                <div className="w-8 h-8 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#34C759] tracking-tight">
                {formatIQD(totalPOSSalesIQD)}
              </div>
              <div className="text-xs text-[#86868B] mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
                <span>وەسڵەکانی کاشێر:</span>
                <span className="font-bold text-[#1D1D1F]">{posSales.length} وەسڵ</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between text-[#86868B] mb-3">
                <span className="text-xs font-semibold">مەخزەنی سەلاجەی فرۆشگا</span>
                <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[#0071E3] tracking-tight">
                {totalBranchStockKg.toFixed(1)} <span className="text-xs font-normal text-[#86868B]">کگم</span>
              </div>
              <div className="text-xs text-[#86868B] mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
                <span>دۆخی کۆگا:</span>
                <span className="font-bold text-[#34C759]">ئامادەی فرۆشتن</span>
              </div>
            </div>
          </>
        )}

        {/* Metric 3: Returns (Hidden from Cashier) */}
        {hasAccess('returns') && (
          <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">گەڕاوە و تەلەفی ٣ ڕۆژ</span>
              <div className="w-8 h-8 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center font-bold">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#FF3B30] tracking-tight">
              {totalReturnsKg.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">کگم</span>
            </div>
            <div className="text-xs text-[#86868B] mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
              <span>زیانی بەسەرچوون:</span>
              <span className="font-bold text-[#FF3B30]">-{formatIQD(totalReturnsLoss)}</span>
            </div>
          </div>
        )}

        {/* Metric 4: Debts & Financial Ledgers (Hidden from Rep & Cashier) */}
        {hasAccess('accounting') && (
          <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between text-[#86868B] mb-3">
              <span className="text-xs font-semibold">قەرزی بازاڕ (مارکێتەکان)</span>
              <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0071E3] tracking-tight">
              {formatIQD(totalCustomerDebt)}
            </div>
            <div className="text-xs text-[#86868B] mt-3 flex items-center justify-between border-t border-black/[0.04] pt-2.5">
              <span>قەرزی کێڵگە:</span>
              <span className="font-bold text-[#FF9500]">{formatIQD(totalSupplierDebt)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3 Channels Apple Cards (Only rendered if user has access) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {hasAccess('rep-sales') && (
          <div
            onClick={() => setActiveTab('rep-sales')}
            className="p-6 rounded-3xl bg-white border border-black/[0.06] shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-1 rounded-full">
                  فرۆشی مەندوبەکان
                </span>
                <Truck className="w-4 h-4 text-[#0071E3]" />
              </div>
              <h3 className="text-base font-bold text-[#1D1D1F]">دابەشکردن بۆ مارکێتەکان</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                مەندوب بار وەردەگرێت بە وەسڵی دەستی کارگە، لە مارکێتەکان دەیفرۆشێت و گەڕاوەی ٣ ڕۆژ تۆمار دەکات.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-black/[0.05] flex items-center justify-between text-xs">
              <span className="text-[#86868B]">کۆی باری فرۆشراو:</span>
              <span className="font-bold text-[#1D1D1F] text-sm">{repSalesKg.toLocaleString()} کگم</span>
            </div>
          </div>
        )}

        {hasAccess('pos') && (
          <div
            onClick={() => setActiveTab('pos')}
            className="p-6 rounded-3xl bg-white border border-black/[0.06] shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#34C759] bg-[#34C759]/10 px-2.5 py-1 rounded-full">
                  فرۆشگای تایبەت (شۆروم)
                </span>
                <Store className="w-4 h-4 text-[#34C759]" />
              </div>
              <h3 className="text-base font-bold text-[#1D1D1F]">لقی فرۆشتنی خۆمان (POS)</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                کۆگای سەربەخۆ، وەرگرتنی باری مەندوب، کاشێری تاک و چاپی وەسڵی 80mm تێرمال.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-black/[0.05] flex items-center justify-between text-xs">
              <span className="text-[#86868B]">کۆگای ماوەی فرۆشگا:</span>
              <span className="font-bold text-[#1D1D1F] text-sm">{totalBranchStockKg.toFixed(1)} کگم</span>
            </div>
          </div>
        )}

        {hasAccess('gifts') && (
          <div
            onClick={() => setActiveTab('gifts')}
            className="p-6 rounded-3xl bg-white border border-black/[0.06] shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-[#AF52DE] bg-[#AF52DE]/10 px-2.5 py-1 rounded-full">
                  دیاری و بەخشین
                </span>
                <Gift className="w-4 h-4 text-[#AF52DE]" />
              </div>
              <h3 className="text-base font-bold text-[#1D1D1F]">هەدیە و بەلاش بە وەسڵ</h3>
              <p className="text-xs text-[#86868B] mt-1 leading-relaxed">
                بە وەسڵی دەستی کارگە دەردەچێت، بە نرخی ٠ دینار بەڵام لە کێشی کۆگای کارگە دادەبەزێت.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-black/[0.05] flex items-center justify-between text-xs">
              <span className="text-[#86868B]">کۆی بەخشراو:</span>
              <span className="font-bold text-[#AF52DE] text-sm">{giftKg.toLocaleString()} کگم</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
