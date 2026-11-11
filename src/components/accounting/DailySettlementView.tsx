import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  Calendar,
  Store,
  User,
  Banknote,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Scale,
  Receipt,
  Check,
  X,
  ArrowLeftRight,
  Clock,
} from 'lucide-react';
import { DailySettlement } from '../../types';

const REP_PRESETS = [
  'مەندوب شوان (هێڵی بەختیاری)',
  'مەندوب هێمن (هێڵی تووی مەلیك)',
  'مەندوب ئارام (هێڵی سەرچنار و ڕاپەڕین)',
  'مەندوب کامەران (هێڵی عەربەت و شارەزوور)',
];

const BRANCH_ACCOUNT_NAME = 'فرۆشگای تایبەت (POS / شۆرۆم)';

interface DailyReceiptRow {
  id: string;
  receiptNo: string;
  time: string;
  partyLabel: string;
  paymentKind: 'CASH' | 'CARD' | 'CREDIT';
  weightKg: number;
  amount: number;
}

interface AccountDailySummary {
  accountType: 'REP' | 'BRANCH';
  accountName: string;
  receipts: DailyReceiptRow[];
  returnsCount: number;
  returnsWeightKg: number;
  returnsAmount: number;
  expensesList: { id: string; title: string; amount: number; time?: string }[];
  expensesAmount: number;
  settlementsToday: DailySettlement[];
  totalWeightKg: number;
  totalSalesAmount: number;
  cashSalesAmount: number;
  creditSalesAmount: number;
  cardSalesAmount: number;
  collectedDebtToday: number;
  expectedCashToday: number;
  expectedTotalToday: number;
  returnedCashToday: number;
  returnedCardToday: number;
  returnedTotalToday: number;
  varianceToday: number;
  dayState: 'NO_ACTIVITY' | 'UNSETTLED' | 'MATCHED' | 'SHORTAGE' | 'SURPLUS';
}

export const DailySettlementView: React.FC = () => {
  const {
    dispatches,
    posSales,
    returns,
    branchExpenses,
    custodyTransfers,
    settlements,
    currentUser,
    addDailySettlement,
  } = useApp();

  const todayISO = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayISO);
  const [accountFilter, setAccountFilter] = useState<'ALL' | 'BRANCH' | 'REP'>('ALL');
  const [historyScope, setHistoryScope] = useState<'DATE' | 'ALL'>('ALL');

  // Statement Preview & Print Modal
  const [statementAccount, setStatementAccount] = useState<AccountDailySummary | null>(null);

  // Settlement Action Modal
  const [settlingAccount, setSettlingAccount] = useState<AccountDailySummary | null>(null);
  const [settlementNo, setSettlementNo] = useState('');
  const [collectedDebtInput, setCollectedDebtInput] = useState<number | ''>(0);
  const [returnedCashInput, setReturnedCashInput] = useState<number | ''>('');
  const [returnedCardInput, setReturnedCardInput] = useState<number | ''>(0);
  const [settlementNotes, setSettlementNotes] = useState('');

  // Collect all active dates for quick jumping
  const activeDates = useMemo(() => {
    const set = new Set<string>([todayISO]);
    dispatches
      .filter(d => d.destinationType === 'REP')
      .forEach(d => set.add(d.date.slice(0, 10)));
    posSales.forEach(s => set.add(s.date.slice(0, 10)));
    branchExpenses.forEach(e => set.add(e.date.slice(0, 10)));
    settlements.forEach(s => set.add(s.date.slice(0, 10)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [dispatches, posSales, branchExpenses, settlements, todayISO]);

  // Build daily account summaries for selectedDate
  const accountSummaries: AccountDailySummary[] = useMemo(() => {
    const repSet = new Set<string>(REP_PRESETS);
    dispatches
      .filter(d => d.destinationType === 'REP' && d.repName)
      .forEach(d => repSet.add(d.repName!));
    custodyTransfers
      .filter(t => t.holderType === 'REP')
      .forEach(t => repSet.add(t.holderName));
    settlements
      .filter(s => s.accountType === 'REP')
      .forEach(s => repSet.add(s.accountName));

    const buildSummary = (
      accountType: 'REP' | 'BRANCH',
      accountName: string
    ): AccountDailySummary => {
      let receipts: DailyReceiptRow[] = [];
      let returnsCount = 0;
      let returnsWeightKg = 0;
      let returnsAmount = 0;
      let expensesList: { id: string; title: string; amount: number; time?: string }[] = [];

      if (accountType === 'BRANCH') {
        const dayPos = posSales.filter(s => s.date.slice(0, 10) === selectedDate);
        receipts = dayPos.map(s => ({
          id: s.id,
          receiptNo: s.saleNo,
          time: s.time || (s.date.includes(' ') ? s.date.split(' ')[1] : '---'),
          partyLabel: s.customerName
            ? `${s.customerName} (کاشێر: ${s.cashierName})`
            : `فرۆشی کاشێر (${s.cashierName})`,
          paymentKind:
            s.paymentType === 'FIB_OR_CARD'
              ? 'CARD'
              : s.paymentType === 'DEBT'
              ? 'CREDIT'
              : 'CASH',
          weightKg: Number(
            s.items.reduce((sum, i) => sum + i.weightKg, 0).toFixed(2)
          ),
          amount: s.total,
        }));

        expensesList = branchExpenses
          .filter(e => e.date.slice(0, 10) === selectedDate)
          .map(e => ({ id: e.id, title: e.title, amount: e.amount, time: e.time }));
      } else {
        const shortName = accountName.split(' (')[0];
        const dayRep = dispatches.filter(
          d =>
            d.destinationType === 'REP' &&
            (d.repName || '') === accountName &&
            d.date.slice(0, 10) === selectedDate
        );
        receipts = dayRep.map(d => ({
          id: d.id,
          receiptNo: d.manualReceiptNo,
          time: d.time || '---',
          partyLabel: d.customerName || d.destinationName,
          paymentKind: d.paymentType === 'CASH' ? 'CASH' : 'CREDIT',
          weightKg: Number(d.totalWeightKg.toFixed(2)),
          amount: d.totalAmount,
        }));

        const dayReturns = returns.filter(
          r =>
            r.date.slice(0, 10) === selectedDate &&
            r.sourceType === 'REP' &&
            ((r.repName && r.repName === accountName) ||
              r.sourceName.includes(shortName))
        );
        returnsCount = dayReturns.length;
        returnsWeightKg = Number(
          dayReturns.reduce((s, r) => s + r.totalWeightKg, 0).toFixed(2)
        );
        returnsAmount = dayReturns.reduce(
          (s, r) => s + (r.totalCustomerDeduction ?? r.totalLossAmount),
          0
        );
      }

      const cashSalesAmount = receipts
        .filter(r => r.paymentKind === 'CASH')
        .reduce((s, r) => s + r.amount, 0);
      const cardSalesAmount = receipts
        .filter(r => r.paymentKind === 'CARD')
        .reduce((s, r) => s + r.amount, 0);
      const creditSalesAmount = receipts
        .filter(r => r.paymentKind === 'CREDIT')
        .reduce((s, r) => s + r.amount, 0);
      const totalSalesAmount = cashSalesAmount + cardSalesAmount + creditSalesAmount;
      const totalWeightKg = Number(
        receipts.reduce((s, r) => s + r.weightKg, 0).toFixed(2)
      );
      const expensesAmount = expensesList.reduce((s, e) => s + e.amount, 0);

      const settlementsToday = settlements.filter(
        s =>
          s.accountType === accountType &&
          s.accountName === accountName &&
          s.date.slice(0, 10) === selectedDate
      );

      const collectedDebtToday = settlementsToday.reduce(
        (s, st) => s + (st.collectedDebtAmount || 0),
        0
      );
      const returnedCashToday = settlementsToday.reduce(
        (s, st) => s + st.returnedCashAmount,
        0
      );
      const returnedCardToday = settlementsToday.reduce(
        (s, st) => s + (st.returnedCardAmount || 0),
        0
      );

      const expectedCashToday =
        Math.max(0, cashSalesAmount - expensesAmount) + collectedDebtToday;
      const expectedTotalToday = expectedCashToday + cardSalesAmount;
      const returnedTotalToday = returnedCashToday + returnedCardToday;
      const varianceToday = returnedTotalToday - expectedTotalToday;

      let dayState: AccountDailySummary['dayState'] = 'NO_ACTIVITY';
      if (
        totalSalesAmount === 0 &&
        expensesAmount === 0 &&
        settlementsToday.length === 0
      ) {
        dayState = 'NO_ACTIVITY';
      } else if (settlementsToday.length === 0 && expectedTotalToday > 0) {
        dayState = 'UNSETTLED';
      } else if (varianceToday === 0) {
        dayState = 'MATCHED';
      } else if (varianceToday < 0) {
        dayState = 'SHORTAGE';
      } else {
        dayState = 'SURPLUS';
      }

      return {
        accountType,
        accountName,
        receipts,
        returnsCount,
        returnsWeightKg,
        returnsAmount,
        expensesList,
        expensesAmount,
        settlementsToday,
        totalWeightKg,
        totalSalesAmount,
        cashSalesAmount,
        creditSalesAmount,
        cardSalesAmount,
        collectedDebtToday,
        expectedCashToday,
        expectedTotalToday,
        returnedCashToday,
        returnedCardToday,
        returnedTotalToday,
        varianceToday,
        dayState,
      };
    };

    const list: AccountDailySummary[] = [
      buildSummary('BRANCH', BRANCH_ACCOUNT_NAME),
      ...Array.from(repSet).map(name => buildSummary('REP', name)),
    ];
    return list;
  }, [
    selectedDate,
    posSales,
    dispatches,
    returns,
    branchExpenses,
    custodyTransfers,
    settlements,
  ]);

  const filteredSummaries = useMemo(() => {
    const byType =
      accountFilter === 'ALL'
        ? accountSummaries
        : accountSummaries.filter(a => a.accountType === accountFilter);

    // Show accounts with activity first
    return [...byType].sort((a, b) => {
      const aActive = a.dayState !== 'NO_ACTIVITY' ? 1 : 0;
      const bActive = b.dayState !== 'NO_ACTIVITY' ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      if (a.accountType !== b.accountType) {
        return a.accountType === 'BRANCH' ? -1 : 1;
      }
      return b.totalSalesAmount - a.totalSalesAmount;
    });
  }, [accountSummaries, accountFilter]);

  // Top KPI totals for selectedDate
  const dayKpis = useMemo(() => {
    const totalSales = accountSummaries.reduce((s, a) => s + a.totalSalesAmount, 0);
    const totalWeightKg = Number(
      accountSummaries.reduce((s, a) => s + a.totalWeightKg, 0).toFixed(2)
    );
    const totalCashSales = accountSummaries.reduce((s, a) => s + a.cashSalesAmount, 0);
    const totalCreditSales = accountSummaries.reduce(
      (s, a) => s + a.creditSalesAmount,
      0
    );
    const totalCardSales = accountSummaries.reduce((s, a) => s + a.cardSalesAmount, 0);
    const totalExpected = accountSummaries.reduce(
      (s, a) => s + a.expectedTotalToday,
      0
    );
    const totalReturned = accountSummaries.reduce(
      (s, a) => s + a.returnedTotalToday,
      0
    );
    const totalVariance = totalReturned - totalExpected;
    return {
      totalSales,
      totalWeightKg,
      totalCashSales,
      totalCreditSales,
      totalCardSales,
      totalExpected,
      totalReturned,
      totalVariance,
    };
  }, [accountSummaries]);

  // Open Settle Modal
  const handleOpenSettleModal = (acc: AccountDailySummary) => {
    setSettlingAccount(acc);
    setSettlementNo(`SET-${Math.floor(1000 + Math.random() * 9000)}`);
    const remainingCash = Math.max(0, acc.expectedCashToday - acc.returnedCashToday);
    const remainingCard = Math.max(0, acc.cardSalesAmount - acc.returnedCardToday);
    setCollectedDebtInput(0);
    setReturnedCashInput(remainingCash);
    setReturnedCardInput(remainingCard);
    setSettlementNotes(
      `تەسفییەی حسابی ڕۆژانە بۆ بەرواری ${selectedDate}`
    );
  };

  const handleSubmitSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlingAccount || !settlementNo.trim()) {
      alert('تکایە ژمارەی وەسڵی تەسفییە بنووسە');
      return;
    }

    const newDebtCollected = Math.max(0, Number(collectedDebtInput) || 0);
    const newReturnedCash = Math.max(0, Number(returnedCashInput) || 0);
    const newReturnedCard =
      settlingAccount.accountType === 'BRANCH'
        ? Math.max(0, Number(returnedCardInput) || 0)
        : 0;

    // Expected from this settlement step (or remaining day balance including newly entered debt collection)
    const remainingExpectedCashAfterNewDebt =
      Math.max(0, settlingAccount.expectedCashToday - settlingAccount.returnedCashToday) +
      newDebtCollected;
    const remainingExpectedCard =
      settlingAccount.accountType === 'BRANCH'
        ? Math.max(0, settlingAccount.cardSalesAmount - settlingAccount.returnedCardToday)
        : 0;

    const cumulativeExpectedAll =
      settlingAccount.expectedTotalToday + newDebtCollected;
    const cumulativeReturnedAll =
      settlingAccount.returnedTotalToday + newReturnedCash + newReturnedCard;
    const postVariance = cumulativeReturnedAll - cumulativeExpectedAll;

    const status: DailySettlement['status'] =
      postVariance === 0
        ? 'MATCHED'
        : postVariance < 0
        ? 'SHORTAGE'
        : 'SURPLUS';

    addDailySettlement({
      settlementNo: settlementNo.trim(),
      date: selectedDate,
      settledAtDate: new Date().toISOString().split('T')[0],
      settledAtTime: new Date().toLocaleTimeString('ckb-IQ', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      accountType: settlingAccount.accountType,
      accountName: settlingAccount.accountName,
      totalWeightKg: settlingAccount.totalWeightKg,
      totalSalesAmount: settlingAccount.totalSalesAmount,
      cashSalesAmount: settlingAccount.cashSalesAmount,
      creditSalesAmount: settlingAccount.creditSalesAmount,
      cardSalesAmount: settlingAccount.cardSalesAmount,
      returnsAmount: settlingAccount.returnsAmount,
      expensesAmount: settlingAccount.expensesAmount,
      collectedDebtAmount: newDebtCollected,
      expectedCashAmount: remainingExpectedCashAfterNewDebt + remainingExpectedCard,
      returnedCashAmount: newReturnedCash,
      returnedCardAmount: newReturnedCard,
      varianceAmount: postVariance,
      status,
      settledBy:
        currentUser?.role === 'SUPER_ADMIN'
          ? 'بەڕێوەبەری کارگە'
          : currentUser?.name || 'ژمێریار',
      notes: settlementNotes.trim(),
    });

    setSettlingAccount(null);
  };

  const displayedSettlements = useMemo(() => {
    const list =
      historyScope === 'DATE'
        ? settlements.filter(s => s.date.slice(0, 10) === selectedDate)
        : settlements;
    if (accountFilter === 'ALL') return list;
    return list.filter(s => s.accountType === accountFilter);
  }, [settlements, historyScope, selectedDate, accountFilter]);

  const renderStatusBadge = (acc: AccountDailySummary) => {
    switch (acc.dayState) {
      case 'NO_ACTIVITY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/[0.05] text-[#86868B]">
            فرۆشی تێدا نەبووە
          </span>
        );
      case 'UNSETTLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF9500]/12 text-[#B25000] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            چاوەڕوانی تەسفییە
          </span>
        );
      case 'MATCHED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#34C759]/12 text-[#248A3D] flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            تەسفییە سافە (0 د.ع)
          </span>
        );
      case 'SHORTAGE':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF3B30]/12 text-[#FF3B30] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            ماوە / کورتهێنان: {Math.abs(acc.varianceToday).toLocaleString()} د.ع
          </span>
        );
      case 'SURPLUS':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0071E3]/12 text-[#0071E3]">
            زیادە گەڕاوە: +{acc.varianceToday.toLocaleString()} د.ع
          </span>
        );
    }
  };

  // Preview math for modal
  const modalPreview = useMemo(() => {
    if (!settlingAccount) return null;
    const newDebt = Math.max(0, Number(collectedDebtInput) || 0);
    const newCash = Math.max(0, Number(returnedCashInput) || 0);
    const newCard =
      settlingAccount.accountType === 'BRANCH'
        ? Math.max(0, Number(returnedCardInput) || 0)
        : 0;
    const totalExpected = settlingAccount.expectedTotalToday + newDebt;
    const totalReturned = settlingAccount.returnedTotalToday + newCash + newCard;
    const variance = totalReturned - totalExpected;
    return { newDebt, newCash, newCard, totalExpected, totalReturned, variance };
  }, [settlingAccount, collectedDebtInput, returnedCashInput, returnedCardInput]);

  return (
    <div className="space-y-6 pb-10">
      {/* Main Interactive Area (hidden when printing statement) */}
      <div className={statementAccount ? 'space-y-6 no-print' : 'space-y-6'}>
        {/* Header & Date Filter Bar */}
        <div className="apple-card p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#34C759]/12 text-[#248A3D] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#1D1D1F]">
                  کەشفی حسابی ڕۆژانەی مەندوب و شۆرۆم و تەسفییەی پارە
                </h3>
                <p className="text-xs text-[#86868B] mt-0.5">
                  ڕاکێشانی فرۆشتنی ڕۆژ، بەراوردکردنی لەگەڵ پارەی گەڕاوە (تەسلیمکراو)، و تۆمارکردنی تەسفییە
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2 bg-[#F5F5F7] px-3 py-1.5 rounded-xl border border-black/[0.06]">
                <Calendar className="w-4 h-4 text-[#0071E3]" />
                <span className="text-xs font-bold text-[#515154]">بەروار:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-[#1D1D1F] outline-none font-mono"
                />
              </div>

              <div className="apple-segmented text-xs">
                <button
                  type="button"
                  onClick={() => setAccountFilter('ALL')}
                  className={`apple-segment-btn ${
                    accountFilter === 'ALL' ? 'apple-segment-btn-active' : ''
                  }`}
                >
                  هەموو
                </button>
                <button
                  type="button"
                  onClick={() => setAccountFilter('BRANCH')}
                  className={`apple-segment-btn ${
                    accountFilter === 'BRANCH' ? 'apple-segment-btn-active' : ''
                  }`}
                >
                  شۆرۆم (POS)
                </button>
                <button
                  type="button"
                  onClick={() => setAccountFilter('REP')}
                  className={`apple-segment-btn ${
                    accountFilter === 'REP' ? 'apple-segment-btn-active' : ''
                  }`}
                >
                  مەندوبەکان
                </button>
              </div>
            </div>
          </div>

          {/* Quick Active Dates Strip */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/[0.05]">
            <span className="text-[11px] font-bold text-[#86868B] ml-1">
              بەروارە چالاکەکان:
            </span>
            {activeDates.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono transition-all ${
                  selectedDate === d
                    ? 'bg-[#0071E3] text-white shadow-xs'
                    : 'bg-[#F5F5F7] text-[#515154] hover:bg-[#E8E8ED]'
                }`}
              >
                {d === todayISO ? `${d} (ئەمڕۆ)` : d}
              </button>
            ))}
          </div>
        </div>

        {/* Daily KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="apple-card p-5">
            <span className="text-xs font-semibold text-[#86868B]">
              کۆی فرۆشتنی ڕۆژی {selectedDate}
            </span>
            <div className="text-2xl font-black text-[#1D1D1F] tabular-nums mt-2">
              {dayKpis.totalSales.toLocaleString()}{' '}
              <span className="text-xs font-medium text-[#86868B]">د.ع</span>
            </div>
            <div className="text-[11px] text-[#0071E3] font-semibold mt-1 tabular-nums">
              {dayKpis.totalWeightKg} کگم • کاش {dayKpis.totalCashSales.toLocaleString()} | قەرز{' '}
              {dayKpis.totalCreditSales.toLocaleString()}
            </div>
          </div>

          <div className="apple-card p-5">
            <span className="text-xs font-semibold text-[#86868B]">
              پارەی پێویست گەڕانەوە (نەقد + کارت)
            </span>
            <div className="text-2xl font-black text-[#0071E3] tabular-nums mt-2">
              {dayKpis.totalExpected.toLocaleString()}{' '}
              <span className="text-xs font-medium text-[#86868B]">د.ع</span>
            </div>
            <div className="text-[11px] text-[#86868B] font-medium mt-1">
              دوای کەمکردنەوەی خەرجی شۆرۆم و زیادکردنی قەرزی وەرگیراو
            </div>
          </div>

          <div className="apple-card p-5">
            <span className="text-xs font-semibold text-[#86868B]">
              کۆی پارەی گەڕاوە / تەسلیمکراو
            </span>
            <div className="text-2xl font-black text-[#248A3D] tabular-nums mt-2">
              {dayKpis.totalReturned.toLocaleString()}{' '}
              <span className="text-xs font-medium text-[#86868B]">د.ع</span>
            </div>
            <div className="text-[11px] text-[#248A3D] font-medium mt-1">
              تۆمارکراو لە سەنەدەکانی تەسفییەی ئەمڕۆدا
            </div>
          </div>

          <div className="apple-card p-5">
            <span className="text-xs font-semibold text-[#86868B]">
              جیاوازی و باڵانسی تەسفییە
            </span>
            <div
              className={`text-2xl font-black tabular-nums mt-2 ${
                dayKpis.totalVariance === 0
                  ? 'text-[#248A3D]'
                  : dayKpis.totalVariance < 0
                  ? 'text-[#FF3B30]'
                  : 'text-[#0071E3]'
              }`}
            >
              {dayKpis.totalVariance === 0
                ? '0'
                : dayKpis.totalVariance > 0
                ? `+${dayKpis.totalVariance.toLocaleString()}`
                : dayKpis.totalVariance.toLocaleString()}{' '}
              <span className="text-xs font-medium text-[#86868B]">د.ع</span>
            </div>
            <div className="text-[11px] font-semibold mt-1 text-[#515154]">
              {dayKpis.totalVariance === 0
                ? 'تەواو ساف و هاوسەنگە'
                : dayKpis.totalVariance < 0
                ? 'کورتهێنان / چاوەڕوانی تەسلیمکردن'
                : 'زیادە لە بڕی فرۆشتنی ڕۆژ'}
            </div>
          </div>
        </div>

        {/* Per-Account Daily Comparison Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSummaries.map(acc => (
            <div
              key={`${acc.accountType}-${acc.accountName}`}
              className="apple-card p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-4">
                {/* Card Title & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                        acc.accountType === 'BRANCH'
                          ? 'bg-[#AF52DE]/12 text-[#AF52DE]'
                          : 'bg-[#0071E3]/12 text-[#0071E3]'
                      }`}
                    >
                      {acc.accountType === 'BRANCH' ? (
                        <Store className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-[#1D1D1F]">
                        {acc.accountName}
                      </h4>
                      <span className="text-[10px] text-[#86868B] font-semibold">
                        {acc.receipts.length} وەسڵی فرۆشتن • {acc.totalWeightKg} کگم لە{' '}
                        {selectedDate}
                      </span>
                    </div>
                  </div>
                  {renderStatusBadge(acc)}
                </div>

                {/* Sales Breakdown Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#F5F5F7]">
                    <span className="text-[10px] text-[#86868B] block">کۆی فرۆشتن</span>
                    <span className="font-black text-[#1D1D1F] tabular-nums">
                      {acc.totalSalesAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#34C759]/8">
                    <span className="text-[10px] text-[#248A3D] block font-semibold">
                      فرۆشی کاش
                    </span>
                    <span className="font-black text-[#248A3D] tabular-nums">
                      {acc.cashSalesAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FF9500]/10">
                    <span className="text-[10px] text-[#B25000] block font-semibold">
                      فرۆشی قەرز
                    </span>
                    <span className="font-black text-[#B25000] tabular-nums">
                      {acc.creditSalesAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                  {acc.accountType === 'BRANCH' ? (
                    <div className="p-2.5 rounded-xl bg-[#0071E3]/8">
                      <span className="text-[10px] text-[#0071E3] block font-semibold">
                        کارت / FIB
                      </span>
                      <span className="font-black text-[#0071E3] tabular-nums">
                        {acc.cardSalesAmount.toLocaleString()} د.ع
                      </span>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-[#FF3B30]/8">
                      <span className="text-[10px] text-[#FF3B30] block font-semibold">
                        گەڕاوەی ٣ ڕۆژ ({acc.returnsCount})
                      </span>
                      <span className="font-black text-[#FF3B30] tabular-nums">
                        {acc.returnsAmount.toLocaleString()} د.ع
                      </span>
                    </div>
                  )}
                </div>

                {/* Cash Comparison Bar: Expected vs Returned vs Difference */}
                <div className="p-3.5 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#515154]">
                    <span className="flex items-center gap-1">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#0071E3]" />
                      بەراوردکردنی پارەی پێویست گەڕانەوە لەگەڵ پارەی تەسلیمکراو:
                    </span>
                    {acc.accountType === 'BRANCH' && acc.expensesAmount > 0 && (
                      <span className="text-[#FF3B30]">
                        خەرجی شۆرۆم: -{acc.expensesAmount.toLocaleString()} د.ع
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-[#86868B] block">
                        پێویستە بگەڕێتەوە
                      </span>
                      <span className="text-sm font-black text-[#0071E3] tabular-nums">
                        {acc.expectedTotalToday.toLocaleString()} د.ع
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#86868B] block">
                        پارەی گەڕاوە (تەسلیم)
                      </span>
                      <span className="text-sm font-black text-[#248A3D] tabular-nums">
                        {acc.returnedTotalToday.toLocaleString()} د.ع
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#86868B] block">جیاوازی</span>
                      <span
                        className={`text-sm font-black tabular-nums ${
                          acc.varianceToday === 0
                            ? 'text-[#248A3D]'
                            : acc.varianceToday < 0
                            ? 'text-[#FF3B30]'
                            : 'text-[#0071E3]'
                        }`}
                      >
                        {acc.varianceToday > 0
                          ? `+${acc.varianceToday.toLocaleString()}`
                          : acc.varianceToday.toLocaleString()}{' '}
                        د.ع
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-black/[0.05]">
                <button
                  type="button"
                  onClick={() => setStatementAccount(acc)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
                  ڕاکێشانی کەشفی حساب
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenSettleModal(acc)}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  تەسفییەی حساب
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Daily Settlements History Table */}
        <div className="apple-card overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FBFBFD]">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#0071E3]" />
              <span className="font-bold text-xs text-[#1D1D1F]">
                تۆماری تەسفییەکانی حسابی مەندوب و شۆرۆم ({displayedSettlements.length})
              </span>
            </div>
            <div className="apple-segmented text-[11px]">
              <button
                type="button"
                onClick={() => setHistoryScope('DATE')}
                className={`apple-segment-btn ${
                  historyScope === 'DATE' ? 'apple-segment-btn-active' : ''
                }`}
              >
                بەرواری {selectedDate}
              </button>
              <button
                type="button"
                onClick={() => setHistoryScope('ALL')}
                className={`apple-segment-btn ${
                  historyScope === 'ALL' ? 'apple-segment-btn-active' : ''
                }`}
              >
                هەموو ڕۆژەکان ({settlements.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-3.5">ژ. تەسفییە</th>
                  <th className="p-3.5">بەرواری فرۆشتن</th>
                  <th className="p-3.5">حساب (مەندوب / شۆرۆم)</th>
                  <th className="p-3.5">کۆی فرۆش (کاش + قەرز)</th>
                  <th className="p-3.5">پێویست بوو بگەڕێتەوە</th>
                  <th className="p-3.5">پارەی گەڕاوە</th>
                  <th className="p-3.5">دۆخی تەسفییە</th>
                  <th className="p-3.5">تێبینی و چاپ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {displayedSettlements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#86868B]">
                      هیچ تەسفییەیەک بۆ ئەم بەروارە تۆمار نەکراوە
                    </td>
                  </tr>
                ) : (
                  displayedSettlements.map(s => (
                    <tr key={s.id} className="hover:bg-[#FBFBFD] transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#0071E3]">
                        {s.settlementNo}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-[#1D1D1F] font-mono">{s.date}</div>
                        <div className="text-[10px] text-[#86868B]">
                          تەسفییە: {s.settledAtDate} • {s.settledAtTime}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-[#1D1D1F]">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ml-1.5 ${
                            s.accountType === 'BRANCH' ? 'bg-[#AF52DE]' : 'bg-[#0071E3]'
                          }`}
                        />
                        {s.accountName}
                      </td>
                      <td className="p-3.5 tabular-nums">
                        <div className="font-bold text-[#1D1D1F]">
                          {s.totalSalesAmount.toLocaleString()} د.ع
                        </div>
                        <div className="text-[10px] text-[#86868B]">
                          کاش {s.cashSalesAmount.toLocaleString()} • قەرز{' '}
                          {s.creditSalesAmount.toLocaleString()}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-[#0071E3] tabular-nums">
                        {s.expectedCashAmount.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 font-black text-[#248A3D] tabular-nums">
                        {(s.returnedCashAmount + s.returnedCardAmount).toLocaleString()} د.ع
                        {s.returnedCardAmount > 0 && (
                          <div className="text-[10px] text-[#0071E3] font-semibold">
                            (کارت: {s.returnedCardAmount.toLocaleString()})
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        {s.status === 'MATCHED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#34C759]/12 text-[#248A3D]">
                            تەواو ساف (0)
                          </span>
                        ) : s.status === 'SHORTAGE' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF3B30]/12 text-[#FF3B30]">
                            کورتهێنان: {Math.abs(s.varianceAmount).toLocaleString()} د.ع
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#0071E3]/12 text-[#0071E3]">
                            زیادە: +{s.varianceAmount.toLocaleString()} د.ع
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-[11px] text-[#515154]">
                        <div>{s.notes || '---'}</div>
                        <div className="text-[10px] text-[#86868B]">
                          تەسفییەکار: {s.settledBy || 'بەڕێوەبەر'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal 1: Settle Daily Account */}
      {settlingAccount && modalPreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                  تەسفییەی حسابی ڕۆژانە — {selectedDate}
                </h3>
                <p className="text-[11px] text-[#0071E3] font-bold mt-0.5">
                  {settlingAccount.accountName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingAccount(null)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#86868B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSettlement} className="space-y-3.5">
              {/* Day Financial Summary */}
              <div className="p-3.5 rounded-2xl bg-[#F5F5F7] grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <span className="text-[10px] text-[#86868B] block">فرۆشی کاش</span>
                  <span className="font-black text-[#248A3D] tabular-nums">
                    {settlingAccount.cashSalesAmount.toLocaleString()} د.ع
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] block">فرۆشی قەرز</span>
                  <span className="font-black text-[#B25000] tabular-nums">
                    {settlingAccount.creditSalesAmount.toLocaleString()} د.ع
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] block">
                    پێشتر گەڕاوەتەوە
                  </span>
                  <span className="font-black text-[#1D1D1F] tabular-nums">
                    {settlingAccount.returnedTotalToday.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    ژمارەی وەسڵی تەسفییە *
                  </label>
                  <input
                    type="text"
                    required
                    value={settlementNo}
                    onChange={e => setSettlementNo(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    قەرزی کۆن وەرگیراو لە بازاڕ (اختیاری)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={collectedDebtInput}
                    onChange={e =>
                      setCollectedDebtInput(e.target.value ? Number(e.target.value) : '')
                    }
                    className="apple-input w-full px-3.5 py-2 font-bold"
                  />
                </div>
              </div>

              <div
                className={`grid grid-cols-1 ${
                  settlingAccount.accountType === 'BRANCH' ? 'sm:grid-cols-2' : ''
                } gap-3`}
              >
                <div>
                  <label className="block text-[#1D1D1F] font-bold mb-1 flex items-center gap-1">
                    <Banknote className="w-3.5 h-3.5 text-[#34C759]" />
                    بڕی پارەی کاشی گەڕاوە / تەسلیمکراو (د.ع) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={returnedCashInput}
                    onChange={e =>
                      setReturnedCashInput(e.target.value ? Number(e.target.value) : '')
                    }
                    className="apple-input w-full px-3.5 py-2.5 font-black text-sm border-[#34C759]/40"
                  />
                </div>

                {settlingAccount.accountType === 'BRANCH' && (
                  <div>
                    <label className="block text-[#1D1D1F] font-bold mb-1 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#0071E3]" />
                      بڕی پارەی کارت / FIB گەڕاوە (د.ع)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={returnedCardInput}
                      onChange={e =>
                        setReturnedCardInput(e.target.value ? Number(e.target.value) : '')
                      }
                      className="apple-input w-full px-3.5 py-2.5 font-black text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Live Variance Preview Box */}
              <div className="p-3.5 rounded-2xl bg-[#FBFBFD] border border-black/[0.08] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-[#86868B]">کۆی داواکراو بۆ گەڕانەوە:</span>
                  <span className="font-bold text-[#0071E3] tabular-nums">
                    {modalPreview.totalExpected.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">کۆی گەڕاوە دوای ئەم تەسفییەیە:</span>
                  <span className="font-bold text-[#248A3D] tabular-nums">
                    {modalPreview.totalReturned.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-black/[0.06] font-black">
                  <span>دۆخی کۆتایی ڕۆژ:</span>
                  <span
                    className={
                      modalPreview.variance === 0
                        ? 'text-[#248A3D]'
                        : modalPreview.variance < 0
                        ? 'text-[#FF3B30]'
                        : 'text-[#0071E3]'
                    }
                  >
                    {modalPreview.variance === 0
                      ? '✓ تەواو ساف دەبێت (0 د.ع)'
                      : modalPreview.variance < 0
                      ? `کورتهێنان / ماوە: ${Math.abs(
                          modalPreview.variance
                        ).toLocaleString()} د.ع`
                      : `زیادە: +${modalPreview.variance.toLocaleString()} د.ع`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={settlementNotes}
                  onChange={e => setSettlementNotes(e.target.value)}
                  className="apple-input w-full px-3.5 py-2"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSettlingAccount(null)}
                  className="w-1/2 py-2.5 rounded-full bg-[#F5F5F7] text-[#515154] font-semibold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold shadow-sm shadow-[#0071E3]/25"
                >
                  تۆمارکردنی تەسفییە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Daily Account Statement & Comparison Sheet (Printable A4) */}
      {statementAccount && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0 print:block">
          <div className="bg-white rounded-3xl w-full max-w-4xl my-6 shadow-2xl border border-black/[0.08] overflow-hidden print:my-0 print:shadow-none print:border-0 print:rounded-none print:max-w-none">
            {/* Modal Screen Toolbar */}
            <div className="px-6 py-4 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between no-print">
              <div>
                <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                  کەشفی حسابی ڕۆژانە و بەراوردی پارە — {statementAccount.accountName}
                </h3>
                <span className="text-[11px] text-[#86868B] font-mono">
                  بەروار: {selectedDate}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  چاپکردنی کەشفی حساب
                </button>
                <button
                  type="button"
                  onClick={() => setStatementAccount(null)}
                  className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#86868B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Statement Content */}
            <div className="p-6 space-y-5 text-xs">
              {/* Official Print Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#1D1D1F]/15">
                <div>
                  <h2 className="text-lg font-black text-[#1D1D1F]">
                    کارگەی مریشکی فرێش (FFC-POS) — کەشفی حسابی فرۆشی ڕۆژانە
                  </h2>
                  <p className="text-xs font-bold text-[#0071E3] mt-1">
                    حساب: {statementAccount.accountName}
                  </p>
                </div>
                <div className="text-left sm:text-left font-mono">
                  <div className="font-bold text-[#1D1D1F]">بەروار: {selectedDate}</div>
                  <div className="text-[11px] text-[#86868B]">
                    ژمارەی وەسڵەکان: {statementAccount.receipts.length} وەسڵ
                  </div>
                </div>
              </div>

              {/* Financial Comparison Summary Box */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#F5F5F7]">
                  <span className="text-[10px] text-[#86868B] block">کۆی فرۆشتن</span>
                  <span className="font-black text-sm text-[#1D1D1F] tabular-nums">
                    {statementAccount.totalSalesAmount.toLocaleString()} د.ع
                  </span>
                  <span className="text-[10px] text-[#86868B] block mt-0.5">
                    {statementAccount.totalWeightKg} کگم
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#34C759]/10">
                  <span className="text-[10px] text-[#248A3D] block font-semibold">
                    فرۆشی کاش
                  </span>
                  <span className="font-black text-sm text-[#248A3D] tabular-nums">
                    {statementAccount.cashSalesAmount.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#FF9500]/10">
                  <span className="text-[10px] text-[#B25000] block font-semibold">
                    فرۆشی قەرز
                  </span>
                  <span className="font-black text-sm text-[#B25000] tabular-nums">
                    {statementAccount.creditSalesAmount.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#0071E3]/10">
                  <span className="text-[10px] text-[#0071E3] block font-semibold">
                    پێویست بوو بگەڕێتەوە
                  </span>
                  <span className="font-black text-sm text-[#0071E3] tabular-nums">
                    {statementAccount.expectedTotalToday.toLocaleString()} د.ع
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-[#1D1D1F] text-white">
                  <span className="text-[10px] text-white/70 block">
                    گەڕاوە و جیاوازی
                  </span>
                  <span className="font-black text-sm tabular-nums block">
                    {statementAccount.returnedTotalToday.toLocaleString()} د.ع
                  </span>
                  <span className="text-[10px] font-bold block mt-0.5">
                    {statementAccount.varianceToday === 0
                      ? 'ساف (0 د.ع)'
                      : `جیاوازی: ${statementAccount.varianceToday.toLocaleString()} د.ع`}
                  </span>
                </div>
              </div>

              {/* Itemized Receipts Table */}
              <div className="border border-black/[0.08] rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F5F5F7] font-bold text-[#1D1D1F] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-[#0071E3]" />
                    وردەکاریی وەسڵەکانی فرۆشتن لە ڕۆژی {selectedDate}
                  </span>
                  <span>{statementAccount.totalWeightKg} کگم</span>
                </div>
                <table className="w-full text-right">
                  <thead className="bg-[#FBFBFD] text-[#515154] font-bold border-b border-black/[0.06]">
                    <tr>
                      <th className="p-3">ژ. وەسڵ</th>
                      <th className="p-3">کات</th>
                      <th className="p-3">کڕیار / مارکێت / کاشێر</th>
                      <th className="p-3">شێوازی پارەدان</th>
                      <th className="p-3">کێش (کگم)</th>
                      <th className="p-3">بڕی پارە (د.ع)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04]">
                    {statementAccount.receipts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-[#86868B]">
                          هیچ وەسڵێکی فرۆشتن لەم بەروارەدا نییە
                        </td>
                      </tr>
                    ) : (
                      statementAccount.receipts.map(r => (
                        <tr key={r.id}>
                          <td className="p-3 font-mono font-bold text-[#0071E3]">
                            {r.receiptNo}
                          </td>
                          <td className="p-3 font-mono text-[#86868B]">{r.time}</td>
                          <td className="p-3 font-semibold text-[#1D1D1F]">
                            {r.partyLabel}
                          </td>
                          <td className="p-3">
                            {r.paymentKind === 'CASH' ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#34C759]/12 text-[#248A3D] font-bold text-[10px]">
                                کاش
                              </span>
                            ) : r.paymentKind === 'CARD' ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#0071E3]/12 text-[#0071E3] font-bold text-[10px]">
                                کارت / FIB
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#FF9500]/12 text-[#B25000] font-bold text-[10px]">
                                قەرز
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-bold tabular-nums">{r.weightKg} کگم</td>
                          <td className="p-3 font-black text-[#1D1D1F] tabular-nums">
                            {r.amount.toLocaleString()} د.ع
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Branch Expenses if any */}
              {statementAccount.expensesList.length > 0 && (
                <div className="border border-[#FF3B30]/20 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2 bg-[#FF3B30]/8 font-bold text-[#FF3B30]">
                    خەرجییەکانی شۆرۆم لەم ڕۆژەدا (-
                    {statementAccount.expensesAmount.toLocaleString()} د.ع)
                  </div>
                  <div className="divide-y divide-black/[0.04]">
                    {statementAccount.expensesList.map(ex => (
                      <div
                        key={ex.id}
                        className="px-4 py-2 flex items-center justify-between"
                      >
                        <span className="font-semibold text-[#1D1D1F]">{ex.title}</span>
                        <span className="font-bold text-[#FF3B30] tabular-nums">
                          -{ex.amount.toLocaleString()} د.ع
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settlements recorded today */}
              <div className="border border-black/[0.08] rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#F5F5F7] font-bold text-[#1D1D1F]">
                  پارە گەڕاوەکان و سەنەدی تەسفییەی تۆمارکراو ({statementAccount.settlementsToday.length})
                </div>
                {statementAccount.settlementsToday.length === 0 ? (
                  <div className="p-4 text-center text-[#B25000] font-semibold">
                    هێشتا پارەی گەڕاوە بۆ ئەم ڕۆژە تەسفییە نەکراوە
                  </div>
                ) : (
                  <table className="w-full text-right">
                    <thead className="bg-[#FBFBFD] text-[#515154] font-bold border-b border-black/[0.06]">
                      <tr>
                        <th className="p-3">ژ. تەسفییە</th>
                        <th className="p-3">کات</th>
                        <th className="p-3">کاشی گەڕاوە</th>
                        <th className="p-3">کارتی گەڕاوە</th>
                        <th className="p-3">قەرزی کۆن کۆکراو</th>
                        <th className="p-3">تێبینی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {statementAccount.settlementsToday.map(st => (
                        <tr key={st.id}>
                          <td className="p-3 font-mono font-bold text-[#0071E3]">
                            {st.settlementNo}
                          </td>
                          <td className="p-3 text-[#86868B]">{st.settledAtTime}</td>
                          <td className="p-3 font-black text-[#248A3D] tabular-nums">
                            {st.returnedCashAmount.toLocaleString()} د.ع
                          </td>
                          <td className="p-3 font-bold text-[#0071E3] tabular-nums">
                            {st.returnedCardAmount.toLocaleString()} د.ع
                          </td>
                          <td className="p-3 tabular-nums">
                            {st.collectedDebtAmount.toLocaleString()} د.ع
                          </td>
                          <td className="p-3 text-[#515154]">{st.notes || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-black/[0.08] text-center">
                <div>
                  <div className="font-bold text-[#1D1D1F]">
                    واژووی مەندوب / کاشێری شۆرۆم
                  </div>
                  <div className="mt-8 border-b border-dashed border-black/30 w-48 mx-auto" />
                </div>
                <div>
                  <div className="font-bold text-[#1D1D1F]">
                    واژووی ژمێریار / بەڕێوەبەری کارگە
                  </div>
                  <div className="mt-8 border-b border-dashed border-black/30 w-48 mx-auto" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
