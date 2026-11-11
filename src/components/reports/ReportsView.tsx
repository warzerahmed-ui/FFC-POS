import React, { useMemo, useState } from 'react';
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
  Download,
  Boxes,
  X,
} from 'lucide-react';
import { ExpenseRecord } from '../../types';
import { DailySettlementView } from '../accounting/DailySettlementView';
import { FactoryLogo } from '../layout/FactoryLogo';

type DatePreset = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

export const ReportsView: React.FC = () => {
  const {
    intakes,
    dispatches,
    posSales,
    returns,
    expenses,
    branchExpenses,
    products,
    branchStock,
    custodyTransfers,
    addExpense,
    factorySettings,
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'PNL' | 'DAILY'>('PNL');
  const todayISO = new Date().toISOString().split('T')[0];
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [fromDate, setFromDate] = useState<string>(todayISO);
  const [toDate, setToDate] = useState<string>(todayISO);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState<ExpenseRecord['category']>('FUEL');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseRecipient, setExpenseRecipient] = useState('');
  const [expenseReceiptNo, setExpenseReceiptNo] = useState('');

  const dateBounds = useMemo(() => {
    if (datePreset === 'ALL') return { start: '', end: '' };
    if (datePreset === 'TODAY') return { start: todayISO, end: todayISO };
    if (datePreset === 'WEEK') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { start: d.toISOString().split('T')[0], end: todayISO };
    }
    if (datePreset === 'MONTH') {
      return { start: `${todayISO.slice(0, 7)}-01`, end: todayISO };
    }
    return { start: fromDate, end: toDate };
  }, [datePreset, fromDate, toDate, todayISO]);

  const inPeriod = (dateStr: string) => {
    const clean = dateStr.slice(0, 10);
    if (dateBounds.start && clean < dateBounds.start) return false;
    if (dateBounds.end && clean > dateBounds.end) return false;
    return true;
  };

  const filteredIntakes = useMemo(() => intakes.filter(i => inPeriod(i.date)), [intakes, dateBounds]);
  const filteredSalesDispatches = useMemo(
    () =>
      dispatches.filter(
        d => (d.destinationType === 'REP' || d.destinationType === 'DIRECT') && inPeriod(d.date)
      ),
    [dispatches, dateBounds]
  );
  const filteredGiftDispatches = useMemo(
    () => dispatches.filter(d => d.destinationType === 'GIFT' && inPeriod(d.date)),
    [dispatches, dateBounds]
  );
  const filteredPosSales = useMemo(() => posSales.filter(s => inPeriod(s.date)), [posSales, dateBounds]);
  const filteredReturns = useMemo(() => returns.filter(r => inPeriod(r.date)), [returns, dateBounds]);
  const filteredExpenses = useMemo(() => expenses.filter(e => inPeriod(e.date)), [expenses, dateBounds]);
  const filteredBranchExpenses = useMemo(
    () => branchExpenses.filter(e => inPeriod(e.date)),
    [branchExpenses, dateBounds]
  );

  const repSalesRevenue = filteredSalesDispatches.reduce((sum, d) => sum + d.totalAmount, 0);
  const storePosRevenue = filteredPosSales.reduce((sum, s) => sum + s.total, 0);
  const totalSalesRevenue = repSalesRevenue + storePosRevenue;

  // Real Cost of Goods Sold (COGS) across Rep Sales + Showroom POS Sales in selected period
  const repCogsAmount = filteredSalesDispatches.reduce((sum, d) => {
    return (
      sum +
      d.items.reduce((s, item) => {
        if (item.factoryCostAmount !== undefined) return s + item.factoryCostAmount;
        const prod = products.find(p => p.id === item.productId);
        return s + Math.round(item.weightKg * (prod ? prod.costPerKg : 2750));
      }, 0)
    );
  }, 0);

  const posCogsAmount = filteredPosSales.reduce((sum, sale) => {
    return (
      sum +
      sale.items.reduce((s, item) => {
        const bItem = branchStock.find(b => b.productId === item.productId);
        const prod = products.find(p => p.id === item.productId);
        const unitCost = bItem?.factoryCostPerKg ?? prod?.costPerKg ?? 2750;
        return s + Math.round(item.weightKg * unitCost);
      }, 0)
    );
  }, 0);

  const totalCogsAmount = repCogsAmount + posCogsAmount;
  const totalLiveBirdPurchases = filteredIntakes.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalReturnsLoss = filteredReturns.reduce((sum, r) => sum + r.totalLossAmount, 0);

  const totalGiftCost = filteredGiftDispatches.reduce((sum, d) => {
    if (d.totalFactoryCost !== undefined) return sum + d.totalFactoryCost;
    return (
      sum +
      d.items.reduce((s, item) => {
        if (item.factoryCostAmount !== undefined) return s + item.factoryCostAmount;
        const prod = products.find(p => p.id === item.productId);
        return s + Math.round(item.weightKg * (prod ? prod.costPerKg : 2750));
      }, 0)
    );
  }, 0);

  const totalFactoryExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalStoreExpenses = filteredBranchExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalOperatingExpenses = totalFactoryExpenses + totalStoreExpenses;

  // True Net Operating Profit = Sales - (COGS + 3-Day Returns Loss + Gifts Cost + Operating Expenses)
  const netProfit =
    totalSalesRevenue - (totalCogsAmount + totalReturnsLoss + totalGiftCost + totalOperatingExpenses);

  // Current Ending Inventory Valuation (Live + Ready + Showroom + Rep Custody)
  const currentInventoryValuation = useMemo(() => {
    const liveValue = intakes.reduce(
      (s, i) => s + Math.round(i.remainingLiveWeightKg * i.pricePerKg),
      0
    );
    const readyValue = products.reduce((s, p) => s + Math.round(p.inStockKg * p.costPerKg), 0);
    const branchValue = branchStock.reduce(
      (s, b) => s + Math.round(b.inStockKg * b.factoryCostPerKg),
      0
    );
    const repCustodyValue = products.reduce((s, p) => {
      const loaded = custodyTransfers
        .filter(t => t.holderType === 'REP' && t.direction === 'LOAD')
        .reduce(
          (ls, t) => ls + t.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
          0
        );
      const sold = dispatches
        .filter(d => d.destinationType === 'REP' || (d.destinationType === 'GIFT' && d.sourceCustody === 'REP'))
        .reduce(
          (ds, d) => ds + d.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
          0
        );
      const ret = custodyTransfers
        .filter(t => t.holderType === 'REP' && t.direction === 'RETURN_TO_READY')
        .reduce(
          (rs, t) => rs + t.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
          0
        );
      const rem = Math.max(0, loaded - sold - ret);
      return s + Math.round(rem * p.costPerKg);
    }, 0);

    return {
      liveValue,
      readyValue,
      branchValue,
      repCustodyValue,
      total: liveValue + readyValue + branchValue + repCustodyValue,
    };
  }, [intakes, products, branchStock, custodyTransfers, dispatches]);

  const handleExportPnLCsv = () => {
    const periodLabel =
      datePreset === 'ALL'
        ? 'کۆی گشتی'
        : `${dateBounds.start || '...'} تا ${dateBounds.end || '...'}`;
    const rows = [
      ['ڕاپۆرتی قازانج و زەرەر (P&L)', factorySettings.factoryName, periodLabel],
      ['بڕگە', 'وردەکاری', 'بڕ (د.ع)'],
      ['داهاتی فرۆشتنی مەندوب', `${filteredSalesDispatches.length} وەسڵ`, String(repSalesRevenue)],
      ['داهاتی فرۆشگای POS', `${filteredPosSales.length} وەسڵ`, String(storePosRevenue)],
      ['کۆی داهاتی فرۆشتن', '', String(totalSalesRevenue)],
      ['تێچووی کاڵای فرۆشراو (COGS)', `مەندوب: ${repCogsAmount} | شۆرۆم: ${posCogsAmount}`, String(-totalCogsAmount)],
      ['زیانی گەڕاوەی ٣ ڕۆژ (تەلەف)', `${filteredReturns.length} تۆمار`, String(-totalReturnsLoss)],
      ['تێچووی دیاری و هەدیە', `${filteredGiftDispatches.length} وەسڵ`, String(-totalGiftCost)],
      ['خەرجی کارگە و شۆرۆم', `کارگە: ${totalFactoryExpenses} | شۆرۆم: ${totalStoreExpenses}`, String(-totalOperatingExpenses)],
      ['پوختەی قازانجی خاوێن (Net Operating Profit)', '', String(netProfit)],
      ['---', '---', '---'],
      ['بڕی کڕینی کێڵگە لەم ماوەیەدا', `${filteredIntakes.length} وەسڵ`, String(totalLiveBirdPurchases)],
      ['بەهای مەخزەنی ماوەی ئێستا', 'زیندوو + ئامادە + عەهدە + شۆرۆم', String(currentInventoryValuation.total)],
    ];
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PnL-${factorySettings.shortCode}-${todayISO}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      {/* Top Apple Segmented Switch */}
      <div className={`apple-segmented w-fit ${activeReportTab === 'DAILY' ? 'no-print' : ''}`}>
        <button
          type="button"
          onClick={() => setActiveReportTab('PNL')}
          className={`apple-segment-btn flex items-center gap-1.5 ${
            activeReportTab === 'PNL' ? 'apple-segment-btn-active' : ''
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-[#34C759]" />
          <span>ڕاپۆرتی قازانج و زەرەر (P&amp;L)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('DAILY')}
          className={`apple-segment-btn flex items-center gap-1.5 ${
            activeReportTab === 'DAILY' ? 'apple-segment-btn-active' : ''
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-[#AF52DE]" />
          <span>ڕاپۆرت و تەسفییەی ڕۆژانە (مەندوب و شۆرۆم)</span>
        </button>
      </div>

      {activeReportTab === 'DAILY' && <DailySettlementView />}

      {activeReportTab === 'PNL' && (
        <>
          {/* Header */}
          <div className="apple-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <FactoryLogo size="md" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
                ڕاپۆرتی قازانج و خەرجی (P & L)
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#86868B] bg-black/[0.04] px-2 py-0.5 rounded-full">
                <FileSpreadsheet className="w-3 h-3 text-[#FF9500]" />
                {factorySettings.factoryName} • {factorySettings.shortCode}
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              شیکاری تەواوی داهاتی مەندوب و شۆرۆم، تێچووی کێڵگە، تەلەفی ٣ ڕۆژ و خەرجییەکان
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={handleExportPnLCsv}
            className="px-4 py-2.5 bg-[#34C759]/12 hover:bg-[#34C759]/20 text-[#248A3D] font-bold text-xs rounded-full flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Excel / CSV
          </button>
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

      {/* Date Range Filter Bar */}
      <div className="apple-card p-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-[#515154] flex items-center gap-1 ml-2">
            <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
            ماوەی ڕاپۆرت:
          </span>
          {(
            [
              { id: 'ALL', label: 'کۆی گشتی' },
              { id: 'TODAY', label: 'ئەمڕۆ' },
              { id: 'WEEK', label: '٧ ڕۆژی ڕابردوو' },
              { id: 'MONTH', label: 'ئەم مانگە' },
              { id: 'CUSTOM', label: 'بەرواری دیاریکراو' },
            ] as { id: DatePreset; label: string }[]
          ).map(btn => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setDatePreset(btn.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                datePreset === btn.id
                  ? 'bg-[#0071E3] text-white shadow-xs'
                  : 'bg-[#F5F5F7] text-[#515154] hover:bg-[#E8E8ED]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {datePreset === 'CUSTOM' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#86868B] font-semibold">لە:</span>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="apple-input px-2.5 py-1.5 font-bold tabular-nums"
            />
            <span className="text-[#86868B] font-semibold">بۆ:</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="apple-input px-2.5 py-1.5 font-bold tabular-nums"
            />
          </div>
        )}
      </div>

      {/* P & L Statement Card */}
      <div className="apple-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-3.5">
          <h3 className="font-extrabold text-[#1D1D1F] text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#34C759]" />
            تەرازووی داهات و قازانجی ڕاستەقینە (P & L)
          </h3>
          <span className="text-[11px] font-medium text-[#86868B] flex items-center gap-1 bg-[#F5F5F7] px-3 py-1 rounded-full tabular-nums">
            <Calendar className="w-3.5 h-3.5" />
            {datePreset === 'ALL'
              ? 'کۆی گشتی سیستەم'
              : `${dateBounds.start || '...'} تا ${dateBounds.end || '...'}`}
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

          {/* COGS (Real Cost of Goods Sold) */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#F5F5F7]">
            <div>
              <span className="font-bold text-[#1D1D1F] block">
                تێچووی کاڵای فرۆشراو — COGS (-)
              </span>
              <span className="text-[#86868B] text-[11px] tabular-nums">
                تێچووی تەنها ئەو کێشەی فرۆشراوە (مەندوب: {repCogsAmount.toLocaleString()} • شۆرۆم: {posCogsAmount.toLocaleString()})
              </span>
            </div>
            <span className="text-base font-bold text-[#515154] tabular-nums">
              -{totalCogsAmount.toLocaleString()} د.ع
            </span>
          </div>

          {/* 3-Day Spoilage */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#FF3B30]/6 border border-[#FF3B30]/15">
            <div>
              <span className="font-bold text-[#D70015] block">زیانی گەڕاوەی ٣ ڕۆژ (تەلەف) (-)</span>
              <span className="text-[#86868B] text-[11px]">گەڕێندراوەی بەسەرچوو لە مارکێتەکان و شۆرۆم</span>
            </div>
            <span className="text-base font-bold text-[#D70015] tabular-nums">
              -{totalReturnsLoss.toLocaleString()} د.ع
            </span>
          </div>

          {/* Gifts Cost */}
          <div className="flex justify-between items-center p-4 rounded-2xl bg-[#AF52DE]/6 border border-[#AF52DE]/15">
            <div>
              <span className="font-bold text-[#AF52DE] block">تێچووی دیاری و هەدیە (-)</span>
              <span className="text-[#86868B] text-[11px]">بەخشینی بێبەرامبەر لە کۆگای کارگە و عەهدە</span>
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
                پوختەی قازانجی خاوێن (Net Operating Profit)
              </span>
              <span className="text-[#86868B] text-[11px]">
                داهاتی فرۆشتن کەم تێچووی کاڵای فرۆشراو (COGS)، تەلەف، دیاری و خەرجییەکان
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

          {/* Purchases vs Ending Inventory Reference */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-[#0071E3]/6 border border-[#0071E3]/15 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1D1D1F] block">کڕینی کێڵگە لەم ماوەیەدا</span>
                <span className="text-[11px] text-[#86868B]">
                  {filteredIntakes.length} وەسڵی وەرگرتنی زیندوو (تێچووی کڕین)
                </span>
              </div>
              <span className="font-black text-[#0071E3] tabular-nums text-sm">
                {totalLiveBirdPurchases.toLocaleString()} د.ع
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-[#248A3D]" />
                  بەهای مەخزەنی ماوەی ئێستا
                </span>
                <span className="text-[11px] text-[#515154] tabular-nums">
                  زیندوو {currentInventoryValuation.liveValue.toLocaleString()} • ئامادە {currentInventoryValuation.readyValue.toLocaleString()} • عەهدە و شۆرۆم {(currentInventoryValuation.repCustodyValue + currentInventoryValuation.branchValue).toLocaleString()}
                </span>
              </div>
              <span className="font-black text-[#248A3D] tabular-nums text-sm">
                {currentInventoryValuation.total.toLocaleString()} د.ع
              </span>
            </div>
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
              {filteredExpenses.map(exp => (
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
        </>
      )}

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
