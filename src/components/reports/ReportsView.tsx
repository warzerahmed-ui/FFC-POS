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
} from 'lucide-react';
import { ExpenseRecord } from '../../types';

export const ReportsView: React.FC = () => {
  const { intakes, dispatches, returns, expenses, addExpense } = useApp();

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord['category']>('FUEL');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseReceiptNo, setExpenseReceiptNo] = useState('');

  const totalSalesRevenue = dispatches.reduce((sum, d) => sum + d.totalAmount, 0);
  const totalLiveBirdCost = intakes.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalReturnsLoss = returns.reduce((sum, r) => sum + r.totalLossAmount, 0);
  
  const totalGiftCost = dispatches
    .filter(d => d.destinationType === 'GIFT')
    .reduce((sum, d) => sum + d.items.reduce((s, item) => s + (item.weightKg * 2500), 0), 0);

  const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const netProfit = totalSalesRevenue - (totalLiveBirdCost + totalReturnsLoss + totalGiftCost + totalOperatingExpenses);

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle || !expenseAmount || Number(expenseAmount) <= 0) {
      alert('تکایە خانەکان پڕبکەرەوە');
      return;
    }

    addExpense({
      date: new Date().toISOString().split('T')[0],
      category: expenseCategory,
      title: expenseTitle,
      amount: Number(expenseAmount),
      recipient: expenseRecipient || 'خەرجی کارگە',
      receiptNo: expenseReceiptNo,
    });

    setShowExpenseModal(false);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseRecipient('');
    setExpenseReceiptNo('');
  };

  const getCategoryIcon = (cat: ExpenseRecord['category']) => {
    switch (cat) {
      case 'FUEL': return <Fuel className="w-4 h-4 text-[#FF9500]" />;
      case 'ELECTRICITY': return <Zap className="w-4 h-4 text-[#FFCC00]" />;
      case 'ICE': return <Snowflake className="w-4 h-4 text-[#0071E3]" />;
      case 'PACKAGING': return <Package className="w-4 h-4 text-[#34C759]" />;
      case 'SALARIES': return <Users className="w-4 h-4 text-[#AF52DE]" />;
      case 'MAINTENANCE': return <Wrench className="w-4 h-4 text-[#FF3B30]" />;
      default: return <DollarSign className="w-4 h-4 text-[#86868B]" />;
    }
  };

  const getCategoryNameKu = (cat: ExpenseRecord['category']) => {
    switch (cat) {
      case 'FUEL': return 'گاز و سووتەمەنی مۆلیدە';
      case 'ELECTRICITY': return 'کارەبا و موەلیدەی گشتی';
      case 'ICE': return 'سەهۆڵ بۆ سەربڕخانە';
      case 'PACKAGING': return 'کیسەی لۆگۆدار و ستیکەر';
      case 'SALARIES': return 'کرێی کارمەندان و شۆفێر';
      case 'MAINTENANCE': return 'چاککردنەوە و سێرڤس';
      default: return 'خەرجی تر';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-[#0071E3]" />
            ڕاپۆرتی پوختەی قازانج و زیان (P & L) و خەرجییەکان
          </h2>
          <p className="text-xs text-[#86868B] mt-1">
            شیکاری تەواوی داهاتی فرۆش، تێچووی کڕین، زیانی تەلەفی ٣ ڕۆژ، خەرجییەکان و قازانجی ڕاستەقینە
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] border border-black/[0.06] font-semibold text-xs rounded-full flex items-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
            چاپی ڕاپۆرت
          </button>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 shadow-sm shadow-[#0071E3]/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            تۆمارکردنی خەرجی نوێ
          </button>
        </div>
      </div>

      {/* P & L Statement Card */}
      <div className="p-8 rounded-3xl bg-white border border-black/[0.06] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
          <h3 className="font-extrabold text-[#1D1D1F] text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#34C759]" />
            تەرازووی داهات و قازانجی کارگە (Financial P & L Breakdown)
          </h3>
          <span className="text-xs text-[#86868B] flex items-center gap-1 bg-[#F5F5F7] px-3 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            هەموو وەجبە و کاتەکان
          </span>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Revenue */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#34C759]/5 border border-[#34C759]/15">
            <div>
              <span className="font-bold text-[#1D1D1F] text-sm block">کۆی داهاتی فرۆشتن (+)</span>
              <span className="text-[#86868B] text-[11px]">مەندوبەکان + فرۆشگای خۆمان</span>
            </div>
            <span className="text-xl font-black text-[#248A3D]">
              +{totalSalesRevenue.toLocaleString()} د.ع
            </span>
          </div>

          {/* Cost 1 */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.03]">
            <div>
              <span className="font-semibold text-[#1D1D1F] block">تێچووی کڕینی مریشکی زیندوو لە کێڵگەکان (-)</span>
              <span className="text-[#86868B] text-[11px]">کێشی خاوێن بەپێی وەسڵی دەستی کێڵگە</span>
            </div>
            <span className="text-base font-bold text-[#515154]">
              -{totalLiveBirdCost.toLocaleString()} د.ع
            </span>
          </div>

          {/* Cost 2 */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/15">
            <div>
              <span className="font-semibold text-[#FF3B30] block">زیانی گەڕاوەی بەسەرچووی ٣ ڕۆژ (تەلەف) (-)</span>
              <span className="text-[#86868B] text-[11px]">ئەو مریشکانەی لە مارکێت سەرف نەبوون و فەوتێنران</span>
            </div>
            <span className="text-base font-bold text-[#FF3B30]">
              -{totalReturnsLoss.toLocaleString()} د.ع
            </span>
          </div>

          {/* Cost 3 */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#AF52DE]/5 border border-[#AF52DE]/15">
            <div>
              <span className="font-semibold text-[#AF52DE] block">تێچووی دیاری و بەخشین (هەدیە بەلاش) (-)</span>
              <span className="text-[#86868B] text-[11px]">بە وەسڵی دەستی کارگە تۆمارکراوە بەپێی نرخی تێچوون</span>
            </div>
            <span className="text-base font-bold text-[#AF52DE]">
              -{totalGiftCost.toLocaleString()} د.ع
            </span>
          </div>

          {/* Cost 4 */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.03]">
            <div>
              <span className="font-semibold text-[#1D1D1F] block">کۆی خەرجییە گشتییەکان (سووتەمەنی، سەهۆڵ، کرێکار، کیسە) (-)</span>
              <span className="text-[#86868B] text-[11px]">بەڕێوەبردنی ڕۆژانەی کارگە</span>
            </div>
            <span className="text-base font-bold text-[#FF9500]">
              -{totalOperatingExpenses.toLocaleString()} د.ع
            </span>
          </div>

          {/* Final Net Profit */}
          <div className="flex justify-between items-center p-5 rounded-3xl bg-[#1D1D1F] text-white mt-5 shadow-xl">
            <div>
              <span className="text-xs text-[#0071E3] uppercase font-black tracking-wider block">
                قازانجی پوختەی کارگە (Net Operational Profit)
              </span>
              <span className="text-[#86868B] text-[11px]">دوای دەرهێنانی هەموو تێچوو و تەلەف و خەرجییەکان</span>
            </div>
            <span className={`text-2xl font-black ${netProfit >= 0 ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
              {netProfit.toLocaleString()} د.ع
            </span>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#1D1D1F] text-sm">تۆماری خەرجییەکانی کارگە:</h3>
          <span className="text-xs text-[#86868B]">کۆی خەرجی: {totalOperatingExpenses.toLocaleString()} د.ع</span>
        </div>

        <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">پۆلێن</th>
                <th className="p-4">بەروار</th>
                <th className="p-4">ناوی خەرجی / وەسف</th>
                <th className="p-4">وەرگری پارە</th>
                <th className="p-4">ژ. وەسڵ</th>
                <th className="p-4">بڕی خەرجکراو</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#FBFBFD]">
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1.5 bg-[#F5F5F7] px-3 py-1 rounded-full text-[#1D1D1F] font-semibold">
                      {getCategoryIcon(exp.category)}
                      {getCategoryNameKu(exp.category)}
                    </span>
                  </td>
                  <td className="p-4 text-[#86868B]">{exp.date}</td>
                  <td className="p-4 font-bold text-[#1D1D1F]">{exp.title}</td>
                  <td className="p-4 text-[#86868B]">{exp.recipient}</td>
                  <td className="p-4 text-[#86868B] font-mono">{exp.receiptNo || '---'}</td>
                  <td className="p-4 font-black text-[#FF9500]">{exp.amount.toLocaleString()} د.ع</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 text-xs shadow-2xl border border-black/[0.08]">
            <div className="flex justify-between items-center border-b border-black/[0.06] pb-3">
              <h3 className="font-bold text-[#1D1D1F] text-sm">تۆمارکردنی خەرجی نوێی کارگە</h3>
              <button onClick={() => setShowExpenseModal(false)} className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] font-bold">✕</button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[#515154] font-semibold mb-1">جۆری خەرجی:</label>
                <select
                  value={expenseCategory}
                  onChange={(e: any) => setExpenseCategory(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-semibold outline-none focus:border-[#0071E3] focus:bg-white"
                >
                  <option value="FUEL">سووتەمەنی و گاز بۆ مۆلیدە</option>
                  <option value="ELECTRICITY">کارەبا و موەلیدە</option>
                  <option value="ICE">سەهۆڵ بۆ سەربڕخانە</option>
                  <option value="PACKAGING">کیسەی نایلۆن و ستیکەری بارکۆد</option>
                  <option value="SALARIES">مووچەی کرێکاران و شۆفێر</option>
                  <option value="MAINTENANCE">چاککردنەوە و سێرڤس</option>
                  <option value="OTHER">خەرجییەکانی تر</option>
                </select>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">ناوی خەرجی / ڕوونکردنەوە *</label>
                <input
                  type="text"
                  required
                  placeholder="نموونە: کڕینی ٣٠ قالبی سەهۆڵ..."
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">بڕی خەرجکراو (د.ع) *</label>
                <input
                  type="number"
                  required
                  placeholder="50000"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-bold text-sm outline-none focus:border-[#0071E3] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] mb-1">وەرگری پارە:</label>
                  <input
                    type="text"
                    placeholder="کەسی وەرگر..."
                    value={expenseRecipient}
                    onChange={(e) => setExpenseRecipient(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="block text-[#515154] mb-1">ژمارەی وەسڵ:</label>
                  <input
                    type="text"
                    placeholder="REC-..."
                    value={expenseReceiptNo}
                    onChange={(e) => setExpenseReceiptNo(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
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
                  className="w-1/2 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-full shadow-sm shadow-[#0071E3]/25"
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
