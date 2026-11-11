import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShoppingBag,
  Barcode,
  Printer,
  Trash2,
  CreditCard,
  Banknote,
  Boxes,
  RotateCcw,
  Users,
  Plus,
  Search,
  CheckCircle2,
  TrendingUp,
  X,
  Scale,
  Receipt,
  Percent,
  Check,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import { POSSaleItem, POSSale, ProductItem, ReturnItem, BranchStockItem } from '../../types';
import { FactoryLogo } from '../layout/FactoryLogo';

// ==========================================
// AUDIO FEEDBACK HELPER (Web Audio API)
// ==========================================
const playPosBeep = (type: 'success' | 'scale' | 'error' = 'success') => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'scale') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, ctx.currentTime);
      osc.frequency.setValueAtTime(1360, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // AudioContext blocked or unsupported
  }
};

// ==========================================
// SVG BARCODE COMPONENT
// ==========================================
const BarcodeSVG: React.FC<{ code: string; width?: number; height?: number }> = ({
  code,
  width = 200,
  height = 44,
}) => {
  const bars: { x: number; w: number }[] = [];
  let currentX = 10;
  const totalLength = code.length || 10;
  const barUnit = (width - 20) / (totalLength * 3.5);

  for (let i = 0; i < totalLength; i++) {
    const charCode = code.charCodeAt(i % code.length) || 50;
    const w1 = ((charCode % 3) + 1) * barUnit;
    const space = (((charCode >> 1) % 2) + 1) * barUnit;
    const w2 = (((charCode >> 2) % 3) + 1) * barUnit;

    bars.push({ x: currentX, w: w1 });
    currentX += w1 + space;
    bars.push({ x: currentX, w: w2 });
    currentX += w2 + space;
  }

  return (
    <svg width={width} height={height} className="mx-auto select-none">
      <rect width={width} height={height} fill="#FFFFFF" />
      {bars.map((bar, idx) => (
        <rect key={idx} x={bar.x} y={4} width={Math.max(1, bar.w)} height={height - 18} fill="#1D1D1F" />
      ))}
      <text
        x={width / 2}
        y={height - 2}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#515154"
        letterSpacing="2"
      >
        {code}
      </text>
    </svg>
  );
};

export const POSView: React.FC = () => {
  const {
    products,
    posSales,
    branchStock,
    returns,
    customers,
    branchExpenses,
    currentUser,
    factorySettings,
    addPOSSale,
    addReturn,
    addBranchExpense,
    updateBranchStockItem,
    parseWeightBarcode,
    softDeleteRecord,
    hasAccess,
  } = useApp();

  // Apple Segmented Tabs
  const [activeSubTab, setActiveSubTab] = useState<'REGISTER' | 'BRANCH_RETURNS' | 'INVENTORY' | 'REGISTER_REPORT'>('REGISTER');

  // ==========================================
  // POS REGISTER STATE
  // ==========================================
  const [cart, setCart] = useState<POSSaleItem[]>([]);
  const [scannerInput, setScannerInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'CASH' | 'FIB_OR_CARD' | 'DEBT'>('CASH');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('کڕیاری ئاسایی نەقد');
  const [selectedDebtCustomerId, setSelectedDebtCustomerId] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  // Numeric Weight Scale Modal
  const [weightModalProduct, setWeightModalProduct] = useState<ProductItem | null>(null);
  const [weightKeypadValue, setWeightKeypadValue] = useState<string>('1.000');

  // Thermal Receipt Print Modal
  const [printReceipt, setPrintReceipt] = useState<POSSale | null>(null);

  // Price Editor Modal (replaces native browser prompt)
  const [editingPriceItem, setEditingPriceItem] = useState<BranchStockItem | null>(null);
  const [newPriceInput, setNewPriceInput] = useState<string>('');

  const scannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeSubTab === 'REGISTER' && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [activeSubTab]);

  const showToast = (text: string, type: 'success' | 'warn' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ==========================================
  // BARCODE SCANNER HANDLER (POS REGISTER)
  // ==========================================
  const handleBarcodeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawBarcode = scannerInput.trim();
    if (!rawBarcode) return;

    const result = parseWeightBarcode(rawBarcode);

    if (result.valid && (result.product || result.branchItem)) {
      const prod = result.product || products.find(p => p.id === result.branchItem?.productId);
      if (!prod) {
        playPosBeep('error');
        showToast('بەرهەم نەدۆزرایەوە لە سیستەمدا!', 'warn');
        setScannerInput('');
        return;
      }

      const branchItem = branchStock.find(b => b.productId === prod.id);
      const retailPrice = branchItem ? branchItem.retailPricePerKg : prod.pricePerKg;
      const weight = result.weightKg > 0 ? result.weightKg : 1.0;

      const currentStock = branchItem ? branchItem.inStockKg : prod.inStockKg;
      if (currentStock <= 0) {
        showToast(`ئاگاداری: ستۆکی (${prod.nameKu}) لە شۆرۆمدا نەماوە!`, 'warn');
      }

      addItemToCart(prod, weight, retailPrice, rawBarcode);
      playPosBeep(rawBarcode.length === 13 ? 'scale' : 'success');
      showToast(`سکان کرا: ${prod.nameKu} (${weight.toFixed(3)} کگم)`, 'success');
      setScannerInput('');
    } else {
      playPosBeep('error');
      showToast(`بارکۆدی (${rawBarcode}) نەناسراوە!`, 'warn');
      setScannerInput('');
    }
  };

  const addItemToCart = (product: ProductItem, weightKg: number, pricePerKg: number, barcodeStr?: string) => {
    const total = Math.round(weightKg * pricePerKg);
    setCart(prev => {
      const existing = prev.findIndex(item => item.productId === product.id);
      if (existing > -1 && (!barcodeStr || barcodeStr.length < 13)) {
        const updated = [...prev];
        const newWeight = Math.round((updated[existing].weightKg + weightKg) * 1000) / 1000;
        updated[existing] = {
          ...updated[existing],
          weightKg: newWeight,
          total: Math.round(newWeight * pricePerKg),
        };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.nameKu,
          barcode: barcodeStr || product.barcodePrefix,
          weightKg,
          pricePerKg,
          total,
        },
      ];
    });
  };

  const updateCartItemWeight = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newWeight = Math.max(0.1, Math.round((item.weightKg + delta) * 1000) / 1000);
      updated[index] = {
        ...item,
        weightKg: newWeight,
        total: Math.round(newWeight * item.pricePerKg),
      };
      return updated;
    });
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
    playPosBeep('scale');
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setDiscountAmount(0);
    setDiscountPercent(0);
    setCashGiven('');
    playPosBeep('scale');
    showToast('سەبەتەی فرۆشتن بەتاڵکرایەوە', 'info');
  };

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const calculatedDiscount = discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : discountAmount;
  const netTotal = Math.max(0, subtotal - calculatedDiscount);
  const numericCashGiven = parseFloat(cashGiven) || 0;
  const changeDue = numericCashGiven > netTotal ? numericCashGiven - netTotal : 0;

  const handleCompleteSale = () => {
    if (cart.length === 0) {
      showToast('سەبەتە بەتاڵە! تکایە بەرهەم هەڵبژێرە یان بارکۆد سکان بکە', 'warn');
      return;
    }

    const resolvedCustomerName =
      paymentType === 'DEBT' && selectedDebtCustomerId
        ? customers.find(c => c.id === selectedDebtCustomerId)?.name || customerNameInput.trim() || 'کڕیاری قەرز'
        : customerNameInput.trim() || 'کڕیاری ئاسایی نەقد';

    const sale = addPOSSale({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      subtotal,
      discount: calculatedDiscount,
      total: netTotal,
      paidAmount: paymentType === 'CASH' ? (numericCashGiven > 0 ? numericCashGiven : netTotal) : paymentType === 'DEBT' ? 0 : netTotal,
      changeAmount: changeDue,
      paymentType,
      customerId: paymentType === 'DEBT' ? selectedDebtCustomerId || undefined : undefined,
      customerName: resolvedCustomerName,
      cashierName: currentUser?.name || 'کاشێری شۆروم',
    });

    playPosBeep('success');
    setPrintReceipt(sale);
    setCart([]);
    setDiscountAmount(0);
    setDiscountPercent(0);
    setCashGiven('');
    setSelectedDebtCustomerId('');
    showToast(`وەسڵی ${sale.saleNo} بە سەرکەوتوویی تەواو کرا`, 'success');
  };

  // ==========================================
  // SHOWROOM 3-DAY UNSOLD RETURNS TO READY STOCK
  // ==========================================
  const [returnReceiptNo, setReturnReceiptNo] = useState(`SH-RET-${Math.floor(1000 + Math.random() * 9000)}`);
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [returnReason, setReturnReason] = useState<'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED'>('EXPIRED_3_DAYS');
  const [returnNotes, setReturnNotes] = useState('گەڕاوەی ٣ ڕۆژی فرۆشگای شۆرۆم بۆ گۆڕینی شێواز لە کۆگای ئامادە');
  const [returnSelectedProdId, setReturnSelectedProdId] = useState<string>(branchStock[0]?.productId || products[0]?.id || '');
  const [returnWeightInput, setReturnWeightInput] = useState<string>('');
  const [returnStagingList, setReturnStagingList] = useState<ReturnItem[]>([]);

  const showroomReturns = returns.filter(r => r.sourceType === 'BRANCH');

  const addStagedReturnItem = () => {
    const stockItem = branchStock.find(s => s.productId === returnSelectedProdId);
    const prod = products.find(p => p.id === returnSelectedProdId);
    const productName = stockItem?.productName || prod?.nameKu || '';
    const productBarcode = stockItem?.barcode || prod?.barcodePrefix || '';
    const unitCost = stockItem?.factoryCostPerKg || prod?.costPerKg || 2800;

    if (!returnSelectedProdId || !productName) {
      showToast('تکایە بەرهەمێک لە کۆگای شۆرۆم هەڵبژێرە', 'warn');
      return;
    }

    const weight = parseFloat(returnWeightInput);
    if (isNaN(weight) || weight <= 0) {
      showToast('تکایە کێشێکی دروست بە کیلۆگرام بنووسە', 'warn');
      return;
    }

    if (stockItem && weight > stockItem.inStockKg) {
      showToast(`ئەم کێشە لە کۆگای شۆرۆم بەردەست نییە! بەردەست: ${stockItem.inStockKg.toFixed(1)} کگم`, 'warn');
      return;
    }

    setReturnStagingList(prev => [
      ...prev,
      {
        productId: returnSelectedProdId,
        productName,
        barcode: productBarcode,
        weightKg: weight,
        unitCost,
        totalLoss: Math.round(weight * unitCost),
        reason: returnReason,
      },
    ]);

    playPosBeep('success');
    showToast(`زیادکرا بۆ لیستی گەڕاوە: ${productName} (${weight} کگم)`, 'success');
    setReturnWeightInput('');
  };

  const removeStagedReturnItem = (index: number) => {
    setReturnStagingList(prev => prev.filter((_, i) => i !== index));
    playPosBeep('scale');
  };

  const commitShowroomReturn = () => {
    if (returnStagingList.length === 0) {
      showToast('لیستی گەڕاوە بەتاڵە! لانیکەم بەرهەمێک زیاد بکە', 'warn');
      return;
    }

    const totalWeightKg = returnStagingList.reduce((sum, item) => sum + item.weightKg, 0);
    const totalLossAmount = returnStagingList.reduce((sum, item) => sum + item.totalLoss, 0);

    addReturn({
      manualReceiptNo: returnReceiptNo.trim() || `SH-RET-${Date.now().toString().slice(-4)}`,
      date: returnDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      sourceType: 'BRANCH',
      sourceName: 'فرۆشگای تایبەت (شۆرۆم POS)',
      items: [...returnStagingList],
      totalWeightKg,
      totalLossAmount,
      totalCustomerDeduction: 0,
      disposalMethod: 'DESTROYED',
      notes: returnNotes,
    });

    playPosBeep('success');
    showToast(`گەڕاوەی شۆرۆم (${totalWeightKg.toFixed(1)} کگم) تۆمارکرا و نێردرا بۆ ئامادە بۆ گۆڕین`, 'success');
    setReturnStagingList([]);
    setReturnReceiptNo(`SH-RET-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // ==========================================
  // EXPENSES STATE
  // ==========================================
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState<string>('');
  const [expCategory, setExpCategory] = useState<'RENT' | 'ELECTRICITY' | 'PACKAGING' | 'SALARIES' | 'CLEANING' | 'MAINTENANCE' | 'OTHER'>('PACKAGING');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (!expTitle.trim() || isNaN(amount) || amount <= 0) {
      showToast('تکایە ناوی خەرجی و بڕێکی دروست بنووسە', 'warn');
      return;
    }

    addBranchExpense({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: expTitle.trim(),
      category: expCategory,
      amount,
      notes: 'تۆمارکراوی خەرجی شۆروم',
    });

    setExpTitle('');
    setExpAmount('');
    setShowAddExpenseModal(false);
    showToast('خەرجی شۆروم تۆمارکرا', 'success');
  };

  // Price Update Handler
  const handleSavePriceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPriceItem) return;
    const val = parseFloat(newPriceInput);
    if (isNaN(val) || val <= 0) {
      showToast('نرخێکی دروست بنووسە', 'warn');
      return;
    }
    updateBranchStockItem(editingPriceItem.productId, { retailPricePerKg: val });
    showToast(`نرخی ${editingPriceItem.productName} نوێکرایەوە`, 'success');
    setEditingPriceItem(null);
  };

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchSearch = p.nameKu.toLowerCase().includes(searchFilter.toLowerCase()) || p.code.includes(searchFilter);
    return matchCat && matchSearch;
  });

  const totalCashSales = posSales.filter(s => s.paymentType === 'CASH').reduce((sum, s) => sum + s.total, 0);
  const totalAllSales = posSales.reduce((sum, s) => sum + s.total, 0);
  const totalBranchExpenses = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netCashInDrawer = totalCashSales - totalBranchExpenses;

  return (
    <div className="space-y-5">
      {/* Apple Floating Toast Pill */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-full shadow-lg border apple-glass apple-sheet flex items-center gap-2.5 text-xs font-bold ${
            toastMessage.type === 'success'
              ? 'border-[#34C759]/30 text-[#1D1D1F]'
              : toastMessage.type === 'warn'
              ? 'border-[#FF9500]/40 text-[#B25000]'
              : 'border-[#0071E3]/30 text-[#0071E3]'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toastMessage.type === 'success'
                ? 'bg-[#34C759]'
                : toastMessage.type === 'warn'
                ? 'bg-[#FF9500]'
                : 'bg-[#0071E3]'
            }`}
          />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* APPLE HEADER & SEGMENTED CONTROL */}
      <div className="apple-card p-4 md:p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center shadow-sm shadow-[#0071E3]/30 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
                فرۆشگای تایبەت (شۆرۆم - POS)
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#34C759]/12 text-[#248A3D]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#34C759] animate-pulse" />
                بارکۆد و تەرازوو ئامادەیە
              </span>
            </div>
            <p className="text-xs text-[#86868B] mt-0.5">
              کاشێری ڕاستەوخۆ بە سکانەر، داخلکردنی کۆگا بە بارکۆد، وەسڵی 80mm و ژمێرەری سەندوق
            </p>
          </div>
        </div>

        {/* Apple Segmented Control */}
        <div className="apple-segmented overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveSubTab('REGISTER')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'REGISTER' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>کاشێر و فرۆشتن</span>
          </button>

          <button
            onClick={() => setActiveSubTab('BRANCH_RETURNS')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'BRANCH_RETURNS' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#FF3B30]" />
            <span>گەڕاوەی ٣ ڕۆژی شۆرۆم</span>
          </button>

          <button
            onClick={() => setActiveSubTab('INVENTORY')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'INVENTORY' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-[#34C759]" />
            <span>کۆگای شۆرۆم ({branchStock.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('REGISTER_REPORT')}
            className={`apple-segment-btn flex items-center gap-1.5 ${
              activeSubTab === 'REGISTER_REPORT' ? 'apple-segment-btn-active' : ''
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#FF9500]" />
            <span>مێژوو، سەندوق و خەرجی ({posSales.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: APPLE POS REGISTER (فرۆشتنی خێرا بە بارکۆد و تاچ) */}
      {/* ========================================================================= */}
      {activeSubTab === 'REGISTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* RIGHT/MAIN SIDE (7 cols): SCANNER + TOUCH GRID */}
          <div className="lg:col-span-7 space-y-4">
            {/* Apple Frosted Barcode Input Card */}
            <div className="apple-card p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-[#1D1D1F]">
                  <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                  <span>سکانەری بارکۆد کارایە (USB / Wireless)</span>
                </div>
                <span className="text-[11px] font-mono text-[#86868B]">EAN-13 Scale & Direct Code</span>
              </div>

              <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
                <Barcode className="w-5 h-5 text-[#0071E3] absolute right-3.5 pointer-events-none" />
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={scannerInput}
                  onChange={e => setScannerInput(e.target.value)}
                  placeholder="سکانەر لێرە لێبدە یان بارکۆد بنووسە و Enter داگرە..."
                  className="apple-input w-full pr-11 pl-24 py-3 text-sm font-mono font-bold tabular-nums"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute left-1.5 px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold rounded-xl text-xs transition-all active:scale-95"
                >
                  تۆمارکردن
                </button>
              </form>

              {/* Quick Test Scale Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-[#86868B] font-medium ml-1">تاقیکردنەوەی خێرای بارکۆد:</span>
                <button
                  type="button"
                  onClick={() => {
                    addItemToCart(products[0], 1.85, 3500, '2100101018503');
                    playPosBeep('scale');
                    showToast('سکان: مریشکی تەواو (1.850 کگم)', 'success');
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-mono font-medium transition-colors"
                >
                  مریشک • 1.85 کگم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = products.find(p => p.id === 'prod-2') || products[1];
                    addItemToCart(prod, 1.25, 6500, '2100102012508');
                    playPosBeep('scale');
                    showToast('سکان: سنگی بێ ئێسک (1.250 کگم)', 'success');
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-mono font-medium transition-colors"
                >
                  سنگ • 1.25 کگم
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = products.find(p => p.id === 'prod-3') || products[2];
                    addItemToCart(prod, 2.0, 4200, '2100103020005');
                    playPosBeep('scale');
                    showToast('سکان: ڕانی مریشک (2.000 کگم)', 'success');
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-mono font-medium transition-colors"
                >
                  ڕان • 2.00 کگم
                </button>
              </div>
            </div>

            {/* Category Pills + Touch Grid */}
            <div className="apple-card p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {[
                    { id: 'ALL', name: 'هەموو' },
                    { id: 'WHOLE_CHICKEN', name: 'مریشکی تەواو' },
                    { id: 'BREAST', name: 'سنگ' },
                    { id: 'THIGH', name: 'ڕان' },
                    { id: 'WINGS', name: 'باڵ و مل' },
                    { id: 'GIBLET', name: 'جگەر و قەسیل' },
                    { id: 'BONES_SCRAP', name: 'ئێسک' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        activeCategory === cat.id
                          ? 'bg-[#1D1D1F] text-white shadow-xs'
                          : 'bg-[#F5F5F7] text-[#515154] hover:bg-[#E8E8ED]'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-44 shrink-0">
                  <Search className="w-3.5 h-3.5 text-[#86868B] absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="گەڕان..."
                    className="apple-input w-full pr-8 pl-3 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Product Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map(product => {
                  const branchItem = branchStock.find(b => b.productId === product.id);
                  const inStock = branchItem ? branchItem.inStockKg : product.inStockKg;
                  const price = branchItem ? branchItem.retailPricePerKg : product.pricePerKg;

                  return (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => {
                        setWeightModalProduct(product);
                        setWeightKeypadValue('1.000');
                        playPosBeep('scale');
                      }}
                      className="text-right p-3.5 rounded-2xl bg-[#F5F5F7]/70 hover:bg-white border border-black/[0.05] hover:border-[#0071E3]/40 hover:shadow-md transition-all active:scale-[0.98] flex flex-col justify-between min-h-[108px] group"
                    >
                      <div className="w-full space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#515154] border border-black/[0.05]">
                            #{product.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
                              inStock > 20
                                ? 'bg-[#34C759]/12 text-[#248A3D]'
                                : inStock > 0
                                ? 'bg-[#FF9500]/12 text-[#B25000]'
                                : 'bg-[#FF3B30]/12 text-[#D70015]'
                            }`}
                          >
                            {inStock.toFixed(1)} کگم
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors line-clamp-2">
                          {product.nameKu}
                        </h4>
                      </div>

                      <div className="w-full flex items-center justify-between pt-2 mt-2 border-t border-black/[0.05]">
                        <span className="text-xs font-extrabold text-[#0071E3] tabular-nums">
                          {price.toLocaleString()} <span className="text-[10px] font-medium text-[#86868B]">د.ع</span>
                        </span>
                        <span className="w-6 h-6 rounded-full bg-white group-hover:bg-[#0071E3] text-[#86868B] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                          <Scale className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* LEFT SIDE (5 cols): APPLE CART & CHECKOUT */}
          <div className="lg:col-span-5">
            <div className="apple-card p-5 flex flex-col justify-between min-h-[560px]">
              {/* Cart Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-[#0071E3] text-white font-bold text-xs flex items-center justify-center tabular-nums">
                      {cart.length}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1D1D1F]">سەبەتەی فرۆشتن</h3>
                      <p className="text-[10px] text-[#86868B]">کاشێر: {currentUser?.name}</p>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="px-2.5 py-1 rounded-full text-[#FF3B30] hover:bg-[#FF3B30]/10 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      پاککردنەوە
                    </button>
                  )}
                </div>

                {/* Cart Items */}
                <div className="divide-y divide-black/[0.05] max-h-[250px] overflow-y-auto my-2">
                  {cart.length === 0 ? (
                    <div className="py-14 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-[#F5F5F7] text-[#86868B] flex items-center justify-center mx-auto">
                        <Barcode className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-xs text-[#1D1D1F]">سەبەتە بەتاڵە</p>
                      <p className="text-[11px] text-[#86868B]">بارکۆد سکان بکە یان بەرهەم هەڵبژێرە</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-2 group">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-[#1D1D1F] truncate">{item.productName}</h5>
                          <div className="text-[10px] text-[#86868B] tabular-nums">
                            {item.pricePerKg.toLocaleString()} د.ع / کگم
                          </div>
                        </div>

                        {/* Apple Pill Stepper */}
                        <div className="flex items-center gap-1 bg-[#F5F5F7] p-0.5 rounded-full border border-black/[0.04]">
                          <button
                            onClick={() => updateCartItemWeight(idx, -0.25)}
                            className="w-6 h-6 rounded-full bg-white text-[#1D1D1F] font-bold text-xs flex items-center justify-center hover:bg-[#FF3B30] hover:text-white transition-colors shadow-2xs"
                          >
                            -
                          </button>
                          <span className="w-14 text-center font-bold text-xs tabular-nums text-[#1D1D1F]">
                            {item.weightKg.toFixed(3)}
                          </span>
                          <button
                            onClick={() => updateCartItemWeight(idx, 0.25)}
                            className="w-6 h-6 rounded-full bg-white text-[#1D1D1F] font-bold text-xs flex items-center justify-center hover:bg-[#34C759] hover:text-white transition-colors shadow-2xs"
                          >
                            +
                          </button>
                        </div>

                        <div className="text-left w-20 font-extrabold text-xs text-[#0071E3] tabular-nums">
                          {item.total.toLocaleString()} د.ع
                        </div>

                        <button
                          onClick={() => removeCartItem(idx)}
                          className="text-[#86868B] hover:text-[#FF3B30] p-1 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Summary & Payment Controls */}
              <div className="pt-3 border-t border-black/[0.06] space-y-3">
                {/* Customer & Discount */}
                {paymentType === 'DEBT' && (
                  <div className="p-2.5 rounded-2xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-[#D70015] font-bold">
                      <Users className="w-3.5 h-3.5" />
                      <span>هەڵبژاردنی کڕیاری قەرز (ئەم بڕە دەچێتە سەر کەشف حسابی کڕیار):</span>
                    </div>
                    <select
                      value={selectedDebtCustomerId}
                      onChange={e => {
                        const cid = e.target.value;
                        setSelectedDebtCustomerId(cid);
                        const found = customers.find(c => c.id === cid);
                        if (found) setCustomerNameInput(found.name);
                      }}
                      className="apple-input bg-white w-full px-3 py-1.5 text-xs font-bold"
                    >
                      <option value="">-- کڕیارێکی نوێ بنووسە یان هەڵبژێرە --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} (قەرز: {c.currentDebt.toLocaleString()} د.ع)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={customerNameInput}
                    onChange={e => {
                      setCustomerNameInput(e.target.value);
                      if (selectedDebtCustomerId) setSelectedDebtCustomerId('');
                    }}
                    placeholder={paymentType === 'DEBT' ? 'ناوی کڕیاری قەرز...' : 'ناوی کڕیار...'}
                    className="apple-input px-3 py-1.5 text-xs font-medium"
                  />
                  <div className="flex items-center gap-1 bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-2">
                    <Percent className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />
                    <input
                      type="number"
                      placeholder="داشکاندن د.ع"
                      value={discountAmount || ''}
                      onChange={e => {
                        setDiscountAmount(parseFloat(e.target.value) || 0);
                        setDiscountPercent(0);
                      }}
                      className="bg-transparent w-full py-1.5 text-xs font-semibold outline-none tabular-nums"
                    />
                    {[5, 10].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setDiscountPercent(discountPercent === pct ? 0 : pct);
                          setDiscountAmount(0);
                        }}
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
                          discountPercent === pct
                            ? 'bg-[#FF9500] text-white'
                            : 'bg-white text-[#515154]'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Net Payable Apple Surface */}
                <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold text-[#86868B] flex items-center gap-2">
                      <span>کۆی گشتی بۆ دان</span>
                      {calculatedDiscount > 0 && (
                        <span className="text-[#FF9500] font-bold">(-{calculatedDiscount.toLocaleString()})</span>
                      )}
                    </div>
                    <div className="text-2xl font-black text-[#1D1D1F] tabular-nums tracking-tight">
                      {netTotal.toLocaleString()} <span className="text-xs font-semibold text-[#86868B]">د.ع</span>
                    </div>
                  </div>

                  {/* Apple Payment Segmented Control */}
                  <div className="apple-segmented">
                    <button
                      type="button"
                      onClick={() => setPaymentType('CASH')}
                      className={`apple-segment-btn !px-2.5 !py-1.5 text-[11px] flex items-center gap-1 ${
                        paymentType === 'CASH' ? 'apple-segment-btn-active !text-[#248A3D]' : ''
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      نەقد
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('FIB_OR_CARD')}
                      className={`apple-segment-btn !px-2.5 !py-1.5 text-[11px] flex items-center gap-1 ${
                        paymentType === 'FIB_OR_CARD' ? 'apple-segment-btn-active !text-[#0071E3]' : ''
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      کارت
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('DEBT')}
                      className={`apple-segment-btn !px-2.5 !py-1.5 text-[11px] ${
                        paymentType === 'DEBT' ? 'apple-segment-btn-active !text-[#D70015]' : ''
                      }`}
                    >
                      قەرز
                    </button>
                  </div>
                </div>

                {/* Cash Paid & Change Return */}
                {paymentType === 'CASH' && (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-[#34C759]/8 border border-[#34C759]/20 text-xs">
                    <div>
                      <span className="text-[#515154] font-semibold block mb-1">پارەی وەرگیراو:</span>
                      <input
                        type="number"
                        value={cashGiven}
                        onChange={e => setCashGiven(e.target.value)}
                        placeholder={netTotal > 0 ? netTotal.toString() : '25000'}
                        className="w-full px-3 py-1.5 bg-white border border-black/[0.08] rounded-xl font-bold text-sm text-[#1D1D1F] tabular-nums outline-none focus:border-[#34C759]"
                      />
                    </div>
                    <div>
                      <span className="text-[#515154] font-semibold block mb-1">پارەی گەڕاوە (باقی):</span>
                      <div className="font-extrabold text-base text-[#248A3D] tabular-nums py-1">
                        {changeDue > 0 ? `${changeDue.toLocaleString()} د.ع` : '٠ د.ع'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Complete Sale Apple Pill Button */}
                <button
                  type="button"
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 rounded-2xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-sm shadow-sm shadow-[#0071E3]/30 active:scale-[0.985] transition-all disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>تەواوکردن و چاپکردنی وەسڵ (80mm)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WAREHOUSE INBOUND BY BARCODE (داخلکردنی کۆگا بە سکانەری بارکۆد) */}
      {/* ========================================================================= */}
      {/* TAB 2: SHOWROOM 3-DAY UNSOLD RETURNS (گەڕاوەی ٣ ڕۆژی شۆرۆم بۆ ئامادە) */}
      {/* ========================================================================= */}
      {activeSubTab === 'BRANCH_RETURNS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Return Registration Form Card */}
          <div className="lg:col-span-5 apple-card p-5 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-black/[0.06]">
              <div className="w-10 h-10 rounded-2xl bg-[#FF3B30]/12 text-[#FF3B30] flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-[#1D1D1F]">تۆمارکردنی گەڕاوەی ٣ ڕۆژی ناو شۆرۆم</h3>
                <p className="text-[11px] text-[#86868B]">ئەو بەرهەمانەی لە ماوەی ٣ ڕۆژدا لە شۆرۆم نەفرۆشراون و دەگەڕێنرێنەوە بۆ کۆگای ئامادە بۆ گۆڕینی شێواز</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-[#515154] block mb-1">ژمارەی وەسڵی گەڕاوە:</label>
                <input
                  type="text"
                  value={returnReceiptNo}
                  onChange={e => setReturnReceiptNo(e.target.value)}
                  className="apple-input w-full px-3 py-2 font-mono font-bold text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-[#515154] block mb-1">بەروار:</label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={e => setReturnDate(e.target.value)}
                  className="apple-input w-full px-3 py-2 font-medium text-xs"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="font-semibold text-[#515154] block mb-1">هۆکاری گەڕاندنەوە:</label>
              <select
                value={returnReason}
                onChange={e => setReturnReason(e.target.value as 'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED')}
                className="apple-input w-full px-3 py-2 font-bold text-xs"
              >
                <option value="EXPIRED_3_DAYS">ماوەی ٣ ڕۆژی فرۆشتنی تێپەڕیوە (گەڕاوەی فرێش)</option>
                <option value="DAMAGED">تێکچوونی کیسە یان بار</option>
                <option value="SPOILED">تێکچوون</option>
              </select>
            </div>

            {/* Item Selection from Showroom Stock */}
            <div className="p-3.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] space-y-3 text-xs">
              <div>
                <label className="font-semibold text-[#515154] block mb-1">بەرهەم لە کۆگای شۆرۆم:</label>
                <select
                  value={returnSelectedProdId}
                  onChange={e => setReturnSelectedProdId(e.target.value)}
                  className="apple-input bg-white w-full px-3 py-2 font-bold text-xs"
                >
                  {branchStock.map(s => (
                    <option key={s.productId} value={s.productId}>
                      {s.productName} (بەردەست لە شۆرۆم: {s.inStockKg.toFixed(1)} کگم)
                    </option>
                  ))}
                  {branchStock.length === 0 &&
                    products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameKu} (#{p.code})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-[#515154] block mb-1">کێشی گەڕاوە (کگم):</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="نموونە: 12.5"
                  value={returnWeightInput}
                  onChange={e => setReturnWeightInput(e.target.value)}
                  className="apple-input bg-white w-full px-3 py-2 font-extrabold text-sm text-[#FF3B30] tabular-nums"
                />
              </div>

              <div>
                <label className="font-semibold text-[#515154] block mb-1">تێبینی:</label>
                <input
                  type="text"
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                  className="apple-input bg-white w-full px-3 py-2 text-xs"
                />
              </div>

              <button
                type="button"
                onClick={addStagedReturnItem}
                className="w-full py-2.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.985]"
              >
                <Plus className="w-4 h-4" />
                زیادکردن بۆ لیستی گەڕاوە
              </button>
            </div>
          </div>

          {/* Staging List & History */}
          <div className="lg:col-span-7 space-y-4">
            <div className="apple-card p-5 flex flex-col justify-between min-h-[340px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FF3B30]/12 text-[#FF3B30] font-bold flex items-center justify-center text-xs tabular-nums">
                      {returnStagingList.length}
                    </span>
                    <h4 className="font-extrabold text-sm text-[#1D1D1F]">لیستی کاڵای گەڕاوەی شۆرۆم</h4>
                  </div>
                  <span className="text-xs font-mono text-[#86868B]">وەسڵ: {returnReceiptNo}</span>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-black/[0.06] text-[#86868B] font-semibold">
                        <th className="py-2">بەرهەم</th>
                        <th className="py-2 text-center">کێش (کگم)</th>
                        <th className="py-2 text-center">بەهای تێچوو</th>
                        <th className="py-2 text-left">هۆکار</th>
                        <th className="py-2 text-center">لابردن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.04]">
                      {returnStagingList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-[#86868B]">
                            هێشتا هیچ کاڵایەکی گەڕاوە زیاد نەکراوە.
                          </td>
                        </tr>
                      ) : (
                        returnStagingList.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 font-bold text-[#1D1D1F]">{item.productName}</td>
                            <td className="py-2.5 text-center font-bold text-[#FF3B30] tabular-nums">
                              {item.weightKg.toFixed(2)} کگم
                            </td>
                            <td className="py-2.5 text-center tabular-nums text-[#515154]">
                              {item.totalLoss.toLocaleString()} د.ع
                            </td>
                            <td className="py-2.5 text-left text-[11px] font-semibold text-[#515154]">
                              {item.reason === 'EXPIRED_3_DAYS' ? 'تێپەڕینی ٣ ڕۆژ' : item.reason === 'DAMAGED' ? 'تێکچوونی کیسە' : 'تێکچوو'}
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => removeStagedReturnItem(idx)}
                                className="text-[#86868B] hover:text-[#FF3B30] p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {returnStagingList.length > 0 && (
                <div className="pt-4 border-t border-black/[0.06] space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F5F5F7] text-xs font-bold">
                    <span className="text-[#515154]">کۆی کێشی گەڕاوە:</span>
                    <span className="text-sm font-extrabold text-[#FF3B30] tabular-nums">
                      {returnStagingList.reduce((sum, item) => sum + item.weightKg, 0).toFixed(2)} کگم
                    </span>
                    <span className="text-[#515154]">بەهای تێچوو:</span>
                    <span className="text-sm font-extrabold text-[#1D1D1F] tabular-nums">
                      {returnStagingList.reduce((sum, item) => sum + item.totalLoss, 0).toLocaleString()} د.ع
                    </span>
                  </div>

                  <button
                    onClick={commitShowroomReturn}
                    className="w-full py-3.5 rounded-2xl bg-[#FF3B30] hover:bg-[#E0352B] text-white font-bold text-sm shadow-sm active:scale-[0.985] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>تۆمارکردن و ناردنەوە بۆ ئامادە بۆ گۆڕینی شێواز</span>
                  </button>
                </div>
              )}
            </div>

            {/* Showroom Return History */}
            <div className="apple-card p-5 space-y-3">
              <h4 className="font-extrabold text-xs text-[#1D1D1F] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#FF3B30]" />
                مێژووی گەڕاوەی ٣ ڕۆژی شۆرۆم ({showroomReturns.length})
              </h4>
              <div className="divide-y divide-black/[0.05] max-h-56 overflow-y-auto">
                {showroomReturns.length === 0 ? (
                  <p className="text-xs text-[#86868B] py-4 text-center">هیچ گەڕاوەیەکی شۆرۆم تۆمار نەکراوە</p>
                ) : (
                  showroomReturns.map(ret => (
                    <div key={ret.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#1D1D1F] flex items-center gap-2">
                          <span className="font-mono text-[#FF3B30]">#{ret.manualReceiptNo}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ret.conversionStatus === 'CONVERTED'
                                ? 'bg-[#34C759]/12 text-[#248A3D]'
                                : 'bg-[#FF9500]/12 text-[#C93400]'
                            }`}
                          >
                            {ret.conversionStatus === 'CONVERTED' ? 'گۆڕدراوە بۆ شێوازی نوێ' : 'چاوەڕێی گۆڕین لە ئامادە'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#86868B]">
                          {ret.date} {ret.time} • {ret.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                        </span>
                      </div>
                      <span className="font-extrabold text-[#FF3B30] tabular-nums">
                        {ret.totalWeightKg.toFixed(1)} کگم
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STORE INVENTORY (کۆگای شۆرۆم) */}
      {/* ========================================================================= */}
      {activeSubTab === 'INVENTORY' && (
        <div className="apple-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
            <div>
              <h3 className="font-extrabold text-base text-[#1D1D1F] flex items-center gap-2">
                <Boxes className="w-5 h-5 text-[#34C759]" />
                کۆگای سەربەخۆی فرۆشگا
              </h3>
              <p className="text-xs text-[#86868B]">ئاستی کێشی ماوە و نرخی فرۆشتن بە کڕیاری شۆرۆم</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#F5F5F7] text-[#515154] font-semibold">
                  <th className="p-3.5 rounded-r-xl">بەرهەم</th>
                  <th className="p-3.5">کۆد / بارکۆد</th>
                  <th className="p-3.5 text-center">کێشی ماوە</th>
                  <th className="p-3.5 text-center">ئاستی ئاگاداری</th>
                  <th className="p-3.5 text-center">نرخی فرۆشتن</th>
                  <th className="p-3.5 text-center">تێچووی کارگە</th>
                  <th className="p-3.5 text-center">دۆخ</th>
                  <th className="p-3.5 text-center rounded-l-xl">دەستکاری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {branchStock.map(item => {
                  const isLow = item.inStockKg <= item.minAlertKg;
                  const isOut = item.inStockKg <= 0;

                  return (
                    <tr key={item.productId} className="hover:bg-[#F5F5F7]/60 transition-colors">
                      <td className="p-3.5 font-bold text-[#1D1D1F]">{item.productName}</td>
                      <td className="p-3.5 font-mono text-[#86868B]">
                        {item.code} ({item.barcode || '2100' + item.code})
                      </td>
                      <td className="p-3.5 text-center font-extrabold text-[#0071E3] tabular-nums">
                        {item.inStockKg.toFixed(2)} کگم
                      </td>
                      <td className="p-3.5 text-center text-[#86868B] tabular-nums">{item.minAlertKg} کگم</td>
                      <td className="p-3.5 text-center font-bold text-[#248A3D] tabular-nums">
                        {item.retailPricePerKg.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center text-[#515154] tabular-nums">
                        {item.factoryCostPerKg.toLocaleString()} د.ع
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isOut
                              ? 'bg-[#FF3B30]/12 text-[#D70015]'
                              : isLow
                              ? 'bg-[#FF9500]/12 text-[#B25000]'
                              : 'bg-[#34C759]/12 text-[#248A3D]'
                          }`}
                        >
                          {isOut ? 'نەماوە' : isLow ? 'کەمە' : 'تەواوە'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setEditingPriceItem(item);
                            setNewPriceInput(item.retailPricePerKg.toString());
                          }}
                          className="px-3 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#0071E3] hover:text-white text-[#1D1D1F] font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3 h-3" />
                          نرخ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REGISTER REPORT, RECEIPTS & EXPENSES */}
      {/* ========================================================================= */}
      {activeSubTab === 'REGISTER_REPORT' && (
        <div className="space-y-5">
          {/* Apple Bento KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="apple-card p-4">
              <span className="text-[11px] font-semibold text-[#86868B] block">کۆی فرۆشی پۆس</span>
              <div className="text-2xl font-black text-[#0071E3] tabular-nums mt-1">
                {totalAllSales.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
              </div>
            </div>

            <div className="apple-card p-4">
              <span className="text-[11px] font-semibold text-[#86868B] block">نەقدی وەرگیراو</span>
              <div className="text-2xl font-black text-[#248A3D] tabular-nums mt-1">
                {totalCashSales.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
              </div>
            </div>

            <div className="apple-card p-4">
              <span className="text-[11px] font-semibold text-[#86868B] block">خەرجی شۆرۆم</span>
              <div className="text-2xl font-black text-[#FF3B30] tabular-nums mt-1">
                {totalBranchExpenses.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
              </div>
            </div>

            <div className="apple-card p-4">
              <span className="text-[11px] font-semibold text-[#86868B] block">سافی ناو سەندوق</span>
              <div className="text-2xl font-black text-[#1D1D1F] tabular-nums mt-1">
                {netCashInDrawer.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* POS Sales Receipts History */}
            <div className="lg:col-span-7 apple-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <h4 className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#0071E3]" />
                  مێژووی وەسڵەکانی فرۆشگا
                </h4>
                <span className="text-xs font-bold text-[#86868B] tabular-nums">{posSales.length} وەسڵ</span>
              </div>

              <div className="divide-y divide-black/[0.05] max-h-[380px] overflow-y-auto">
                {posSales.map(sale => (
                  <div key={sale.id} className="py-3 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0071E3]">{sale.saleNo}</span>
                        <span className="font-bold text-[#1D1D1F]">{sale.customerName || 'کڕیاری ئاسایی'}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sale.paymentType === 'CASH'
                              ? 'bg-[#34C759]/12 text-[#248A3D]'
                              : sale.paymentType === 'FIB_OR_CARD'
                              ? 'bg-[#0071E3]/12 text-[#0071E3]'
                              : 'bg-[#FF3B30]/12 text-[#D70015]'
                          }`}
                        >
                          {sale.paymentType === 'CASH' ? 'نەقد' : sale.paymentType === 'FIB_OR_CARD' ? 'کارت' : 'قەرز'}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#86868B]">
                        {sale.date} {sale.time} • کاشێر: {sale.cashierName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-[#1D1D1F] tabular-nums">
                        {sale.total.toLocaleString()} د.ع
                      </span>
                      <button
                        onClick={() => setPrintReceipt(sale)}
                        className="px-3 py-1 rounded-full bg-[#F5F5F7] hover:bg-[#0071E3] hover:text-white text-[#1D1D1F] font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        چاپ
                      </button>
                      {hasAccess('settings') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`وەسڵی شۆرۆم #${sale.saleNo} بخرێتە سەبەتەی سۆفت دیلیت و کۆگا/قەرز بگەڕێندرێتەوە؟`)) {
                              softDeleteRecord('POS_SALE', sale.id, 'سڕینەوەی خێرا لە سندوقی شۆرۆم');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white transition-colors"
                          title="سۆفت دیلیت"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Store Expenses */}
            <div className="lg:col-span-5 apple-card p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
                <h4 className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF3B30]" />
                  خەرجییەکانی شۆرۆم
                </h4>
                <button
                  onClick={() => setShowAddExpenseModal(true)}
                  className="px-3 py-1.5 rounded-full bg-[#FF3B30] hover:bg-[#E0352B] text-white font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  خەرجی نوێ
                </button>
              </div>

              <div className="divide-y divide-black/[0.05] max-h-[380px] overflow-y-auto">
                {branchExpenses.map(exp => (
                  <div key={exp.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#1D1D1F]">{exp.title}</div>
                      <span className="text-[10px] text-[#86868B]">
                        {exp.date} {exp.time}
                      </span>
                    </div>
                    <span className="font-extrabold text-[#FF3B30] tabular-nums">
                      -{exp.amount.toLocaleString()} د.ع
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPLE NUMERIC SCALE KEYPAD */}
      {/* ========================================================================= */}
      {weightModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-5 shadow-2xl border border-black/[0.08] space-y-4 apple-sheet">
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <div>
                <h3 className="font-extrabold text-sm text-[#1D1D1F]">{weightModalProduct.nameKu}</h3>
                <span className="text-xs text-[#86868B] tabular-nums">
                  {(branchStock.find(b => b.productId === weightModalProduct.id)?.retailPricePerKg || weightModalProduct.pricePerKg).toLocaleString()} د.ع / کگم
                </span>
              </div>
              <button
                onClick={() => setWeightModalProduct(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#F5F5F7] text-center space-y-1">
              <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider">کێشی تەرازوو</span>
              <div className="text-4xl font-black text-[#1D1D1F] tabular-nums">
                {parseFloat(weightKeypadValue || '0').toFixed(3)}{' '}
                <span className="text-sm font-semibold text-[#86868B]">کگم</span>
              </div>
              <div className="text-xs font-bold text-[#0071E3] tabular-nums">
                کۆ: {Math.round((parseFloat(weightKeypadValue || '0') || 0) * (branchStock.find(b => b.productId === weightModalProduct.id)?.retailPricePerKg || weightModalProduct.pricePerKg)).toLocaleString()} د.ع
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {['0.500', '1.000', '1.500', '2.000'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWeightKeypadValue(val)}
                  className="py-1.5 bg-[#F5F5F7] hover:bg-[#0071E3] hover:text-white text-[#1D1D1F] font-bold text-xs rounded-full tabular-nums transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map(char => (
                <button
                  key={char}
                  type="button"
                  onClick={() => {
                    if (char === 'C') {
                      setWeightKeypadValue('0');
                    } else if (char === '.') {
                      if (!weightKeypadValue.includes('.')) setWeightKeypadValue(prev => prev + '.');
                    } else {
                      setWeightKeypadValue(prev => (prev === '0' || prev === '1.000' ? char : prev + char));
                    }
                  }}
                  className="py-3 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-bold text-lg rounded-2xl tabular-nums transition-colors active:scale-95"
                >
                  {char}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                const w = parseFloat(weightKeypadValue);
                if (w > 0) {
                  const branchItem = branchStock.find(b => b.productId === weightModalProduct.id);
                  const price = branchItem ? branchItem.retailPricePerKg : weightModalProduct.pricePerKg;
                  addItemToCart(weightModalProduct, w, price);
                  playPosBeep('scale');
                  showToast(`${weightModalProduct.nameKu} (${w.toFixed(3)} کگم) زیادکرا`, 'success');
                  setWeightModalProduct(null);
                }
              }}
              className="w-full py-3.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-sm rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.985]"
            >
              <Check className="w-4 h-4" />
              <span>خستنە ناو سەبەتە</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 80MM THERMAL RECEIPT SHEET */}
      {/* ========================================================================= */}
      {printReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-md">
          <div className="w-full max-w-sm bg-white rounded-[28px] p-5 shadow-2xl border border-black/[0.08] space-y-4 max-h-[90vh] overflow-y-auto apple-sheet">
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] no-print">
              <span className="text-xs font-bold text-[#86868B]">وەسڵی گەرمی 80mm</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[#0071E3] text-white rounded-full text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  چاپکردن
                </button>
                <button
                  onClick={() => setPrintReceipt(null)}
                  className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-[#F5F5F7] rounded-2xl text-center space-y-3 font-mono">
              <div className="flex flex-col items-center gap-1.5">
                <FactoryLogo size="lg" />
                <h2 className="font-black text-base text-[#1D1D1F] font-sans">
                  {factorySettings.factoryName}
                </h2>
                <p className="text-[11px] font-sans font-bold text-[#0071E3]">
                  {factorySettings.shortCode} • {factorySettings.showroomName}
                </p>
                <p className="text-[10px] font-sans text-[#515154]">
                  {factorySettings.address} • {factorySettings.phone1}
                </p>
              </div>

              <div className="border-t border-b border-dashed border-black/20 py-2 text-right text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-[#86868B]">وەسڵ:</span>
                  <span className="font-bold text-[#1D1D1F]">{printReceipt.saleNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">بەروار:</span>
                  <span>{printReceipt.date} {printReceipt.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">کڕیار:</span>
                  <span className="font-sans font-bold">{printReceipt.customerName || 'کڕیاری ئاسایی'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#86868B]">کاشێر:</span>
                  <span className="font-sans">{printReceipt.cashierName}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-right text-[11px]">
                {printReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-black/[0.05]">
                    <div>
                      <div className="font-sans font-bold text-[#1D1D1F]">{item.productName}</div>
                      <div className="text-[10px] text-[#86868B]">
                        {item.weightKg.toFixed(3)} کگم × {item.pricePerKg.toLocaleString()} د.ع
                      </div>
                    </div>
                    <div className="font-bold text-[#1D1D1F]">{item.total.toLocaleString()} د.ع</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-black/20 pt-2 text-right text-xs space-y-1">
                <div className="flex justify-between text-[#515154]">
                  <span>کۆی بڕ:</span>
                  <span>{printReceipt.subtotal.toLocaleString()} د.ع</span>
                </div>
                {printReceipt.discount > 0 && (
                  <div className="flex justify-between text-[#FF9500] font-bold">
                    <span>داشکاندن:</span>
                    <span>-{printReceipt.discount.toLocaleString()} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-[#1D1D1F] pt-1">
                  <span>کۆی گشتی:</span>
                  <span className="text-[#0071E3]">{printReceipt.total.toLocaleString()} د.ع</span>
                </div>
                {printReceipt.paymentType === 'CASH' && (
                  <>
                    <div className="flex justify-between text-[11px] text-[#86868B]">
                      <span>پارەی دراو:</span>
                      <span>{(printReceipt.paidAmount || printReceipt.total).toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#248A3D] font-bold">
                      <span>پارەی گەڕاوە:</span>
                      <span>{(printReceipt.changeAmount || 0).toLocaleString()} د.ع</span>
                    </div>
                  </>
                )}
              </div>

              <div className="pt-2">
                <BarcodeSVG code={printReceipt.saleNo.replace(/[^0-9]/g, '') || '1001001'} width={220} height={40} />
              </div>

              <p className="text-[10px] text-[#86868B] font-sans">
                {factorySettings.receiptFooter || 'سوپاس بۆ سەردانەکەتان'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPLE PRICE EDIT SHEET */}
      {/* ========================================================================= */}
      {editingPriceItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <form
            onSubmit={handleSavePriceEdit}
            className="w-full max-w-sm bg-white rounded-[28px] p-5 shadow-2xl border border-black/[0.08] space-y-4 apple-sheet"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="font-extrabold text-sm text-[#1D1D1F]">گۆڕینی نرخی فرۆشتن</h3>
              <button
                type="button"
                onClick={() => setEditingPriceItem(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="font-bold text-[#1D1D1F]">{editingPriceItem.productName}</div>
              <label className="text-[#86868B] block">نرخی نوێ بۆ یەک کیلۆ (د.ع):</label>
              <input
                type="number"
                value={newPriceInput}
                onChange={e => setNewPriceInput(e.target.value)}
                className="apple-input w-full px-3.5 py-2.5 font-extrabold text-base text-[#0071E3] tabular-nums"
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-2xl transition-all"
            >
              پاشەکەوتکردنی نرخ
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD STORE EXPENSE SHEET */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <form
            onSubmit={handleAddExpense}
            className="w-full max-w-md bg-white rounded-[28px] p-5 shadow-2xl border border-black/[0.08] space-y-4 apple-sheet"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06]">
              <h3 className="font-extrabold text-sm text-[#1D1D1F]">تۆمارکردنی خەرجی شۆرۆم</h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="font-semibold text-[#515154] block mb-1">ناوی خەرجی:</label>
                <input
                  type="text"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  placeholder="نموونە: عەلاگە و پاکەت..."
                  className="apple-input w-full px-3.5 py-2.5 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-[#515154] block mb-1">بڕی پارە (د.ع):</label>
                  <input
                    type="number"
                    value={expAmount}
                    onChange={e => setExpAmount(e.target.value)}
                    placeholder="25000"
                    className="apple-input w-full px-3.5 py-2.5 font-bold text-sm text-[#FF3B30] tabular-nums"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#515154] block mb-1">پۆلێن:</label>
                  <select
                    value={expCategory}
                    onChange={e => setExpCategory(e.target.value as 'RENT' | 'ELECTRICITY' | 'PACKAGING' | 'SALARIES' | 'CLEANING' | 'MAINTENANCE' | 'OTHER')}
                    className="apple-input w-full px-3 py-2.5 font-bold"
                  >
                    <option value="PACKAGING">پاکەت و عەلاگە</option>
                    <option value="ELECTRICITY">کارەبا و بەفر</option>
                    <option value="RENT">کرێی شوێن</option>
                    <option value="SALARIES">مووچە</option>
                    <option value="CLEANING">خاوێنکردنەوە</option>
                    <option value="MAINTENANCE">چاککردنەوە</option>
                    <option value="OTHER">هی تر</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#FF3B30] hover:bg-[#E0352B] text-white font-bold text-xs rounded-2xl transition-all"
            >
              تۆمارکردنی خەرجی
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default POSView;
