import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Send,
  Plus,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Clock,
  Printer,
  Trash2,
  CheckCircle,
  User,
  RotateCcw,
  Search,
  Scale,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { DispatchItem, DispatchOrder, ReturnItem, ReturnOrder } from '../../types';
import { FactoryLogo } from '../layout/FactoryLogo';

type SubTabType = 'sales' | 'returns';

const REASON_LABELS: Record<'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED', string> = {
  EXPIRED_3_DAYS: 'تەلەفی ٣ ڕۆژ لە مارکێت (سەرفنەکراو)',
  DAMAGED: 'تێکچوو لە کاتی گواستنەوە',
  SPOILED: 'زیانلێکەوتوو',
};

export const RepSalesView: React.FC = () => {
  const { dispatches, returns, products, customers, custodyTransfers, factorySettings, repNames, addDispatch, addReturn, softDeleteRecord, hasAccess } =
    useApp();

  const [subTab, setSubTab] = useState<SubTabType>('sales');
  const [searchQuery, setSearchQuery] = useState('');

  // Sale Modal States
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [repName, setRepName] = useState(repNames[0] || '');
  const [customerName, setCustomerName] = useState(
    customers[0]?.name || 'سوپەرمارکێتی بەختەوەری (بەختیاری)'
  );
  const [customCustomer, setCustomCustomer] = useState('');
  const [phone, setPhone] = useState('0770 234 5678');
  const [paymentType, setPaymentType] = useState<'CREDIT' | 'CASH' | 'ELECTRONIC'>('CREDIT');
  const [notes, setNotes] = useState('فرۆشی مەندوب بە وەسڵی دەستی');

  // Sale Line Items
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemWeight, setItemWeight] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemsList, setItemsList] = useState<DispatchItem[]>([]);

  // Optional Inline Return inside New Sale Modal (same receipt #)
  const [includeReturnInSale, setIncludeReturnInSale] = useState(false);
  const [inlineReturnProductId, setInlineReturnProductId] = useState(products[0]?.id || '');
  const [inlineReturnWeight, setInlineReturnWeight] = useState<number | ''>('');
  const [inlineReturnReason, setInlineReturnReason] = useState<
    'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'
  >('EXPIRED_3_DAYS');
  const [inlineReturnItems, setInlineReturnItems] = useState<ReturnItem[]>([]);

  // Standalone Return Modal States (uses SAME sales receipt #)
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnTime, setReturnTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [returnReason, setReturnReason] = useState<'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'>(
    'EXPIRED_3_DAYS'
  );
  const [returnNotes, setReturnNotes] = useState('گەڕاوەی تەلەفی ٣ ڕۆژ لە مارکێتەوە');
  const [selectedSalesReceipt, setSelectedSalesReceipt] = useState<DispatchOrder | null>(null);
  const [returnItemWeights, setReturnItemWeights] = useState<Record<string, number>>({});
  const [searchReceiptQuery, setSearchReceiptQuery] = useState('');

  // Print Modals
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<DispatchOrder | null>(null);
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<ReturnOrder | null>(null);

  // Derived data
  const repSalesList = useMemo(
    () => dispatches.filter(d => d.destinationType === 'REP'),
    [dispatches]
  );

  const selectedRepCustody = useMemo(() => {
    const items = products
      .map(p => {
        const loadedKg = custodyTransfers
          .filter(t => t.holderType === 'REP' && t.holderName === repName && t.direction === 'LOAD')
          .reduce(
            (s, t) => s + t.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
            0
          );
        const soldKg = dispatches
          .filter(
            d =>
              (d.destinationType === 'REP' ||
                (d.destinationType === 'GIFT' && d.sourceCustody === 'REP')) &&
              (d.repName || '') === repName
          )
          .reduce(
            (s, d) => s + d.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
            0
          );
        const returnedKg = custodyTransfers
          .filter(
            t =>
              t.holderType === 'REP' &&
              t.holderName === repName &&
              t.direction === 'RETURN_TO_READY'
          )
          .reduce(
            (s, t) => s + t.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
            0
          );
        const remainingKg = Math.max(0, Number((loadedKg - soldKg - returnedKg).toFixed(2)));
        return {
          productId: p.id,
          productName: p.nameKu,
          loadedKg,
          soldKg,
          returnedKg,
          remainingKg,
        };
      })
      .filter(i => i.loadedKg > 0 || i.remainingKg > 0);

    const totalRemainingKg = Number(
      items.reduce((s, i) => s + i.remainingKg, 0).toFixed(2)
    );
    return { items, totalRemainingKg };
  }, [custodyTransfers, dispatches, products, repName]);

  const getLinkedReturns = (sale: DispatchOrder) =>
    returns.filter(
      r =>
        r.dispatchId === sale.id ||
        r.salesReceiptNo === sale.manualReceiptNo ||
        r.manualReceiptNo === sale.manualReceiptNo
    );

  // KPIs
  const repReturnsList = useMemo(
    () => returns.filter(r => r.sourceType === 'REP'),
    [returns]
  );

  const totalRepSalesKg = repSalesList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const totalRepSalesIQD = repSalesList.reduce((sum, d) => sum + d.totalAmount, 0);
  const creditSalesIQD = repSalesList
    .filter(d => d.paymentType === 'CREDIT' || !d.paymentType)
    .reduce((sum, d) => sum + d.totalAmount, 0);
  const cashSalesIQD = repSalesList
    .filter(d => d.paymentType === 'CASH')
    .reduce((sum, d) => sum + d.totalAmount, 0);
  const electronicSalesIQD = repSalesList
    .filter(d => d.paymentType === 'ELECTRONIC')
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const totalAllReturnsKg = repReturnsList.reduce((sum, r) => sum + r.totalWeightKg, 0);
  const totalAllFactoryLoss = repReturnsList.reduce((sum, r) => sum + r.totalLossAmount, 0);
  const totalAllDeductedFromCustomers = repReturnsList.reduce(
    (sum, r) => sum + (r.totalCustomerDeduction ?? r.totalLossAmount),
    0
  );

  // Filtered Lists for Table
  const filteredRepSales = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return repSalesList;
    return repSalesList.filter(
      d =>
        d.manualReceiptNo.toLowerCase().includes(q) ||
        (d.customerName && d.customerName.toLowerCase().includes(q)) ||
        (d.destinationName && d.destinationName.toLowerCase().includes(q)) ||
        (d.repName && d.repName.toLowerCase().includes(q))
    );
  }, [repSalesList, searchQuery]);

  const filteredReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return repReturnsList;
    return repReturnsList.filter(
      r =>
        r.manualReceiptNo.toLowerCase().includes(q) ||
        (r.salesReceiptNo && r.salesReceiptNo.toLowerCase().includes(q)) ||
        (r.customerName && r.customerName.toLowerCase().includes(q)) ||
        (r.sourceName && r.sourceName.toLowerCase().includes(q)) ||
        (r.repName && r.repName.toLowerCase().includes(q))
    );
  }, [repReturnsList, searchQuery]);

  const filteredReceiptOptions = useMemo(() => {
    const q = searchReceiptQuery.trim().toLowerCase();
    if (!q) return repSalesList;
    return repSalesList.filter(
      d =>
        d.manualReceiptNo.toLowerCase().includes(q) ||
        (d.customerName && d.customerName.toLowerCase().includes(q)) ||
        (d.destinationName && d.destinationName.toLowerCase().includes(q)) ||
        (d.repName && d.repName.toLowerCase().includes(q))
    );
  }, [repSalesList, searchReceiptQuery]);

  // --- Sale Modal Handlers ---
  const handleOpenSaleModal = () => {
    setManualReceiptNo(`D-${Math.floor(800 + Math.random() * 200)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setItemsList([]);
    setItemWeight('');
    setItemPrice('');
    setNotes('فرۆشی مەندوب بە وەسڵی دەستی');
    setIncludeReturnInSale(false);
    setInlineReturnItems([]);
    setInlineReturnWeight('');
    setShowSaleModal(true);
  };

  const handleAddSaleItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod || !itemWeight || Number(itemWeight) <= 0) {
      alert('تکایە بەرهەم و کێش دیاری بکە');
      return;
    }

    const price = itemPrice !== '' ? Number(itemPrice) : prod.pricePerKg;
    const weight = Number(itemWeight);

    setItemsList(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.nameKu,
        barcode: `${prod.barcodePrefix}${String(Math.round(weight * 1000)).padStart(5, '0')}`,
        weightKg: weight,
        pricePerKg: price,
        totalAmount: Math.round(weight * price),
      },
    ]);
    setItemWeight('');
    setItemPrice('');
  };

  const handleAddInlineReturnItem = () => {
    const prod = products.find(p => p.id === inlineReturnProductId);
    const weight = Number(inlineReturnWeight);
    if (!prod || !weight || weight <= 0) {
      alert('تکایە بەرهەم و کێشی گەڕاوە بنووسە');
      return;
    }

    const saleItemMatch = itemsList.find(i => i.productId === prod.id);
    const salePrice = saleItemMatch ? saleItemMatch.pricePerKg : prod.pricePerKg;

    setInlineReturnItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.nameKu,
        barcode: `RET-${prod.id}`,
        weightKg: weight,
        soldWeightKg: saleItemMatch?.weightKg || weight,
        salePricePerKg: salePrice,
        unitCost: prod.costPerKg,
        totalLoss: Math.round(weight * prod.costPerKg),
        customerDeductionAmount: Math.round(weight * salePrice),
        reason: inlineReturnReason,
      },
    ]);
    setInlineReturnWeight('');
  };

  const saleTotalWeight = itemsList.reduce((sum, item) => sum + item.weightKg, 0);
  const saleTotalAmount = itemsList.reduce((sum, item) => sum + item.totalAmount, 0);
  const inlineReturnTotalWeight = inlineReturnItems.reduce((sum, r) => sum + r.weightKg, 0);
  const inlineReturnTotalDeduction = inlineReturnItems.reduce(
    (sum, r) => sum + (r.customerDeductionAmount || r.totalLoss),
    0
  );
  const inlineReturnTotalLoss = inlineReturnItems.reduce((sum, r) => sum + r.totalLoss, 0);

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReceipt = manualReceiptNo.trim();
    if (!cleanReceipt) {
      alert('تکایە ژمارەی وەسڵی دەستی بنووسە');
      return;
    }
    if (itemsList.length === 0) {
      alert('تکایە بەلایەنی کەم یەک بەرهەمی فرۆشراو زیاد بکە');
      return;
    }

    // Warn if Rep is selling more weight than available in their Custody balance
    const custodyShortages: string[] = [];
    const groupedByProd = itemsList.reduce<Record<string, { name: string; weight: number }>>((acc, item) => {
      if (!acc[item.productId]) acc[item.productId] = { name: item.productName, weight: 0 };
      acc[item.productId].weight += item.weightKg;
      return acc;
    }, {});
    Object.entries(groupedByProd).forEach(([prodId, info]) => {
      const custItem = selectedRepCustody.items.find(c => c.productId === prodId);
      const avail = custItem ? custItem.remainingKg : 0;
      if (info.weight > avail + 0.01) {
        custodyShortages.push(`${info.name}: فرۆشتن ${info.weight} کگم / عەهدەی ماوە ${avail} کگم`);
      }
    });
    if (custodyShortages.length > 0) {
      const proceed = window.confirm(
        `ئاگاداربە: عەهدەی ${repName} بۆ ئەم بەرهەمانە کەمترە لە کێشی فرۆشراو:\n\n• ${custodyShortages.join('\n• ')}\n\nپێویستە سەرەتا لە قۆناغی ٤ بار بخەیتە سەر عەهدەکەی. دەتەوێت هەر تۆماری بکەیت؟`
      );
      if (!proceed) return;
    }

    const finalCustomer = customCustomer.trim() || customerName;

    addDispatch({
      manualReceiptNo: cleanReceipt,
      date,
      time,
      destinationType: 'REP',
      destinationName: finalCustomer,
      repName,
      customerName: finalCustomer,
      paymentType,
      driverOrRepPhone: phone,
      items: itemsList,
      totalWeightKg: saleTotalWeight,
      totalAmount: saleTotalAmount,
      status: 'COMPLETED',
      notes,
    });

    // If user also recorded 3-day returns inside the same receipt, bind to SAME receipt #
    if (includeReturnInSale && inlineReturnItems.length > 0) {
      addReturn({
        salesReceiptNo: cleanReceipt,
        manualReceiptNo: cleanReceipt,
        date,
        time,
        sourceType: 'REP',
        sourceName: `${repName} (${finalCustomer})`,
        customerName: finalCustomer,
        repName,
        items: inlineReturnItems,
        totalWeightKg: inlineReturnTotalWeight,
        totalLossAmount: inlineReturnTotalLoss,
        totalCustomerDeduction: inlineReturnTotalDeduction,
        disposalMethod: 'DESTROYED',
        notes: `گەڕاوەی ٣ ڕۆژ لەسەر هەمان وەسڵی فرۆشتن [${cleanReceipt}]`,
      });
    }

    setShowSaleModal(false);
  };

  // --- Return Modal Handlers (always binds to SAME sales receipt #) ---
  const initWeightsForReceipt = (receipt: DispatchOrder) => {
    const initial: Record<string, number> = {};
    receipt.items.forEach(item => {
      initial[item.productId] = 0;
    });
    setReturnItemWeights(initial);
  };

  const handleOpenReturnModal = (preselectedReceipt?: DispatchOrder) => {
    setReturnDate(new Date().toISOString().split('T')[0]);
    setReturnTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setReturnNotes('گەڕاوەی تەلەفی ٣ ڕۆژ لە مارکێتەوە');
    setSearchReceiptQuery('');

    if (preselectedReceipt) {
      setSelectedSalesReceipt(preselectedReceipt);
      initWeightsForReceipt(preselectedReceipt);
    } else {
      setSelectedSalesReceipt(null);
      setReturnItemWeights({});
    }

    setShowReturnModal(true);
  };

  const handleSelectSalesReceipt = (receipt: DispatchOrder) => {
    setSelectedSalesReceipt(receipt);
    initWeightsForReceipt(receipt);
  };

  const returnRows = useMemo(() => {
    if (!selectedSalesReceipt) return [];
    const existingReturns = getLinkedReturns(selectedSalesReceipt);

    return selectedSalesReceipt.items.map(item => {
      const previouslyReturnedKg = existingReturns.reduce((sum, r) => {
        const matched = r.items.find(ri => ri.productId === item.productId);
        return sum + (matched ? matched.weightKg : 0);
      }, 0);
      const remainingReturnableKg = Math.max(0, Number((item.weightKg - previouslyReturnedKg).toFixed(2)));
      const retWeight = returnItemWeights[item.productId] || 0;
      const prod = products.find(p => p.id === item.productId);
      const costPerKg = prod ? prod.costPerKg : 2600;
      const salePricePerKg = item.pricePerKg;

      return {
        productId: item.productId,
        productName: item.productName,
        soldWeightKg: item.weightKg,
        previouslyReturnedKg,
        remainingReturnableKg,
        salePricePerKg,
        returnWeightKg: retWeight,
        costPerKg,
        customerDeduction: Math.round(retWeight * salePricePerKg),
        factoryLoss: Math.round(retWeight * costPerKg),
      };
    });
  }, [selectedSalesReceipt, returnItemWeights, products, returns]);

  const totalReturnKg = returnRows.reduce((sum, r) => sum + r.returnWeightKg, 0);
  const totalCustomerDeduction = returnRows.reduce((sum, r) => sum + r.customerDeduction, 0);
  const totalFactoryLoss = returnRows.reduce((sum, r) => sum + r.factoryLoss, 0);

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSalesReceipt) {
      alert('تکایە وەسڵی فرۆشتن دیاری بکە');
      return;
    }
    if (totalReturnKg <= 0) {
      alert('تکایە کێشی گەڕاوە بۆ بەلایەنی کەم یەک بەرهەم بنووسە');
      return;
    }
    for (const row of returnRows) {
      if (row.returnWeightKg > row.remainingReturnableKg) {
        alert(
          `کێشی گەڕاوەی ${row.productName} (${row.returnWeightKg} کگم) ناتوانێت لە کێشی ماوەی سەر وەسڵ (${row.remainingReturnableKg} کگم) زیاتر بێت!`
        );
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
    const sameReceiptNo = selectedSalesReceipt.manualReceiptNo;

    addReturn({
      dispatchId: selectedSalesReceipt.id,
      salesReceiptNo: sameReceiptNo,
      manualReceiptNo: sameReceiptNo, // Exact same receipt number as the sales receipt
      date: returnDate,
      time: returnTime,
      sourceType: 'REP',
      sourceName: `${selectedSalesReceipt.repName || 'مەندوب'} (${finalCustomer})`,
      customerName: finalCustomer,
      repName: selectedSalesReceipt.repName,
      items: returnItems,
      totalWeightKg: totalReturnKg,
      totalLossAmount: totalFactoryLoss,
      totalCustomerDeduction,
      disposalMethod: 'DESTROYED',
      notes: `گەڕاوەی تەلەف بە هەمان وەسڵی فرۆشتن [${sameReceiptNo}] - ${returnNotes}`,
    });

    setShowReturnModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-[#0071E3]" />
            فرۆشتنی مەندوب و گەڕاوە
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            تۆمارکردنی فرۆشی مەندوب بۆ مارکێتەکان و گەڕاوەی ٣ ڕۆژ بە هەمان ژمارەی وەسڵی فرۆشتن
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleOpenSaleModal}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            تۆمارکردنی فرۆشی مەندوب
          </button>

          <button
            type="button"
            onClick={() => handleOpenReturnModal()}
            className="px-5 py-2.5 bg-[#FF3B30] hover:bg-[#E02D23] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#FF3B30]/25 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            تۆمارکردنی گەڕاوە (هەمان وەسڵ)
          </button>
        </div>
      </div>

      {/* Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>کۆی فرۆشی مەندوبەکان</span>
            <div className="w-8 h-8 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1D1D1F] tabular-nums">
            {totalRepSalesIQD.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0071E3] font-semibold tabular-nums">
            {totalRepSalesKg.toLocaleString()} کگم لە {repSalesList.length} وەسڵ
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>قەرز، کاش و ئەلکترۆنی</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF9500] tabular-nums">
            {creditSalesIQD.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">د.ع قەرز</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold tabular-nums flex flex-wrap gap-2">
            <span className="text-[#248A3D]">کاش: {cashSalesIQD.toLocaleString()}</span>
            <span className="text-[#0071E3]">
              ئەلکترۆنی: {electronicSalesIQD.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>گەڕاوە و تەلەفی ٣ ڕۆژ</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF3B30] tabular-nums">
            {totalAllReturnsKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="mt-2 text-[11px] text-[#FF9500] font-semibold tabular-nums">
            زیانی تەلەفی کارگە: {totalAllFactoryLoss.toLocaleString()} د.ع
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>داشکاو لە حسابی مارکێت</span>
            <div className="w-8 h-8 rounded-2xl bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#248A3D] tabular-nums">
            -{totalAllDeductedFromCustomers.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium tabular-nums">
            {returns.length} وەسڵی گەڕاوە بەستراوە بە فرۆشتن
          </div>
        </div>
      </div>

      {/* Unified Segmented Control + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 rounded-2xl bg-black/[0.05] w-fit">
          <button
            type="button"
            onClick={() => setSubTab('sales')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'sales'
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-[#0071E3]" />
            وەسڵەکانی فرۆشتن ({filteredRepSales.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('returns')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'returns'
                ? 'bg-white text-[#1D1D1F] shadow-sm'
                : 'text-[#6E6E73] hover:text-[#1D1D1F]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF3B30]" />
            تۆماری گەڕاوەکان ({filteredReturns.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#86868B] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="گەڕان بە ژ. وەسڵ، مارکێت، مەندوب..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="apple-input w-full pr-10 pl-3.5 py-2 text-xs bg-white"
          />
        </div>
      </div>

      {/* Table 1: Rep Sales with Linked Returns on Same Receipt */}
      {subTab === 'sales' && (
        <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
            <span className="font-bold text-xs text-[#1D1D1F]">
              وەسڵەکانی فرۆشتنی مەندوب و گەڕاوەی سەر هەمان وەسڵ ({filteredRepSales.length})
            </span>
            <span className="text-[11px] text-[#86868B]">
              دەتوانیت ڕاستەوخۆ لە تەنیشت هەر وەسڵێک گەڕاوە تۆمار بکەیت
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. وەسڵی فرۆشتن</th>
                  <th className="p-4">بەروار و کات</th>
                  <th className="p-4">مەندوب و مارکێت</th>
                  <th className="p-4">بەرهەم و کێش</th>
                  <th className="p-4">گەڕاوەی هەمان وەسڵ</th>
                  <th className="p-4">بڕی صافی (د.ع)</th>
                  <th className="p-4">شێواز</th>
                  <th className="p-4 text-center">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {filteredRepSales.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#86868B]">
                      هیچ وەسڵێکی فرۆشی مەندوب تۆمار نەکراوە
                    </td>
                  </tr>
                ) : (
                  filteredRepSales.map(d => {
                    const linked = getLinkedReturns(d);
                    const linkedReturnKg = linked.reduce((s, r) => s + r.totalWeightKg, 0);
                    const linkedDeduction = linked.reduce(
                      (s, r) => s + (r.totalCustomerDeduction ?? r.totalLossAmount),
                      0
                    );
                    const netAmount = Math.max(0, d.totalAmount - linkedDeduction);

                    return (
                      <tr key={d.id} className="hover:bg-[#FBFBFD] transition-colors">
                        <td className="p-4 font-bold text-[#0071E3]">
                          <span className="bg-[#0071E3]/10 px-2.5 py-1 rounded-full text-[11px] font-mono">
                            {d.manualReceiptNo}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold text-[#1D1D1F]">{d.date}</div>
                          <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-[#86868B]" />
                            <span>{d.time || '09:00 ص'}</span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-[#1D1D1F]">
                            {d.customerName || d.destinationName}
                          </div>
                          <div className="text-[11px] text-[#86868B] mt-0.5">
                            {d.repName || d.destinationName}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-black text-[#1D1D1F] text-sm tabular-nums">
                            {d.totalWeightKg.toLocaleString()} کگم
                          </div>
                          <div className="text-[10px] text-[#86868B] truncate max-w-[170px]">
                            {d.items.map(i => `${i.productName} (${i.weightKg})`).join('، ')}
                          </div>
                        </td>

                        <td className="p-4">
                          {linked.length > 0 ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 bg-[#FF3B30]/10 text-[#FF3B30] px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums">
                                <RotateCcw className="w-3 h-3" />
                                -{linkedReturnKg} کگم
                              </span>
                              <div className="text-[10px] text-[#248A3D] font-semibold tabular-nums">
                                -{linkedDeduction.toLocaleString()} د.ع داشکاو
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#86868B]">بێ گەڕاوە</span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="font-black text-[#248A3D] tabular-nums">
                            {netAmount.toLocaleString()} د.ع
                          </div>
                          {linkedDeduction > 0 && (
                            <div className="text-[10px] text-[#86868B] line-through tabular-nums">
                              {d.totalAmount.toLocaleString()} د.ع
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          {d.paymentType === 'CASH' ? (
                            <span className="text-[10px] bg-[#34C759]/10 text-[#248A3D] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                              <Banknote className="w-3 h-3" />
                              کاش
                            </span>
                          ) : d.paymentType === 'ELECTRONIC' ? (
                            <span className="text-[10px] bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              ئەلکترۆنی
                            </span>
                          ) : (
                            <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                              <CreditCard className="w-3 h-3" />
                              قەرز
                            </span>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenReturnModal(d)}
                              className="px-2.5 py-1.5 rounded-full bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                              title="تۆمارکردنی گەڕاوە بە هەمان ژمارەی وەسڵ"
                            >
                              <RotateCcw className="w-3 h-3" />
                              گەڕاوە
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedSaleForPrint(d)}
                              className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#0071E3] transition-colors"
                              title="بینینی وەسڵ و پرینت"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            {hasAccess('settings') && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`وەسڵی #${d.manualReceiptNo} بخرێتە سەبەتەی سۆفت دیلیت و قەرز/کۆگا بگەڕێندرێتەوە؟`)) {
                                    softDeleteRecord('DISPATCH', d.id, 'سڕینەوەی خێرا لە فرۆشتنی مەندوب');
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white transition-colors"
                                title="سۆفت دیلیت"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table 2: Returns Log */}
      {subTab === 'returns' && (
        <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
            <span className="font-bold text-xs text-[#1D1D1F]">
              تۆماری گەڕاوەی ٣ ڕۆژ بەستراو بە وەسڵی فرۆشتن ({filteredReturns.length})
            </span>
            <span className="text-[11px] text-[#86868B]">
              هەموو گەڕاوەیەک بە هەمان ژمارەی وەسڵی فرۆشتن تۆمار دەکرێت
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. وەسڵی فرۆشتن</th>
                  <th className="p-4">بەروار و کات</th>
                  <th className="p-4">ناوی مارکێت (کڕیار)</th>
                  <th className="p-4">بەرهەمە گەڕاوەکان</th>
                  <th className="p-4">کێشی گەڕاوە</th>
                  <th className="p-4">داشکاو لە کڕیار</th>
                  <th className="p-4">تەلەفی کارگە</th>
                  <th className="p-4 text-center">وەسڵ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#86868B]">
                      هیچ گەڕاوەیەکی ٣ ڕۆژ تۆمار نەکراوە
                    </td>
                  </tr>
                ) : (
                  filteredReturns.map(r => (
                    <tr key={r.id} className="hover:bg-[#FBFBFD] transition-colors">
                      <td className="p-4">
                        <span className="bg-[#FF3B30]/10 text-[#FF3B30] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
                          {r.salesReceiptNo || r.manualReceiptNo}
                        </span>
                        {r.salesReceiptNo && r.salesReceiptNo !== r.manualReceiptNo && (
                          <div className="text-[10px] text-[#86868B] mt-1 font-mono">
                            گەڕاوە: {r.manualReceiptNo}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-[#1D1D1F]">{r.date}</div>
                        <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#86868B]" />
                          <span>{r.time || '10:00 ص'}</span>
                        </div>
                      </td>

                      <td className="p-4 font-bold text-[#1D1D1F]">
                        {r.customerName || r.sourceName}
                      </td>

                      <td className="p-4 text-[#86868B]">
                        <div className="font-medium text-[#1D1D1F]">{r.items.length} بەرهەم</div>
                        <div className="text-[10px] text-[#86868B] truncate max-w-[160px]">
                          {r.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                        </div>
                      </td>

                      <td className="p-4 font-black text-[#FF3B30] text-sm tabular-nums">
                        {r.totalWeightKg.toLocaleString()} کگم
                      </td>

                      <td className="p-4 font-black text-[#248A3D] tabular-nums">
                        -{(r.totalCustomerDeduction ?? r.totalLossAmount).toLocaleString()} د.ع
                      </td>

                      <td className="p-4 font-black text-[#FF3B30] tabular-nums">
                        {r.totalLossAmount.toLocaleString()} د.ع
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForPrint(r)}
                            className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#FF3B30] transition-colors"
                            title="بینینی وەسڵ و پرینت"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {hasAccess('settings') && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`گەڕاوەی #${r.manualReceiptNo} بخرێتە سەبەتەی سۆفت دیلیت؟`)) {
                                  softDeleteRecord('RETURN', r.id, 'سڕینەوەی خێرا لە تۆماری گەڕاوە');
                                }
                              }}
                              className="p-1.5 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white transition-colors"
                              title="سۆفت دیلیت"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: New Rep Sale (also supports inline 3-Day Returns on SAME Receipt #) */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    تۆمارکردنی فرۆشی مەندوب (لەگەڵ گەڕاوە ئەگەر هەبێت)
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    دەتوانیت بەرهەمی فرۆشراو و گەڕاوەی ٣ ڕۆژ لەسەر هەمان ژمارەی وەسڵ تۆمار بکەیت
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="p-6 space-y-4 text-xs">
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
                    onChange={e => setManualReceiptNo(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] font-bold outline-none focus:border-[#0071E3] focus:bg-white transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کاتژمێر</label>
                  <input
                    type="text"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    placeholder="نموونە: 10:15 ص"
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#0071E3]" />
                    ناوی مەندوب (فرۆشیار) *
                  </label>
                  <select
                    value={repName}
                    onChange={e => setRepName(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] font-semibold"
                  >
                    {repNames.map((rep, idx) => (
                      <option key={idx} value={rep}>
                        {rep}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-[#34C759]" />
                    ناوی مارکێت / کڕیار *
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={customerName}
                      onChange={e => {
                        setCustomerName(e.target.value);
                        setCustomCustomer('');
                      }}
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] font-semibold"
                    >
                      {customers.map(c => (
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
                        onChange={e => setCustomCustomer(e.target.value)}
                        className="w-full bg-white border-2 border-[#0071E3] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-bold outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Live Rep Custody Balance Bar */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col gap-2 ${
                  selectedRepCustody.totalRemainingKg > 0
                    ? 'bg-[#0071E3]/6 border-[#0071E3]/20'
                    : 'bg-[#FF9500]/8 border-[#FF9500]/25'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-[#1D1D1F]">
                    <ClipboardList
                      className={`w-4 h-4 ${
                        selectedRepCustody.totalRemainingKg > 0
                          ? 'text-[#0071E3]'
                          : 'text-[#B25000]'
                      }`}
                    />
                    <span>باڵانسی ماوەی سەر حسابی {repName}:</span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-black text-xs tabular-nums ${
                      selectedRepCustody.totalRemainingKg > 0
                        ? 'bg-[#0071E3] text-white'
                        : 'bg-[#FF9500] text-white'
                    }`}
                  >
                    {selectedRepCustody.totalRemainingKg.toLocaleString()} کگم ماوە لەسەر حساب
                  </span>
                </div>

                {selectedRepCustody.items.filter(i => i.remainingKg > 0).length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRepCustody.items
                      .filter(i => i.remainingKg > 0)
                      .map(item => (
                        <span
                          key={item.productId}
                          className="px-2.5 py-1 rounded-xl bg-white border border-black/[0.06] text-[11px] font-bold text-[#1D1D1F] tabular-nums"
                        >
                          {item.productName}:{' '}
                          <span className="text-[#0071E3]">{item.remainingKg} کگم</span>
                        </span>
                      ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#B25000] font-semibold">
                    هیچ بڕە بەرهەمێکی ماوە لەسەر عەهدەی ئەم مەندوبە نییە — سەرەتا لە کۆگای ئامادە یان حسابی مەندوب باری بۆ بنێرە.
                  </p>
                )}
              </div>

              {/* Payment Type */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-[#1D1D1F] block">شێوازی پارەدان و تۆماری دارایی:</span>
                  <span className="text-[11px] text-[#86868B]">
                    ئەگەر بە قەرز بێت، بڕی فرۆشراوەکە یەکسەر دەچێتە سەر کەشف حسابی ئەم مارکێتە
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('CREDIT')}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
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
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                      paymentType === 'CASH'
                        ? 'bg-[#34C759] text-white shadow-sm'
                        : 'bg-white text-[#515154] border border-black/[0.06]'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    کاش (نەقد)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('ELECTRONIC')}
                    className={`px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all ${
                      paymentType === 'ELECTRONIC'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'bg-white text-[#515154] border border-black/[0.06]'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    پارەدانی ئەلکترۆنی
                  </button>
                </div>
              </div>

              {/* Sale Items */}
              <div className="border border-black/[0.06] rounded-2xl p-4 bg-[#FBFBFD] space-y-3">
                <div className="font-bold text-[#1D1D1F] flex items-center justify-between">
                  <span>بەرهەمە فرۆشراوەکان بە مارکێت</span>
                  <span className="text-[11px] font-normal text-[#86868B]">
                    هەر بەرهەمێک لەگەڵ کێش و نرخەکەی زیاد بکە
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) setItemPrice(prod.pricePerKg);
                      }}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none font-semibold"
                    >
                      {products.map(p => (
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
                      onChange={e => setItemWeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="نرخی کیلۆ (د.ع)"
                      value={itemPrice}
                      onChange={e => setItemPrice(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSaleItem}
                  className="w-full py-2 bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردنی بەرهەم بۆ ناو وەسڵ
                </button>

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
                              {item.pricePerKg.toLocaleString()} د.ع
                            </td>
                            <td className="p-2.5 font-black text-[#34C759]">
                              {item.totalAmount.toLocaleString()} د.ع
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setItemsList(itemsList.filter((_, i) => i !== idx))
                                }
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

              {/* Optional Inline Return on SAME Receipt Number */}
              <div className="border border-[#FF3B30]/20 rounded-2xl p-4 bg-[#FF3B30]/[0.03] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-[#FF3B30]" />
                    <div>
                      <div className="font-bold text-[#1D1D1F]">
                        گەڕاوەی ٣ ڕۆژ لەسەر هەمان وەسڵ ({manualReceiptNo || '---'})
                      </div>
                      <div className="text-[10px] text-[#86868B]">
                        ئەگەر مارکێتەکە تەلەفی گەڕاندەوە، لێرە یان دواتر بە هەمان ژمارەی وەسڵ تۆماری بکە
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeReturnInSale(prev => !prev)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      includeReturnInSale
                        ? 'bg-[#FF3B30] text-white'
                        : 'bg-white text-[#FF3B30] border border-[#FF3B30]/30'
                    }`}
                  >
                    {includeReturnInSale ? 'لادان' : '+ گەڕاوەی لەگەڵدایە'}
                  </button>
                </div>

                {includeReturnInSale && (
                  <div className="space-y-3 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={inlineReturnProductId}
                        onChange={e => setInlineReturnProductId(e.target.value)}
                        className="bg-white border border-black/[0.08] rounded-xl px-3 py-2 text-[#1D1D1F] font-semibold outline-none"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nameKu}
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="0.1"
                        placeholder="کێشی گەڕاوە (کگم)"
                        value={inlineReturnWeight}
                        onChange={e =>
                          setInlineReturnWeight(e.target.value ? Number(e.target.value) : '')
                        }
                        className="bg-white border border-black/[0.08] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                      />

                      <select
                        value={inlineReturnReason}
                        onChange={e =>
                          setInlineReturnReason(
                            e.target.value as 'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'
                          )
                        }
                        className="bg-white border border-black/[0.08] rounded-xl px-3 py-2 text-[#1D1D1F] font-semibold outline-none"
                      >
                        {Object.entries(REASON_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddInlineReturnItem}
                      className="w-full py-1.5 bg-white hover:bg-[#FF3B30]/5 border border-[#FF3B30]/25 text-[#FF3B30] font-bold rounded-xl flex items-center justify-center gap-1 text-[11px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      زیادکردنی بەرهەمی گەڕاوە بۆ هەمان وەسڵ
                    </button>

                    {inlineReturnItems.length > 0 && (
                      <div className="bg-white rounded-xl border border-[#FF3B30]/15 overflow-hidden">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-[#FF3B30]/5 text-[#515154] font-semibold">
                            <tr>
                              <th className="p-2">بەرهەم</th>
                              <th className="p-2">کێشی گەڕاوە</th>
                              <th className="p-2">داشکاو لە قەرز</th>
                              <th className="p-2 text-center">سڕینەوە</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {inlineReturnItems.map((ri, idx) => (
                              <tr key={idx}>
                                <td className="p-2 font-bold">{ri.productName}</td>
                                <td className="p-2 font-black text-[#FF3B30]">{ri.weightKg} کگم</td>
                                <td className="p-2 font-bold text-[#248A3D]">
                                  -{(ri.customerDeductionAmount || ri.totalLoss).toLocaleString()} د.ع
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInlineReturnItems(
                                        inlineReturnItems.filter((_, i) => i !== idx)
                                      )
                                    }
                                    className="text-[#FF3B30] p-1"
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
                )}
              </div>

              {/* Bottom Summary Bar */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[#86868B] text-xs">کۆی فرۆش: </span>
                  <span className="text-base font-black text-[#1D1D1F]">
                    {saleTotalWeight.toLocaleString()} کگم • {saleTotalAmount.toLocaleString()} د.ع
                  </span>
                </div>
                {inlineReturnItems.length > 0 && (
                  <div className="text-xs font-bold text-[#FF3B30]">
                    گەڕاوە: -{inlineReturnTotalWeight} کگم (-
                    {inlineReturnTotalDeduction.toLocaleString()} د.ع) | صافی:{' '}
                    <span className="text-[#248A3D]">
                      {Math.max(0, saleTotalAmount - inlineReturnTotalDeduction).toLocaleString()}{' '}
                      د.ع
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="تێبینی دەربارەی وەسڵ..."
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-md shadow-[#0071E3]/25 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  پەسەندکردن و تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Return Using EXACT SAME Sales Receipt Number */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#FF3B30] text-white flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    تۆمارکردنی گەڕاوەی ٣ ڕۆژ بە هەمان ژمارەی وەسڵی فرۆشتن
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    گەڕاوەکە ڕاستەوخۆ بە هەمان ژمارەی وەسڵی فرۆشتن تۆمار دەکرێت و لە قەرزی مارکێت دادەشکێت
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowReturnModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-6 space-y-4 text-xs">
              {/* Step 1: Select Sales Receipt */}
              <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#1D1D1F] text-xs flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-[#0071E3]" />
                      هەڵبژاردنی وەسڵی فرۆشتن *
                    </span>
                    <p className="text-[11px] text-[#86868B]">
                      ژمارەی وەسڵی گەڕاوەکە بە شێوەی خۆکار دەبێتە هەمان ژمارەی وەسڵی فرۆشتن
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="گەڕان بە ژ. وەسڵ یان مارکێت..."
                      value={searchReceiptQuery}
                      onChange={e => setSearchReceiptQuery(e.target.value)}
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
                    filteredReceiptOptions.map(rcpt => {
                      const isSelected = selectedSalesReceipt?.id === rcpt.id;
                      return (
                        <div
                          key={rcpt.id}
                          onClick={() => handleSelectSalesReceipt(rcpt)}
                          className={`p-3 rounded-xl cursor-pointer border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                            isSelected
                              ? 'bg-[#0071E3]/10 border-[#0071E3] shadow-sm'
                              : 'bg-white hover:bg-[#F5F5F7] border-black/[0.06]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg font-mono font-bold text-[11px] ${
                                isSelected
                                  ? 'bg-[#0071E3] text-white'
                                  : 'bg-[#F5F5F7] text-[#0071E3]'
                              }`}
                            >
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

              {/* Step 2: Same Receipt Details & Return Weights */}
              {selectedSalesReceipt && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">
                        ژمارەی وەسڵ (هەمان وەسڵی فرۆشتن)
                      </label>
                      <div className="w-full bg-[#0071E3]/10 border border-[#0071E3]/30 rounded-xl px-3.5 py-2 font-black font-mono text-[#0071E3] flex items-center justify-between">
                        <span>{selectedSalesReceipt.manualReceiptNo}</span>
                        <span className="text-[10px] font-sans bg-white/80 px-2 py-0.5 rounded-full">
                          هاوشێوە
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">
                        بەرواری گەڕانەوە *
                      </label>
                      <input
                        type="date"
                        required
                        value={returnDate}
                        onChange={e => setReturnDate(e.target.value)}
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">هۆکاری تەلەف</label>
                      <select
                        value={returnReason}
                        onChange={e =>
                          setReturnReason(
                            e.target.value as 'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'
                          )
                        }
                        className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-bold outline-none"
                      >
                        {Object.entries(REASON_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/[0.06] bg-[#FBFBFD] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1D1D1F]">
                        بەرهەمەکانی ناو وەسڵی [{selectedSalesReceipt.manualReceiptNo}]:
                      </span>
                      <span className="text-[11px] text-[#0071E3] font-semibold bg-[#0071E3]/10 px-2.5 py-0.5 rounded-full">
                        تەنها کێشی ماوەی سەر وەسڵ دەگەڕێتەوە
                      </span>
                    </div>

                    <div className="bg-white rounded-xl border border-black/[0.06] overflow-x-auto">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-[#F5F5F7] text-[#515154] font-bold">
                          <tr>
                            <th className="p-3">بەرهەم</th>
                            <th className="p-3">فرۆشراو / ماوە</th>
                            <th className="p-3">نرخی فرۆش</th>
                            <th className="p-3 w-36">کێشی گەڕاوە (کگم) *</th>
                            <th className="p-3">داشکاو لە کڕیار</th>
                            <th className="p-3">تەلەفی کارگە</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.04]">
                          {returnRows.map(row => {
                            const isOver = row.returnWeightKg > row.remainingReturnableKg;
                            return (
                              <tr key={row.productId} className={isOver ? 'bg-[#FF3B30]/5' : ''}>
                                <td className="p-3 font-bold text-[#1D1D1F]">{row.productName}</td>
                                <td className="p-3 text-[#86868B] font-semibold">
                                  {row.soldWeightKg} کگم
                                  {row.previouslyReturnedKg > 0 && (
                                    <span className="block text-[10px] text-[#FF3B30]">
                                      ماوە: {row.remainingReturnableKg} کگم
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-[#515154]">
                                  {row.salePricePerKg.toLocaleString()} د.ع
                                </td>
                                <td className="p-3">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max={row.remainingReturnableKg}
                                    placeholder="0"
                                    value={
                                      returnItemWeights[row.productId] === 0
                                        ? ''
                                        : returnItemWeights[row.productId] || ''
                                    }
                                    onChange={e => {
                                      const val =
                                        e.target.value === '' ? 0 : Number(e.target.value);
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
                                      لە کێشی ماوە زیاترە!
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
                  <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] text-[#86868B] block font-semibold">
                        کاریگەری تۆمارکردن لەسەر وەسڵی {selectedSalesReceipt.manualReceiptNo}:
                      </span>
                      <div className="flex items-center gap-4 mt-1">
                        <div>
                          <span className="text-[10px] text-[#86868B]">کێشی گەڕاوە:</span>
                          <div className="text-base font-black text-[#1D1D1F]">
                            {totalReturnKg} کگم
                          </div>
                        </div>
                        <div className="border-r border-black/10 pr-4">
                          <span className="text-[10px] text-[#248A3D] font-bold">
                            داشکاو لە قەرزی مارکێت:
                          </span>
                          <div className="text-base font-black text-[#248A3D]">
                            -{totalCustomerDeduction.toLocaleString()} د.ع
                          </div>
                        </div>
                        <div className="border-r border-black/10 pr-4">
                          <span className="text-[10px] text-[#FF3B30] font-bold">
                            زیانی تەلەفی کارگە:
                          </span>
                          <div className="text-base font-black text-[#FF3B30]">
                            +{totalFactoryLoss.toLocaleString()} د.ع
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-black/[0.06] text-[11px] text-[#515154]">
                      <span className="font-bold text-[#1D1D1F] block">مارکێتی پەیوەندیدار:</span>
                      <span>
                        {selectedSalesReceipt.customerName || selectedSalesReceipt.destinationName}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                    <input
                      type="text"
                      value={returnNotes}
                      onChange={e => setReturnNotes(e.target.value)}
                      placeholder="تێبینی دەربارەی گەڕاوەکە..."
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none focus:border-[#FF3B30]"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#FF3B30] hover:bg-[#E02D23] shadow-md shadow-[#FF3B30]/25 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  پەسەندکردنی گەڕاوە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Sales Receipt Modal (shows linked returns on same receipt #) */}
      {selectedSaleForPrint && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <FactoryLogo size="md" />
                <div>
                  <h3 className="font-bold text-base text-[#1D1D1F]">
                    وەسڵی فرۆشی مەندوب و گەڕاوە
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    {factorySettings.factoryName} • {factorySettings.phone1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleForPrint(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {(() => {
              const linked = getLinkedReturns(selectedSaleForPrint);
              const linkedDeduct = linked.reduce(
                (s, r) => s + (r.totalCustomerDeduction ?? r.totalLossAmount),
                0
              );
              const netTotal = Math.max(0, selectedSaleForPrint.totalAmount - linkedDeduct);

              return (
                <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                    <span>ژمارەی وەسڵی دەستی:</span>
                    <span className="font-bold text-[#0071E3]">
                      {selectedSaleForPrint.manualReceiptNo}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>بەروار و کات:</span>
                    <span>
                      {selectedSaleForPrint.date} - {selectedSaleForPrint.time || '09:00 ص'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>ناوی مەندوب:</span>
                    <span className="font-bold">
                      {selectedSaleForPrint.repName || selectedSaleForPrint.destinationName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>مارکێتی کڕیار:</span>
                    <span className="font-bold">
                      {selectedSaleForPrint.customerName || selectedSaleForPrint.destinationName}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                    <span>شێوازی پارەدان:</span>
                    <span className="font-bold">
                      {selectedSaleForPrint.paymentType === 'CASH'
                        ? 'کاش (نەقد)'
                        : selectedSaleForPrint.paymentType === 'ELECTRONIC'
                        ? 'پارەدانی ئەلکترۆنی (FIB / کارت)'
                        : 'قەرز (لەسەر حسابی مارکێت)'}
                    </span>
                  </div>

                  <div className="space-y-1.5 py-2">
                    <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                      <span>بەرهەمی فرۆشراو</span>
                      <span>کێش / نرخ / کۆ</span>
                    </div>
                    {selectedSaleForPrint.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span>{item.productName}</span>
                        <span>
                          {item.weightKg} کگم × {item.pricePerKg.toLocaleString()} ={' '}
                          {item.totalAmount.toLocaleString()} د.ع
                        </span>
                      </div>
                    ))}
                  </div>

                  {linked.length > 0 && (
                    <div className="space-y-1.5 py-2 border-t border-dashed border-[#FF3B30]/30 text-[#FF3B30]">
                      <div className="font-bold pb-1 flex justify-between">
                        <span>گەڕاوەی ٣ ڕۆژ (هەمان وەسڵ)</span>
                        <span>کێش / داشکاو</span>
                      </div>
                      {linked.flatMap(r => r.items).map((ri, i) => (
                        <div key={i} className="flex justify-between text-[11px]">
                          <span>{ri.productName}</span>
                          <span>
                            -{ri.weightKg} کگم (-
                            {(ri.customerDeductionAmount || ri.totalLoss).toLocaleString()} د.ع)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                    <span>کۆی فرۆش:</span>
                    <span>
                      {selectedSaleForPrint.totalWeightKg} کگم •{' '}
                      {selectedSaleForPrint.totalAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                  {linkedDeduct > 0 && (
                    <div className="flex justify-between text-xs font-bold text-[#FF3B30]">
                      <span>داشکاوی گەڕاوە:</span>
                      <span>-{linkedDeduct.toLocaleString()} د.ع</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-black text-[#0071E3]">
                    <span>کۆی صافی وەسڵ:</span>
                    <span>{netTotal.toLocaleString()} د.ع</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-between gap-3 pt-2">
              <span className="text-[10px] text-[#86868B]">{factorySettings.receiptFooter}</span>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 no-print"
              >
                <Printer className="w-4 h-4" />
                پرینتکردنی وەسڵ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Return Receipt Modal */}
      {selectedReturnForPrint && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <FactoryLogo size="md" />
                <div>
                  <h3 className="font-bold text-base text-[#1D1D1F]">
                    وەسڵی گەڕاوەی ٣ ڕۆژ (تەلەف)
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    {factorySettings.factoryName} • {factorySettings.phone1}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnForPrint(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>ژمارەی وەسڵی فرۆشتن:</span>
                <span className="font-bold text-[#FF3B30]">
                  {selectedReturnForPrint.salesReceiptNo || selectedReturnForPrint.manualReceiptNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span>بەروار و کات:</span>
                <span>
                  {selectedReturnForPrint.date} - {selectedReturnForPrint.time || '10:00 ص'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ناوی مەندوب:</span>
                <span className="font-bold">{selectedReturnForPrint.repName || 'مەندوب'}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>مارکێتی کڕیار:</span>
                <span className="font-bold">
                  {selectedReturnForPrint.customerName || selectedReturnForPrint.sourceName}
                </span>
              </div>

              <div className="space-y-1.5 py-2">
                <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                  <span>بەرهەم</span>
                  <span>کێشی گەڕاوە</span>
                </div>
                {selectedReturnForPrint.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.productName}</span>
                    <span className="font-bold">{item.weightKg} کگم</span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                <span>کۆی کێشی تەلەف:</span>
                <span className="text-[#FF3B30]">{selectedReturnForPrint.totalWeightKg} کگم</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#248A3D]">
                <span>داشکاو لە حسابی مارکێت:</span>
                <span>
                  -
                  {(
                    selectedReturnForPrint.totalCustomerDeduction ??
                    selectedReturnForPrint.totalLossAmount
                  ).toLocaleString()}{' '}
                  د.ع
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
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
