import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Plus,
  TrendingUp,
  DollarSign,
  Fuel,
  Zap,
  Snowflake,
  Package,
  Wrench,
  Users,
  Printer,
  Calendar,
  X,
} from 'lucide-react';
import { ExpenseRecord } from '../../types';

export const ReportsView: React.FC = () => {
  const { intakes, dispatches, posSales, returns, expenses, branchExpenses, addExpense } = useApp();

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord['category']>('FUEL');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseReceiptNo, setExpenseReceiptNo] = useState('');

  const repSalesRevenue = dispatches.reduce((sum, d) => sum + d.totalAmount, 0);
  const storePosRevenue = posSales.reduce((sum, s) => sum + s.total, 0);
  const totalSalesRevenue = repSalesRevenue + storePosRevenue;

  const totalLiveBirdCost = intakes.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalReturnsLoss = returns.reduce((sum, r) => sum + r.totalLossAmount, 0);

  const totalGiftCost = dispatches
    .filter(d => d.destinationType === 'GIFT')
    .reduce((sum, d) => sum + d.items.reduce((s, item) => s + item.weightKg * 2500, 0), 0);

  const totalFactoryExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalStoreExpenses = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOperatingExpenses = totalFactoryExpenses + totalStoreExpenses;

  const netProfit =
    totalSalesRevenue - (totalLiveBirdCost + totalReturnsLoss + totalGiftCost + totalOperatingExpenses);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || Number(expenseAmount) <= 0) {
      return;
    }

    addExpense({
      date: new Date().toISOString().split('T')[0],
      category: expenseCategory,
      title: expenseTitle.trim(),
      amount: Number(expenseAmount),
      recipient: expenseRecipient.trim() || 'خەرجی کارگە',
      receiptNo: expenseReceiptNo.trim(),
    });

    setShowExpenseModal(false);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseRecipient('');
    setExpenseReceiptNo('');
  };

  const getCategoryIcon = (cat: ExpenseRecord['category']) => {
    switch (cat) {
      case 'FUEL':
        return <Fuel className="w-4 h-4 text-[#FF9500]" />;
      case 'ELECTRICITY':
        return <Zap className="w-4 h-4 text-[#FFCC00]" />;
      case 'ICE':
        return <Snowflake className="w-4 h-4 text-[#0071E3]" />;
      case 'PACKAGING':
        return <Package className="w-4 h-4 text-[#34C759]" />;
      case 'SALARIES':
        return <Users className="w-4 h-4 text-[#AF52DE]" />;
      case 'MAINTENANCE':
        return <Wrench className="w-4 h-4 text-[#FF3B30]" />;
      default:
        return <DollarSign className="w-4 h-4 text-[#86868B]" />;
    }
  };

  const getCategoryNameKu = (cat: ExpenseRecord['category']) => {
    switch (cat) {
      case 'FUEL':
        return 'گاز و سووتەمەنی';
      case 'ELECTRICITY':
        return 'کارەبا و مۆلیدە';
      case 'ICE':
        return 'سەهۆڵ و ساردکەرەوە';
      case 'PACKAGING':
        return 'کیسە و پاکەت';
      case 'SALARIES':
        return 'مووچە و کرێی کارمەند';
      case 'MAINTENANCE':
        return 'چاککردنەوە و سێرڤس';
      default:
        return 'خەرجی تر';
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="apple-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FF9500]/12 text-[#FF9500] flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              ڕاپۆرتی قازانج و خەرجی (P & L)
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              شیکاری تەواوی داهاتی مەندوب و شۆرۆم، تێچووی کێڵگە، تەلەفی ٣ ڕۆژ و خەرجییەکان
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-semibold text-xs rounded-full flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
            چاپکردن
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-full flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            خەرجی نوێ
          </button>
        </div>
      </div>

      {/* P & L Statement Card */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
          <h3 className="font-extrabold text-[#1D1D1F] text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#34C759]" />
            تەرازووی داهات و قازانجی گشتی
          </h3>
          <span className="text-[11px] font-medium text-[#86868B] flex items-center gap-1 bg-[#F5F5F7] px-3 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            کۆی گشتی سیستەم
          </span>
        </div>

        <div className="space-y-2.5 text-xs">
          {/* Revenue */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/18">
            <div>
              <span className="font-bold text-[#1D1D1F] text-sm block">کۆی داهاتی فرۆشتن (+)</span>
              <span className="text-[#515154] text-[11px] tabular-nums">
                مەندوب ({repSalesRevenue.toLocaleString()} د.ع) + فرۆشگای POS ({storePosRevenue.toLocaleString()} د.ع)
              </span>
            </div>
            <span className="text-xl font-black text-[#248A3D] tabular-nums">
              +{totalSalesRevenue.toLocaleString()} د.ع
            </span>
          </div>

          {/* Live Bird Purchases */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#F5F5F7]">
            <div>
              <span className="font-bold text-[#1D1D1F] block">کڕینی مریشکی زیندوو لە کێڵگەکان (-)</span>
              <span className="text-[#86868B] text-[11px]">بەپێی وەسڵی دەستی کێڵگەکان</span>
            </div>
            <span className="text-base font-bold text-[#515154] tabular-nums">
              -{totalLiveBirdCost.toLocaleString()} د.ع
            </span>
          </div>

          {/* 3-Day Spoilage */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#FF3B30]/6 border border-[#FF3B30]/15">
            <div>
              <span className="font-bold text-[#D70015] block">زیانی گەڕاوەی ٣ ڕۆژ (تەلەف) (-)</span>
              <span className="text-[#86868B] text-[11px]">گەڕێندراوەی بەسەرچوو لە مارکێتەکان</span>
            </div>
            <span className="text-base font-bold text-[#D70015] tabular-nums">
              -{totalReturnsLoss.toLocaleString()} د.ع
            </span>
          </div>

          {/* Gifts Cost */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#AF52DE]/6 border border-[#AF52DE]/15">
            <div>
              <span className="font-bold text-[#AF52DE] block">تێچووی دیاری و هەدیە (-)</span>
              <span className="text-[#86868B] text-[11px]">بەخشینی بێبەرامبەر لە کۆگای کارگە</span>
            </div>
            <span className="text-base font-bold text-[#AF52DE] tabular-nums">
              -{totalGiftCost.toLocaleString()} د.ع
            </span>
          </div>

          {/* Operating Expenses */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#F5F5F7]">
            <div>
              <span className="font-bold text-[#1D1D1F] block">کۆی خەرجی بەڕێوەبردن (-)</span>
              <span className="text-[#86868B] text-[11px] tabular-nums">
                کارگە ({totalFactoryExpenses.toLocaleString()} د.ع) + شۆرۆم ({totalStoreExpenses.toLocaleString()} د.ع)
              </span>
            </div>
            <span className="text-base font-bold text-[#FF9500] tabular-nums">
              -{totalOperatingExpenses.toLocaleString()} د.ع
            </span>
          </div>

          {/* Net Profit */}
          <div className="flex justify-between items-center p-5 rounded-2xl bg-[#1D1D1F] text-white mt-3">
            <div>
              <span className="text-[11px] text-[#0071E3] uppercase font-bold tracking-wider block">
                پوختەی قازانجی خاوێن (Net Profit)
              </span>
              <span className="text-[#86868B] text-[11px]">
                دوای دەرکردنی کڕینی کێڵگە، تەلەف، دیاری و خەرجییەکان
              </span>
            </div>
            <span
              className={`text-2xl font-black tabular-nums ${
                netProfit >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'
              }`}
            >
              {netProfit.toLocaleString()} د.ع
            </span>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-extrabold text-[#1D1D1F] text-sm">تۆماری خەرجییەکانی کارگە</h3>
          <span className="text-xs font-bold text-[#FF9500] tabular-nums">
            کۆ: {totalFactoryExpenses.toLocaleString()} د.ع
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">پۆلێن</th>
                <th className="p-4">بەروار</th>
                <th className="p-4">ناوی خەرجی</th>
                <th className="p-4">وەرگر</th>
                <th className="p-4">ژ. وەسڵ</th>
                <th className="p-4 text-left">بڕی پارە</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-[#F5F5F7]/60 transition-colors">
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 bg-[#F5F5F7] px-3 py-1 rounded-full font-semibold">
                      {getCategoryIcon(exp.category)}
                      {getCategoryNameKu(exp.category)}
                    </span>
                  </td>
                  <td className="p-4 text-[#86868B] tabular-nums">{exp.date}</td>
                  <td className="p-4 font-bold">{exp.title}</td>
                  <td className="p-4 text-[#515154]">{exp.recipient}</td>
                  <td className="p-4 text-[#86868B] font-mono">{exp.receiptNo || '---'}</td>
                  <td className="p-4 text-left font-black text-[#FF9500] tabular-nums">
                    {exp.amount.toLocaleString()} د.ع
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Sheet */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex justify-between items-center">
              <h3 className="font-extrabold text-[#1D1D1F] text-sm">تۆمارکردنی خەرجی نوێی کارگە</h3>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[#515154] font-semibold mb-1">جۆری خەرجی:</label>
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value as ExpenseRecord['category'])}
                  className="apple-input w-full px-3.5 py-2.5 font-semibold"
                >
                  <option value="FUEL">سووتەمەنی و گاز</option>
                  <option value="ELECTRICITY">کارەبا و مۆلیدە</option>
                  <option value="ICE">سەهۆڵ و ساردکەرەوە</option>
                  <option value="PACKAGING">کیسە و پاکەت</option>
                  <option value="SALARIES">مووچەی کارمەندان و شۆفێر</option>
                  <option value="MAINTENANCE">چاککردنەوە و سێرڤس</option>
                  <option value="OTHER">خەرجی تر</option>
                </select>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">ناوی خەرجی *</label>
                <input
                  type="text"
                  required
                  placeholder="نموونە: کڕینی سەهۆڵ..."
                  value={expenseTitle}
                  onChange={e => setExpenseTitle(e.target.value)}
                  className="apple-input w-full px-3.5 py-2.5 font-medium"
                />
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">بڕی پارە (د.ع) *</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value ? Number(e.target.value) : '')}
                  className="apple-input w-full px-3.5 py-2.5 font-bold text-sm tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">وەرگری پارە:</label>
                  <input
                    type="text"
                    placeholder="ناوی وەرگر..."
                    value={expenseRecipient}
                    onChange={e => setExpenseRecipient(e.target.value)}
                    className="apple-input w-full px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">ژ. وەسڵ:</label>
                  <input
                    type="text"
                    placeholder="REC-..."
                    value={expenseReceiptNo}
                    onChange={e => setExpenseReceiptNo(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="w-1/2 py-2.5 bg-[#F5F5F7] text-[#515154] rounded-full font-semibold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-full"
                >
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
