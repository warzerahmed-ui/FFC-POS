import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  Plus,
  Truck,
  Gift,
  RotateCcw,
  Store,
  CreditCard,
  Banknote,
  Clock,
  Printer,
  Trash2,
  CheckCircle,
  FileText,
  User,
  AlertTriangle,
  Search,
  Check,
} from 'lucide-react';
import { DispatchItem, ReturnItem, DispatchOrder } from '../../types';

interface DispatchViewProps {
  initialTab?: 'ALL' | 'REP' | 'GIFT' | 'RETURN';
}

export const DispatchView: React.FC<DispatchViewProps> = ({ initialTab = 'ALL' }) => {
  const { dispatches, returns, products, customers, addDispatch, addReturn } = useApp();

  const [filterType, setFilterType] = useState<'ALL' | 'REP' | 'GIFT' | 'RETURN'>(initialTab);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'REP' | 'GIFT' | 'RETURN'>('REP');
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<any | null>(null);

  // Common Form States for Rep Sale & Gift
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [repName, setRepName] = useState('مەندوب شوان (هێڵی بەختیاری)');
  const [customerName, setCustomerName] = useState(customers[0]?.name || 'سوپەرمارکێتی بەختەوەری (بەختیاری)');
  const [customCustomer, setCustomCustomer] = useState('');
  const [phone, setPhone] = useState('0770 234 5678');
  const [paymentType, setPaymentType] = useState<'CREDIT' | 'CASH'>('CREDIT');
  const [notes, setNotes] = useState('');

  // Items for Rep Sale / Gift
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemWeight, setItemWeight] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemsList, setItemsList] = useState<DispatchItem[]>([]);

  // ==========================================
  // RETURN 3 DAYS WORKFLOW (Tied to Sales Receipt)
  // ==========================================
  const [selectedSalesReceiptNo, setSelectedSalesReceiptNo] = useState<string>('');
  const [selectedSalesReceipt, setSelectedSalesReceipt] = useState<DispatchOrder | null>(null);
  const [returnItemWeights, setReturnItemWeights] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState<'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'>('EXPIRED_3_DAYS');
  const [searchReceiptQuery, setSearchReceiptQuery] = useState('');

  // Rep presets
  const REP_PRESETS = [
    'مەندوب شوان (هێڵی بەختیاری)',
    'مەندوب هێمن (هێڵی تووی مەلیك)',
    'مەندوب ئارام (هێڵی سەرچنار و ڕاپەڕین)',
    'مەندوب کامەران (هێڵی عەربەت و شارەزوور)',
  ];

  // Eligible sales receipts for returns (Rep sales)
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
      setCustomerName(found.customerName || found.destinationName);
      setRepName(found.repName || found.destinationName);
      // Initialize return weights to 0 for all items on this receipt
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

  const handleOpenModal = (mode: 'REP' | 'GIFT' | 'RETURN') => {
    setModalMode(mode);
    setManualReceiptNo(
      mode === 'REP'
        ? `D-${Math.floor(800 + Math.random() * 200)}`
        : mode === 'GIFT'
        ? `G-${Math.floor(100 + Math.random() * 90)}`
        : `RET-${Math.floor(300 + Math.random() * 100)}`
    );
    setItemsList([]);
    setItemWeight('');
    setItemPrice('');
    setSelectedSalesReceiptNo('');
    setSelectedSalesReceipt(null);
    setReturnItemWeights({});
    setSearchReceiptQuery('');
    setNotes(
      mode === 'REP'
        ? 'فرۆشی مەندوب بە وەسڵی دەستی'
        : mode === 'GIFT'
        ? 'دیاری و بەخشین (٠ دینار) لەسەر تێچووی کۆگا'
        : 'گەڕاوەی تەلەفی ٣ ڕۆژ لە مارکێتەوە'
    );
    setShowModal(true);
  };

  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod || !itemWeight || Number(itemWeight) <= 0) {
      alert('تکایە بەرهەم و کێش بە دەقیقی دیاری بکە');
      return;
    }

    const price = modalMode === 'GIFT' ? 0 : (itemPrice !== '' ? Number(itemPrice) : prod.pricePerKg);
    const weight = Number(itemWeight);

    const newItem: DispatchItem = {
      productId: prod.id,
      productName: prod.nameKu,
      barcode: `${prod.barcodePrefix}${String(Math.round(weight * 1000)).padStart(5, '0')}`,
      weightKg: weight,
      pricePerKg: price,
      totalAmount: Math.round(weight * price),
    };

    setItemsList([...itemsList, newItem]);
    setItemWeight('');
    setItemPrice('');
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const totalWeight = itemsList.reduce((sum, item) => sum + item.weightKg, 0);
  const totalAmount = itemsList.reduce((sum, item) => sum + item.totalAmount, 0);

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
      alert('تکایە ژمارەی وەسڵ بنووسە');
      return;
    }

    if (modalMode === 'RETURN') {
      if (!selectedSalesReceipt) {
        alert('تکایە وەسڵی فرۆشتن دیاری بکە کە گەڕاوەکەی لێ دەکرێتەوە');
        return;
      }

      if (totalReturnKg <= 0) {
        alert('تکایە کێشی گەڕاوە بۆ بەلایەنی کەم یەک بەرهەمی ناو وەسڵەکە بنووسە (کە زیاتر نەبێت لە کێشی فرۆشراو)');
        return;
      }

      // Check validation: no item can exceed sold weight
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

      // 2. Also register in dispatches for unified view tracking
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

    } else {
      // Rep Sale or Gift
      const finalCustomer = customCustomer.trim() || customerName;

      if (itemsList.length === 0) {
        alert('تکایە بەرهەم و کێش داخل بکە');
        return;
      }

      addDispatch({
        manualReceiptNo,
        date,
        time,
        destinationType: modalMode,
        destinationName: finalCustomer,
        repName,
        customerName: finalCustomer,
        paymentType,
        driverOrRepPhone: phone,
        items: itemsList,
        totalWeightKg: totalWeight,
        totalAmount: modalMode === 'GIFT' ? 0 : totalAmount,
        status: 'COMPLETED',
        notes,
      });
    }

    setShowModal(false);
  };

  // KPIs
  const repSalesList = dispatches.filter(d => d.destinationType === 'REP');
  const totalRepSalesKg = repSalesList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const totalRepSalesIQD = repSalesList.reduce((sum, d) => sum + d.totalAmount, 0);

  const giftsList = dispatches.filter(d => d.destinationType === 'GIFT');
  const totalGiftsKg = giftsList.reduce((sum, d) => sum + d.totalWeightKg, 0);

  const totalReturnsKg = returns.reduce((sum, r) => sum + r.totalWeightKg, 0);
  const totalReturnsLoss = returns.reduce((sum, r) => sum + r.totalLossAmount, 0);
  const totalReturnsDeductedFromCustomers = returns.reduce((sum, r) => sum + (r.totalCustomerDeduction || r.totalLossAmount), 0);

  const creditSalesIQD = repSalesList
    .filter(d => d.paymentType === 'CREDIT' || !d.paymentType)
    .reduce((sum, d) => sum + d.totalAmount, 0);

  // Filtered list
  const filteredDispatches = dispatches.filter(d => {
    if (filterType === 'ALL') return true;
    return d.destinationType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-[#0071E3]" />
            فرۆشی مەندوب، دیاری و گەڕاوەی مارکێتەکان
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            تۆمارکردنی فرۆشراوی مەندوبەکان بە وەسڵی دەستی، دیاری (٠ د.ع)، و گەڕاوەی ٣ ڕۆژ بەستراوە بە وەسڵی فرۆشتن
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenModal('REP')}
            className="px-4 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Truck className="w-4 h-4" />
            + فرۆشی مەندوب بۆ مارکێت
          </button>

          <button
            onClick={() => handleOpenModal('GIFT')}
            className="px-4 py-2.5 bg-[#AF52DE] hover:bg-[#9E45CC] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#AF52DE]/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Gift className="w-4 h-4" />
            + دیاری و بەلاش (٠ د.ع)
          </button>

          <button
            onClick={() => handleOpenModal('RETURN')}
            className="px-4 py-2.5 bg-[#FF3B30] hover:bg-[#E02D23] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#FF3B30]/20 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            + گەڕاوەی ٣ ڕۆژ (لەسەر وەسڵ)
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rep Sales */}
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>کۆی فرۆشی مەندوبەکان</span>
            <div className="w-8 h-8 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1D1D1F]">
            {totalRepSalesIQD.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0071E3] font-semibold flex items-center gap-1">
            <span>{totalRepSalesKg.toLocaleString()} کگم فرۆشراو بە مارکێتەکان</span>
          </div>
        </div>

        {/* Card 2: Gifts */}
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>دیاری و بەخشین (هەدیە)</span>
            <div className="w-8 h-8 rounded-2xl bg-[#AF52DE]/10 text-[#AF52DE] flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#AF52DE]">
            {totalGiftsKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            بە ٠ دینار بەڵام لە کێشی کۆگا دەرچووە
          </div>
        </div>

        {/* Card 3: Returns Spoilage */}
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>تەلەفی ٣ ڕۆژ (کارگە)</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF3B30]">
            {totalReturnsKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="mt-2 text-[11px] text-[#FF3B30] font-semibold">
            {totalReturnsLoss.toLocaleString()} د.ع زیانی تەلەف
          </div>
        </div>

        {/* Card 4: Returns Deducted From Customers */}
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>داشکاو لە حسابی کڕیاران</span>
            <div className="w-8 h-8 rounded-2xl bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#248A3D]">
            -{totalReturnsDeductedFromCustomers.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#248A3D] font-medium">
            لە حسابی مارکێتەکان دەرهێنراوە
          </div>
        </div>
      </div>

      {/* Segmented Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="p-1 bg-[#EAEAEA] rounded-full inline-flex gap-1 w-fit">
          {[
            { id: 'ALL', label: 'هەموو تۆمارەکان', count: dispatches.length, icon: FileText },
            { id: 'REP', label: 'فرۆشی مەندوبەکان', count: dispatches.filter(d => d.destinationType === 'REP').length, icon: Truck },
            { id: 'GIFT', label: 'دیاری و بەلاش (٠ د.ع)', count: dispatches.filter(d => d.destinationType === 'GIFT').length, icon: Gift },
            { id: 'RETURN', label: 'گەڕاوەی ٣ ڕۆژ', count: dispatches.filter(d => d.destinationType === 'RETURN').length, icon: RotateCcw },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-white text-[#1D1D1F] shadow-sm font-bold'
                    : 'text-[#515154] hover:text-[#1D1D1F]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#F5F5F7]' : 'bg-black/5'}`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-[#86868B]">
          نیشاندانی <span className="font-bold text-[#1D1D1F]">{filteredDispatches.length}</span> تۆمار بەپێی بەروار
        </div>
      </div>

      {/* Unified Table of Rep Sales, Gifts & Returns */}
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">ژ. وەسڵ</th>
                <th className="p-4">بەروار و کات</th>
                <th className="p-4">جۆری جووڵە</th>
                <th className="p-4">ناوی مەندوب</th>
                <th className="p-4">مارکێت / لایەنی وەرگر</th>
                <th className="p-4">بەرهەم و کێش</th>
                <th className="p-4">کۆی کێش (کگم)</th>
                <th className="p-4">کۆی بڕ (د.ع)</th>
                <th className="p-4">شێوازی دارایی</th>
                <th className="p-4 text-center">وەسڵ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {filteredDispatches.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#86868B]">
                    هیچ تۆمارێک لەم بەشەدا نییە
                  </td>
                </tr>
              ) : (
                filteredDispatches.map((d) => {
                  const isRep = d.destinationType === 'REP';
                  const isGift = d.destinationType === 'GIFT';
                  const isReturn = d.destinationType === 'RETURN';

                  return (
                    <tr key={d.id} className="hover:bg-[#FBFBFD] transition-colors">
                      {/* Receipt No */}
                      <td className="p-4 font-bold text-[#0071E3]">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono ${
                          isReturn ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#0071E3]/10 text-[#0071E3]'
                        }`}>
                          {d.manualReceiptNo}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="p-4">
                        <div className="font-semibold text-[#1D1D1F]">{d.date}</div>
                        <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#86868B]" />
                          <span>{d.time || '09:00 ص'}</span>
                        </div>
                      </td>

                      {/* Movement Type */}
                      <td className="p-4">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1 ${
                            isRep
                              ? 'bg-[#0071E3]/10 text-[#0071E3]'
                              : isGift
                              ? 'bg-[#AF52DE]/10 text-[#AF52DE]'
                              : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                          }`}
                        >
                          {isRep && <Truck className="w-3 h-3" />}
                          {isGift && <Gift className="w-3 h-3" />}
                          {isReturn && <RotateCcw className="w-3 h-3" />}
                          {isRep ? 'فرۆشی مەندوب' : isGift ? 'دیاری (٠ د.ع)' : 'گەڕاوەی ٣ ڕۆژ'}
                        </span>
                      </td>

                      {/* Rep Name */}
                      <td className="p-4 font-semibold text-[#1D1D1F]">
                        {d.repName || d.destinationName}
                      </td>

                      {/* Customer / Recipient Name */}
                      <td className="p-4 font-bold text-[#1D1D1F]">
                        {d.customerName || d.destinationName}
                      </td>

                      {/* Line Items */}
                      <td className="p-4 text-[#86868B]">
                        <div className="font-medium text-[#1D1D1F]">{d.items.length} جۆر بەرهەم</div>
                        <div className="text-[10px] text-[#86868B] truncate max-w-[150px]">
                          {d.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="p-4 font-black text-[#1D1D1F] text-sm">
                        {d.totalWeightKg.toLocaleString()} کگم
                      </td>

                      {/* Amount */}
                      <td className="p-4 font-black">
                        {isGift ? (
                          <span className="text-[#AF52DE]">٠ د.ع (دیاری)</span>
                        ) : isReturn ? (
                          <span className="text-[#FF3B30]">
                            -{d.totalAmount.toLocaleString()} د.ع (تەلەف)
                          </span>
                        ) : (
                          <span className="text-[#34C759]">
                            {d.totalAmount.toLocaleString()} د.ع
                          </span>
                        )}
                      </td>

                      {/* Financial Method */}
                      <td className="p-4">
                        {isGift ? (
                          <span className="text-[10px] bg-[#AF52DE]/10 text-[#AF52DE] px-2 py-0.5 rounded-full font-bold">
                            بەلاش
                          </span>
                        ) : isReturn ? (
                          <span className="text-[10px] bg-[#34C759]/10 text-[#248A3D] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                            <Check className="w-3 h-3" />
                            داشکاو لە کڕیار
                          </span>
                        ) : d.paymentType === 'CASH' ? (
                          <span className="text-[10px] bg-[#34C759]/10 text-[#248A3D] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                            <Banknote className="w-3 h-3" />
                            کاش
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 w-fit">
                            <CreditCard className="w-3 h-3" />
                            قەرز
                          </span>
                        )}
                      </td>

                      {/* Print Ticket Button */}
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedReceiptForPrint(d)}
                          className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#0071E3] transition-colors"
                          title="بینینی وەسڵ و پرینت"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal (فرۆشی مەندوب / دیاری / گەڕاوەی ٣ ڕۆژ بە ژمارەی وەسڵی فرۆشتن) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white ${
                    modalMode === 'REP'
                      ? 'bg-[#0071E3]'
                      : modalMode === 'GIFT'
                      ? 'bg-[#AF52DE]'
                      : 'bg-[#FF3B30]'
                  }`}
                >
                  {modalMode === 'REP' && <Truck className="w-5 h-5" />}
                  {modalMode === 'GIFT' && <Gift className="w-5 h-5" />}
                  {modalMode === 'RETURN' && <RotateCcw className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    {modalMode === 'REP'
                      ? 'تۆمارکردنی فرۆشی مەندوب بۆ مارکێت'
                      : modalMode === 'GIFT'
                      ? 'تۆمارکردنی دیاری و بەخشین (٠ د.ع)'
                      : 'تۆمارکردنی گەڕاوەی ٣ ڕۆژ بەپێی وەسڵی فرۆشتن'}
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    {modalMode === 'RETURN'
                      ? 'دیاریکردنی وەسڵی فرۆشتن و دەرهێنانی گەڕاوە لە حسابی کڕیار و بردن بۆ تەلەفی کارگە'
                      : 'تۆمارکردن بە وەسڵی دەستی و بەروار، کێش و بەرهەمەکان'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="px-6 pt-4 pb-2 bg-[#FBFBFD] border-b border-black/[0.05]">
              <div className="p-1 bg-[#EAEAEA] rounded-2xl flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('REP');
                    setNotes('فرۆشی مەندوب بە وەسڵی دەستی');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    modalMode === 'REP'
                      ? 'bg-white text-[#0071E3] shadow-sm'
                      : 'text-[#515154] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  فرۆشی مەندوب بۆ مارکێت
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalMode('GIFT');
                    setNotes('دیاری و بەخشین بە ٠ دینار');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    modalMode === 'GIFT'
                      ? 'bg-white text-[#AF52DE] shadow-sm'
                      : 'text-[#515154] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  دیاری و بەلاش (٠ د.ع)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setModalMode('RETURN');
                    setNotes('گەڕاوەی تەلەفی ٣ ڕۆژ لە مارکێت');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    modalMode === 'RETURN'
                      ? 'bg-white text-[#FF3B30] shadow-sm'
                      : 'text-[#515154] hover:text-[#1D1D1F]'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  گەڕاوەی ٣ ڕۆژ (لەسەر وەسڵ)
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
              {/* ======================================================== */}
              {/* MODE: RETURN 3 DAYS TIED TO SALES RECEIPT */}
              {/* ======================================================== */}
              {modalMode === 'RETURN' ? (
                <div className="space-y-4">
                  {/* Step 1: Select Sales Receipt */}
                  <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-[#1D1D1F] text-xs flex items-center gap-1.5">
                          <Search className="w-4 h-4 text-[#0071E3]" />
                          هەڵبژاردنی وەسڵی فرۆشتن (کە گەڕاوەکەی لێ دەکرێتەوە) *
                        </span>
                        <p className="text-[11px] text-[#86868B]">
                          تەنها ئەو بەرهەمانە پیشان دەدرێن کە لە ناو وەسڵەکەدا هەبوون و بە کەمتر یان یەکسان لەو کێشانە
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

                    {/* Receipt Dropdown / Selector */}
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
                                <div className="font-black text-[#1D1D1F]">
                                  {rcpt.totalWeightKg} کگم
                                </div>
                                <div className="text-[10px] text-[#34C759] font-semibold">
                                  {rcpt.totalAmount.toLocaleString()} د.ع
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Receipt Meta & Details if Selected */}
                  {selectedSalesReceipt && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {/* Meta Details Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[#515154] font-semibold mb-1">
                            ژمارەی وەسڵی گەڕاوە (تەلەف) *
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

                      {/* Items sold on this receipt with return input */}
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
                                    <td className="p-3 font-bold text-[#1D1D1F]">
                                      {row.productName}
                                    </td>
                                    <td className="p-3 font-semibold text-[#86868B]">
                                      {row.soldWeightKg} کگم
                                    </td>
                                    <td className="p-3 text-[#515154]">
                                      {row.salePricePerKg.toLocaleString()} د.ع
                                    </td>
                                    <td className="p-3">
                                      <div className="relative">
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
                                      </div>
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

                      {/* Financial Impact Banner */}
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
                    </div>
                  )}
                </div>
              ) : (
                /* ======================================================== */
                /* MODE: REP SALE OR GIFT */
                /* ======================================================== */
                <div className="space-y-4">
                  {/* Row 1: Receipt #, Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">
                        ژمارەی وەسڵی دەستی *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="نموونە: D-905"
                        value={manualReceiptNo}
                        onChange={(e) => setManualReceiptNo(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] font-bold outline-none focus:border-[#0071E3] focus:bg-white transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-all font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">کاتژمێر</label>
                      <input
                        type="text"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        placeholder="نموونە: 10:15 ص"
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white transition-all font-medium"
                      />
                    </div>
                  </div>

                  {/* Row 2: Rep and Customer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#0071E3]" />
                        ناوی مەندوب (فرۆشیار) *
                      </label>
                      <select
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white font-semibold"
                      >
                        {REP_PRESETS.map((rep, idx) => (
                          <option key={idx} value={rep}>{rep}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[#34C759]" />
                        {modalMode === 'GIFT' ? 'ناوی وەرگری دیاری *' : 'ناوی مارکێت / کڕیار *'}
                      </label>
                      <div className="space-y-1.5">
                        <select
                          value={customerName}
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setCustomCustomer('');
                          }}
                          className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white font-semibold"
                        >
                          {customers.map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name} ({c.currentDebt.toLocaleString()} د.ع قەرز)
                            </option>
                          ))}
                          <option value="CUSTOM">+ مارکێتی تر (دەستی بنووسە)...</option>
                        </select>

                        {customerName === 'CUSTOM' && (
                          <input
                            type="text"
                            placeholder="ناوی مارکێتی نوێ بنووسە..."
                            value={customCustomer}
                            onChange={(e) => setCustomCustomer(e.target.value)}
                            className="w-full bg-white border-2 border-[#0071E3] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-bold outline-none"
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Type (Only for Rep Sale) */}
                  {modalMode === 'REP' && (
                    <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-[#1D1D1F] block">شێوازی پارەدان و تۆماری دارایی:</span>
                        <span className="text-[11px] text-[#86868B]">
                          ئەگەر بە قەرز بێت، بڕی فرۆشراوەکە یەکسەر دەچێتە سەر کەشف حسابی ئەم مارکێتە
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentType('CREDIT')}
                          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                            paymentType === 'CREDIT'
                              ? 'bg-[#FF9500] text-white shadow-sm'
                              : 'bg-white text-[#515154] border border-black/[0.06]'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          فرۆش بە قەرز
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentType('CASH')}
                          className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                            paymentType === 'CASH'
                              ? 'bg-[#34C759] text-white shadow-sm'
                              : 'bg-white text-[#515154] border border-black/[0.06]'
                          }`}
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          کاش (نەقد)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Line Items Section */}
                  <div className="border border-black/[0.06] rounded-2xl p-4 bg-[#FBFBFD] space-y-3">
                    <div className="font-bold text-[#1D1D1F] flex items-center justify-between">
                      <span>
                        {modalMode === 'GIFT'
                          ? 'بەرهەمی دیاری (کێش بە ٠ د.ع)'
                          : 'بەرهەمە فرۆشراوەکان بە مارکێت'}
                      </span>
                      <span className="text-[11px] font-normal text-[#86868B]">
                        هەر بەرهەمێک لەگەڵ کێشەکەی زیاد بکە
                      </span>
                    </div>

                    {/* Add Item Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-2">
                        <select
                          value={selectedProductId}
                          onChange={(e) => {
                            setSelectedProductId(e.target.value);
                            const prod = products.find(p => p.id === e.target.value);
                            if (prod && modalMode !== 'GIFT') {
                              setItemPrice(prod.pricePerKg);
                            }
                          }}
                          className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none font-semibold"
                        >
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nameKu} ({p.inStockKg.toLocaleString()} کگم کۆگا)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          step="0.1"
                          placeholder="کێش (کگم) *"
                          value={itemWeight}
                          onChange={(e) => setItemWeight(e.target.value ? Number(e.target.value) : '')}
                          className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                        />
                      </div>

                      {modalMode !== 'GIFT' ? (
                        <div>
                          <input
                            type="number"
                            placeholder="نرخی کیلۆ (د.ع)"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(e.target.value ? Number(e.target.value) : '')}
                            className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center font-bold text-[#AF52DE] bg-white rounded-xl border border-black/[0.06] px-3">
                          ٠ د.ع (دیاری)
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      زیادکردنی ئەم بەرهەمە بۆ ناو وەسڵ
                    </button>

                    {/* Items List Table */}
                    {itemsList.length > 0 && (
                      <div className="mt-3 bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-[#F5F5F7] text-[#515154] font-semibold">
                            <tr>
                              <th className="p-2.5">بەرهەم</th>
                              <th className="p-2.5">کێش (کگم)</th>
                              <th className="p-2.5">نرخی کیلۆ</th>
                              <th className="p-2.5">کۆی بەرهەم</th>
                              <th className="p-2.5 text-center">سڕینەوە</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {itemsList.map((item, idx) => (
                              <tr key={idx}>
                                <td className="p-2.5 font-bold text-[#1D1D1F]">{item.productName}</td>
                                <td className="p-2.5 font-black text-[#0071E3]">{item.weightKg} کگم</td>
                                <td className="p-2.5 text-[#515154]">
                                  {modalMode === 'GIFT' ? '٠ د.ع' : `${item.pricePerKg.toLocaleString()} د.ع`}
                                </td>
                                <td className="p-2.5 font-black text-[#34C759]">
                                  {modalMode === 'GIFT' ? '٠ د.ع' : `${item.totalAmount.toLocaleString()} د.ع`}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveItem(idx)}
                                    className="text-[#FF3B30] hover:text-[#E02D23] p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Bottom Summary Bar */}
                  <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex items-center justify-between">
                    <div>
                      <span className="text-[#86868B] text-xs">کۆی گشتی کێش: </span>
                      <span className="text-base font-black text-[#1D1D1F]">{totalWeight.toLocaleString()} کگم</span>
                    </div>
                    <div>
                      <span className="text-[#86868B] text-xs">کۆی گشتی بەها: </span>
                      <span className="text-lg font-black text-[#34C759]">
                        {modalMode === 'GIFT'
                          ? '٠ د.ع (دیاری بەلاش)'
                          : `${totalAmount.toLocaleString()} د.ع`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تێبینی دەربارەی وەسڵ یان کڕیار..."
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7] transition-colors"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2.5 rounded-full text-xs font-bold text-white shadow-md flex items-center gap-1.5 transition-all transform hover:scale-[1.02] active:scale-[0.98] ${
                    modalMode === 'REP'
                      ? 'bg-[#0071E3] shadow-[#0071E3]/25'
                      : modalMode === 'GIFT'
                      ? 'bg-[#AF52DE] shadow-[#AF52DE]/25'
                      : 'bg-[#FF3B30] shadow-[#FF3B30]/25'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  {modalMode === 'REP'
                    ? 'پەسەندکردنی فرۆشی مەندوب'
                    : modalMode === 'GIFT'
                    ? 'پەسەندکردنی دیاری'
                    : 'پەسەندکردنی گەڕاوەی ٣ ڕۆژ'}
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
                <h3 className="font-bold text-base text-[#1D1D1F]">
                  {selectedReceiptForPrint.destinationType === 'RETURN'
                    ? 'وەسڵی گەڕاوەی ٣ ڕۆژ (تەلەف)'
                    : 'وەسڵی دەرکردن و فرۆشی دەستی'}
                </h3>
                <p className="text-[11px] text-[#86868B]">کارگەی مریشکی فرێش - بەشی مەندوبەکان</p>
              </div>
              <button
                onClick={() => setSelectedReceiptForPrint(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Receipt Preview Card */}
            <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>ژمارەی وەسڵ:</span>
                <span className="font-bold text-[#0071E3]">{selectedReceiptForPrint.manualReceiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>بەروار و کات:</span>
                <span>{selectedReceiptForPrint.date} - {selectedReceiptForPrint.time || '09:00 ص'}</span>
              </div>
              <div className="flex justify-between">
                <span>ناوی مەندوب:</span>
                <span className="font-bold">{selectedReceiptForPrint.repName || selectedReceiptForPrint.destinationName}</span>
              </div>
              <div className="flex justify-between">
                <span>مارکێتی کڕیار:</span>
                <span className="font-bold">{selectedReceiptForPrint.customerName || selectedReceiptForPrint.destinationName}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>دۆخی دارایی:</span>
                <span className="font-bold">
                  {selectedReceiptForPrint.destinationType === 'GIFT'
                    ? 'دیاری (٠ د.ع)'
                    : selectedReceiptForPrint.destinationType === 'RETURN'
                    ? 'داشکاو لە حسابی کڕیار ✓'
                    : selectedReceiptForPrint.paymentType === 'CASH'
                    ? 'کاش (نەقد)'
                    : 'قەرز (لەسەر حسابی مارکێت)'}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-1.5 py-2">
                <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                  <span>بەرهەم</span>
                  <span>کێش / نرخ / کۆ</span>
                </div>
                {selectedReceiptForPrint.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.productName}</span>
                    <span>
                      {item.weightKg} کگم × {(item.pricePerKg || 0).toLocaleString()} = {(item.totalAmount || 0).toLocaleString()} د.ع
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                <span>کۆی گشتی کێش:</span>
                <span>{selectedReceiptForPrint.totalWeightKg} کگم</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#0071E3]">
                <span>کۆی بەها:</span>
                <span>
                  {selectedReceiptForPrint.destinationType === 'GIFT'
                    ? '٠ د.ع (دیاری)'
                    : `${selectedReceiptForPrint.totalAmount.toLocaleString()} د.ع`}
                </span>
              </div>
            </div>

            {/* Print Button */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
