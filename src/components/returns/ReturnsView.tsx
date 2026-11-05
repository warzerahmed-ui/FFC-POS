import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  RotateCcw,
  Plus,
  Clock,
  Printer,
  Search,
  CheckCircle,
  AlertTriangle,
  Scale,
  CreditCard,
  FileText,
} from 'lucide-react';
import { ReturnItem, DispatchOrder } from '../../types';

export const ReturnsView: React.FC = () => {
  const { returns, dispatches, products, addReturn, addDispatch } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<any | null>(null);

  // Form States
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [returnReason, setReturnReason] = useState<'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'>('EXPIRED_3_DAYS');
  const [notes, setNotes] = useState('گەڕاوەی تەلەفی ٣ ڕۆژ لە مارکێتەوە');

  // Sales Receipt selection
  const [selectedSalesReceiptNo, setSelectedSalesReceiptNo] = useState<string>('');
  const [selectedSalesReceipt, setSelectedSalesReceipt] = useState<DispatchOrder | null>(null);
  const [returnItemWeights, setReturnItemWeights] = useState<Record<string, number>>({});
  const [searchReceiptQuery, setSearchReceiptQuery] = useState('');

  // Eligible sales receipts
  const eligibleSalesReceipts = dispatches.filter(d => d.destinationType === 'REP');

  const filteredReceiptOptions = eligibleSalesReceipts.filter(d => {
    if (!searchReceiptQuery) return true;
    const q = searchReceiptQuery.toLowerCase();
    return (
      d.manualReceiptNo.toLowerCase().includes(q) ||
      (d.customerName && d.customerName.toLowerCase().includes(q)) ||
      (d.destinationName && d.destinationName.toLowerCase().includes(q)) ||
      (d.repName && d.repName.toLowerCase().includes(q))
    );
  });

  const handleSelectSalesReceipt = (receiptNo: string) => {
    setSelectedSalesReceiptNo(receiptNo);
    const found = dispatches.find(d => d.manualReceiptNo === receiptNo && d.destinationType === 'REP');
    if (found) {
      setSelectedSalesReceipt(found);
      const initialWeights: Record<string, number> = {};
      found.items.forEach(item => {
        initialWeights[item.productId] = 0;
      });
      setReturnItemWeights(initialWeights);
    } else {
      setSelectedSalesReceipt(null);
      setReturnItemWeights({});
    }
  };

  const handleOpenModal = () => {
    setManualReceiptNo(`RET-${Math.floor(300 + Math.random() * 100)}`);
    setSelectedSalesReceiptNo('');
    setSelectedSalesReceipt(null);
    setReturnItemWeights({});
    setSearchReceiptQuery('');
    setNotes('گەڕاوەی تەلەفی ٣ ڕۆژ لە مارکێتەوە');
    setShowModal(true);
  };

  // Return calculations
  const returnRows = selectedSalesReceipt ? selectedSalesReceipt.items.map(item => {
    const retWeight = returnItemWeights[item.productId] || 0;
    const prod = products.find(p => p.id === item.productId);
    const costPerKg = prod ? prod.costPerKg : 2600;
    const salePricePerKg = item.pricePerKg;

    return {
      productId: item.productId,
      productName: item.productName,
      soldWeightKg: item.weightKg,
      salePricePerKg,
      returnWeightKg: retWeight,
      costPerKg,
      customerDeduction: Math.round(retWeight * salePricePerKg),
      factoryLoss: Math.round(retWeight * costPerKg),
    };
  }) : [];

  const totalReturnKg = returnRows.reduce((sum, r) => sum + r.returnWeightKg, 0);
  const totalCustomerDeduction = returnRows.reduce((sum, r) => sum + r.customerDeduction, 0);
  const totalFactoryLoss = returnRows.reduce((sum, r) => sum + r.factoryLoss, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo) {
      alert('تکایە ژمارەی وەسڵی گەڕاوە بنووسە');
      return;
    }

    if (!selectedSalesReceipt) {
      alert('تکایە وەسڵی فرۆشتن دیاری بکە کە گەڕاوەکەی لێ دەکرێتەوە');
      return;
    }

    if (totalReturnKg <= 0) {
      alert('تکایە کێشی گەڕاوە بۆ بەلایەنی کەم یەک بەرهەمی ناو وەسڵەکە بنووسە');
      return;
    }

    for (const row of returnRows) {
      if (row.returnWeightKg > row.soldWeightKg) {
        alert(`کێشی گەڕاوەی ${row.productName} (${row.returnWeightKg} کگم) ناتوانێت لە کێشی فرۆشراوی سەر وەسڵ (${row.soldWeightKg} کگم) زیاتر بێت!`);
        return;
      }
    }

    const returnItems: ReturnItem[] = returnRows
      .filter(r => r.returnWeightKg > 0)
      .map(r => ({
        productId: r.productId,
        productName: r.productName,
        barcode: `RET-${r.productId}`,
        weightKg: r.returnWeightKg,
        soldWeightKg: r.soldWeightKg,
        salePricePerKg: r.salePricePerKg,
        unitCost: r.costPerKg,
        totalLoss: r.factoryLoss,
        customerDeductionAmount: r.customerDeduction,
        reason: returnReason,
      }));

    const finalCustomer = selectedSalesReceipt.customerName || selectedSalesReceipt.destinationName;

    // 1. Add to returns repository (Deducts directly from customer debt & goes to factory loss)
    addReturn({
      dispatchId: selectedSalesReceipt.id,
      salesReceiptNo: selectedSalesReceipt.manualReceiptNo,
      manualReceiptNo,
      date,
      time,
      sourceType: 'REP',
      sourceName: `${selectedSalesReceipt.repName || 'مەندوب'} (${finalCustomer})`,
      customerName: finalCustomer,
      repName: selectedSalesReceipt.repName,
      items: returnItems,
      totalWeightKg: totalReturnKg,
      totalLossAmount: totalFactoryLoss,
      totalCustomerDeduction: totalCustomerDeduction,
      disposalMethod: 'DESTROYED',
      notes: `گەڕاوەی تەلەف بۆ وەسڵی فرۆشتنی [${selectedSalesReceipt.manualReceiptNo}] - ${notes}`,
    });

    // 2. Also register in dispatches for unified ledger tracking
    addDispatch({
      manualReceiptNo,
      date,
      time,
      destinationType: 'RETURN',
      destinationName: finalCustomer,
      repName: selectedSalesReceipt.repName,
      customerName: finalCustomer,
      driverOrRepPhone: selectedSalesReceipt.driverOrRepPhone,
      items: returnItems.map(ri => ({
        productId: ri.productId,
        productName: ri.productName,
        barcode: ri.barcode,
        weightKg: ri.weightKg,
        pricePerKg: ri.salePricePerKg || 0,
        totalAmount: ri.customerDeductionAmount || ri.totalLoss,
      })),
      totalWeightKg: totalReturnKg,
      totalAmount: totalCustomerDeduction,
      status: 'RETURN_INSPECTED',
      notes: `گەڕاوەی وەسڵی فرۆشتنی ${selectedSalesReceipt.manualReceiptNo}`,
    });

    setShowModal(false);
  };

  // KPIs
  const totalAllReturnsKg = returns.reduce((sum, r) => sum + r.totalWeightKg, 0);
  const totalAllFactoryLoss = returns.reduce((sum, r) => sum + r.totalLossAmount, 0);
  const totalAllDeductedFromCustomers = returns.reduce((sum, r) => sum + (r.totalCustomerDeduction || r.totalLossAmount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2.5">
            <RotateCcw className="w-6 h-6 text-[#FF3B30]" />
            گەڕاوەی ٣ ڕۆژ (تەلەفی مارکێتەکان)
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            تۆمارکردنی گەڕاوەی مریشک بەستراوە بە وەسڵی فرۆشتن، کەمکردنەوە لە قەرزی مارکێت، و بردن بۆ تەلەفی کارگە
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 bg-[#FF3B30] hover:bg-[#E02D23] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#FF3B30]/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          + تۆمارکردنی وەسڵی گەڕاوەی ٣ ڕۆژ
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>کۆی کێشی تەلەفی ٣ ڕۆژ</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF3B30]">
            {totalAllReturnsKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="mt-2 text-[11px] text-[#FF3B30] font-semibold">
            لە فرۆشراوی مارکێتەکان گەڕاوەتەوە
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>داشکاو لە حسابی مارکێتەکان</span>
            <div className="w-8 h-8 rounded-2xl bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#248A3D]">
            -{totalAllDeductedFromCustomers.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#248A3D] font-medium">
            لە قەرزی کڕیاران کەمدەبێتەوە
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>زیانی تەلەفی کارگە (P&L)</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF9500]">
            {totalAllFactoryLoss.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            دەچێتە زیانی فەوتانی کۆگا
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>ژمارەی وەسڵە گەڕاوەکان</span>
            <div className="w-8 h-8 rounded-2xl bg-black/5 text-[#1D1D1F] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1D1D1F]">
            {returns.length} <span className="text-xs font-medium text-[#86868B]">وەسڵ</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            بەستراوە بە وەسڵی فرۆشتن
          </div>
        </div>
      </div>

      {/* Table of Returns */}
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1D1D1F]">
            لیستی تۆماری وەسڵەکانی گەڕاوە و تەلەفی ٣ ڕۆژ ({returns.length})
          </span>
          <span className="text-xs text-[#86868B]">بەستراوە بە وەسڵی فرۆشتن</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">ژ. وەسڵی گەڕاوە</th>
                <th className="p-4">بەروار و کات</th>
                <th className="p-4">وەسڵی فرۆشتن</th>
                <th className="p-4">ناوی مارکێت (کڕیار)</th>
                <th className="p-4">بەرهەمە گەڕاوەکان</th>
                <th className="p-4">کۆی کێش (کگم)</th>
                <th className="p-4">داشکاو لە کڕیار</th>
                <th className="p-4">تەلەفی کارگە</th>
                <th className="p-4 text-center">وەسڵ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#86868B]">
                    هیچ وەسڵێکی گەڕاوەی ٣ ڕۆژ تۆمار نەکراوە
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4 font-bold text-[#FF3B30]">
                      <span className="bg-[#FF3B30]/10 px-2.5 py-1 rounded-full text-[11px] font-mono">
                        {r.manualReceiptNo}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-[#1D1D1F]">{r.date}</div>
                      <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#86868B]" />
                        <span>{r.time || '10:00 ص'}</span>
                      </div>
                    </td>

                    <td className="p-4 font-mono font-bold text-[#0071E3]">
                      <span className="bg-[#0071E3]/10 px-2 py-0.5 rounded-lg text-[11px]">
                        {r.salesReceiptNo || 'وەسڵی پێشوو'}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-[#1D1D1F]">
                      {r.customerName || r.sourceName}
                    </td>

                    <td className="p-4 text-[#86868B]">
                      <div className="font-medium text-[#1D1D1F]">{r.items.length} بەرهەم</div>
                      <div className="text-[10px] text-[#86868B] truncate max-w-[150px]">
                        {r.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                      </div>
                    </td>

                    <td className="p-4 font-black text-[#FF3B30] text-sm">
                      {r.totalWeightKg.toLocaleString()} کگم
                    </td>

                    <td className="p-4 font-black text-[#248A3D]">
                      -{(r.totalCustomerDeduction || r.totalLossAmount).toLocaleString()} د.ع
                    </td>

                    <td className="p-4 font-black text-[#FF3B30]">
                      {r.totalLossAmount.toLocaleString()} د.ع
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedReceiptForPrint(r)}
                        className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#FF3B30] transition-colors"
                        title="بینینی وەسڵ و پرینت"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#FF3B30] text-white flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    تۆمارکردنی گەڕاوەی ٣ ڕۆژ بەپێی وەسڵی فرۆشتن
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    دیاریکردنی وەسڵی فرۆشتن و دەرهێنانی گەڕاوە لە حسابی کڕیار و بردن بۆ تەلەفی کارگە
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {/* Step 1: Select Sales Receipt */}
              <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#1D1D1F] text-xs flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-[#0071E3]" />
                      هەڵبژاردنی وەسڵی فرۆشتن (کە گەڕاوەکەی لێ دەکرێتەوە) *
                    </span>
                    <p className="text-[11px] text-[#86868B]">
                      تەنها ئەو بەرهەمانە پیشان دەدرێن کە لە ناو وەسڵەکەدا هەبوون و بە کەمتر یان یەکسان لە کێشی فرۆشراو
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="گەڕان بە ژ. وەسڵ یان مارکێت..."
                      value={searchReceiptQuery}
                      onChange={(e) => setSearchReceiptQuery(e.target.value)}
                      className="w-full bg-white border border-black/[0.08] rounded-xl px-3 py-1.5 text-xs text-[#1D1D1F] outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-44 overflow-y-auto pt-1">
                  {filteredReceiptOptions.length === 0 ? (
                    <div className="p-3 text-center text-[#86868B] bg-white rounded-xl">
                      هیچ وەسڵێکی فرۆشتنی مەندوب نەدۆزرایەوە
                    </div>
                  ) : (
                    filteredReceiptOptions.map((rcpt) => {
                      const isSelected = selectedSalesReceiptNo === rcpt.manualReceiptNo;
                      return (
                        <div
                          key={rcpt.id}
                          onClick={() => handleSelectSalesReceipt(rcpt.manualReceiptNo)}
                          className={`p-3 rounded-xl cursor-pointer border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? 'bg-[#0071E3]/10 border-[#0071E3] shadow-sm'
                              : 'bg-white hover:bg-[#F5F5F7] border-black/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2 py-0.5 rounded-lg font-mono font-bold text-[11px] ${
                              isSelected ? 'bg-[#0071E3] text-white' : 'bg-[#F5F5F7] text-[#0071E3]'
                            }`}>
                              {rcpt.manualReceiptNo}
                            </span>
                            <div>
                              <div className="font-bold text-[#1D1D1F]">
                                {rcpt.customerName || rcpt.destinationName}
                              </div>
                              <div className="text-[10px] text-[#86868B]">
                                مەندوب: {rcpt.repName || 'مەندوب'} • بەروار: {rcpt.date}
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="font-black text-[#1D1D1F]">{rcpt.totalWeightKg} کگم</div>
                            <div className="text-[10px] text-[#34C759] font-semibold">{rcpt.totalAmount.toLocaleString()} د.ع</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Return Items from that receipt */}
              {selectedSalesReceipt && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">
                        ژمارەی وەسڵی گەڕاوە *
                      </label>
                      <input
                        type="text"
                        required
                        value={manualReceiptNo}
                        onChange={(e) => setManualReceiptNo(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 font-bold font-mono text-[#1D1D1F] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">بەرواری گەڕانەوە *</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">هۆکاری تەلەف</label>
                      <select
                        value={returnReason}
                        onChange={(e: any) => setReturnReason(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-bold outline-none"
                      >
                        <option value="EXPIRED_3_DAYS">تەلەفی ٣ ڕۆژ لە مارکێت (سەرفنەکراو)</option>
                        <option value="DAMAGED">تێکچوو لە کاتی گواستنەوە</option>
                        <option value="SPOILED">زیانلێکەوتوو</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] bg-[#FBFBFD] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1D1D1F]">
                        بەرهەمە فرۆشراوەکانی ناو وەسڵی [{selectedSalesReceipt.manualReceiptNo}]:
                      </span>
                      <span className="text-[11px] text-[#0071E3] font-semibold bg-[#0071E3]/10 px-2.5 py-0.5 rounded-full">
                        تەنها لەم بەرهەمانە و کەمتر لە کێشەکەی دەگەڕێتەوە
                      </span>
                    </div>

                    <div className="bg-white rounded-xl border border-black/[0.06] overflow-hidden">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#F5F5F7] text-[#515154] font-bold">
                          <tr>
                            <th className="p-3">بەرهەم</th>
                            <th className="p-3">کێشی فرۆشراو</th>
                            <th className="p-3">نرخی فرۆش</th>
                            <th className="p-3 w-36">کێشی گەڕاوە (کگم) *</th>
                            <th className="p-3">داشکاو لە کڕیار</th>
                            <th className="p-3">تەلەفی کارگە</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04]">
                          {returnRows.map((row) => {
                            const isOver = row.returnWeightKg > row.soldWeightKg;
                            return (
                              <tr key={row.productId} className={isOver ? 'bg-[#FF3B30]/5' : ''}>
                                <td className="p-3 font-bold text-[#1D1D1F]">{row.productName}</td>
                                <td className="p-3 font-semibold text-[#86868B]">{row.soldWeightKg} کگم</td>
                                <td className="p-3 text-[#515154]">{row.salePricePerKg.toLocaleString()} د.ع</td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={row.soldWeightKg}
                                    placeholder="0"
                                    value={returnItemWeights[row.productId] === 0 ? '' : (returnItemWeights[row.productId] || '')}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                                      setReturnItemWeights(prev => ({
                                        ...prev,
                                        [row.productId]: val,
                                      }));
                                    }}
                                    className={`w-full bg-[#F5F5F7] border rounded-xl px-3 py-1.5 font-black text-sm text-[#1D1D1F] outline-none ${
                                      isOver
                                        ? 'border-[#FF3B30] text-[#FF3B30] bg-[#FF3B30]/10'
                                        : 'border-black/[0.08] focus:border-[#0071E3]'
                                    }`}
                                  />
                                  {isOver && (
                                    <div className="text-[10px] text-[#FF3B30] font-bold mt-1">
                                      لە کێشی فرۆشراو زیاترە!
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 font-black text-[#248A3D]">
                                  {row.customerDeduction > 0
                                    ? `-${row.customerDeduction.toLocaleString()} د.ع`
                                    : '0 د.ع'}
                                </td>
                                <td className="p-3 font-black text-[#FF3B30]">
                                  {row.factoryLoss > 0
                                    ? `${row.factoryLoss.toLocaleString()} د.ع`
                                    : '0 د.ع'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F5F5F7] to-[#EAEAEA] border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] text-[#86868B] block font-semibold">کاریگەری تۆمارکردنی ئەم گەڕاوەیە:</span>
                      <div className="flex items-center gap-4 mt-1">
                        <div>
                          <span className="text-[10px] text-[#86868B]">کۆی کێشی تەلەف:</span>
                          <div className="text-base font-black text-[#1D1D1F]">{totalReturnKg} کگم</div>
                        </div>
                        <div className="border-r border-black/10 pr-4">
                          <span className="text-[10px] text-[#248A3D] font-bold">دەردەچێت لە قەرزی مارکێت:</span>
                          <div className="text-base font-black text-[#248A3D]">-{totalCustomerDeduction.toLocaleString()} د.ع</div>
                        </div>
                        <div className="border-r border-black/10 pr-4">
                          <span className="text-[10px] text-[#FF3B30] font-bold">دەچێتە تەلەفی کارگە:</span>
                          <div className="text-base font-black text-[#FF3B30]">+{totalFactoryLoss.toLocaleString()} د.ع</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-black/[0.06] text-[11px] text-[#515154]">
                      <span className="font-bold text-[#1D1D1F] block">مارکێتی پەیوەندیدار:</span>
                      <span>{selectedSalesReceipt.customerName || selectedSalesReceipt.destinationName}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="تێبینی دەربارەی گەڕاوەکە..."
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none focus:border-[#FF3B30]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#FF3B30] hover:bg-[#E02D23] shadow-md shadow-[#FF3B30]/25 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  پەسەندکردنی گەڕاوەی ٣ ڕۆژ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceiptForPrint && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1D1D1F]">وەسڵی گەڕاوەی ٣ ڕۆژ (تەلەف)</h3>
                <p className="text-[11px] text-[#86868B]">کارگەی مریشکی فرێش</p>
              </div>
              <button
                onClick={() => setSelectedReceiptForPrint(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>ژمارەی وەسڵی گەڕاوە:</span>
                <span className="font-bold text-[#FF3B30]">{selectedReceiptForPrint.manualReceiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>وەسڵی فرۆشتن:</span>
                <span className="font-bold text-[#0071E3]">{selectedReceiptForPrint.salesReceiptNo || 'وەسڵی فرۆشتن'}</span>
              </div>
              <div className="flex justify-between">
                <span>بەروار و کات:</span>
                <span>{selectedReceiptForPrint.date} - {selectedReceiptForPrint.time || '10:00 ص'}</span>
              </div>
              <div className="flex justify-between">
                <span>ناوی مەندوب:</span>
                <span className="font-bold">{selectedReceiptForPrint.repName || 'مەندوب'}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>مارکێتی کڕیار:</span>
                <span className="font-bold">{selectedReceiptForPrint.customerName || selectedReceiptForPrint.sourceName}</span>
              </div>

              <div className="space-y-1.5 py-2">
                <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                  <span>بەرهەم</span>
                  <span>کێشی گەڕاوە</span>
                </div>
                {selectedReceiptForPrint.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.productName}</span>
                    <span className="font-bold">{item.weightKg} کگم</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                <span>کۆی کێشی تەلەف:</span>
                <span className="text-[#FF3B30]">{selectedReceiptForPrint.totalWeightKg} کگم</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#248A3D]">
                <span>داشکاو لە حسابی مارکێت:</span>
                <span>-{(selectedReceiptForPrint.totalCustomerDeduction || selectedReceiptForPrint.totalLossAmount).toLocaleString()} د.ع</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#FF3B30] hover:bg-[#E02D23] text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                پرینتکردنی وەسڵ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
