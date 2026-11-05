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
  Truck,
  Plus,
  Search,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Tag,
  Calendar,
  Clock,
  ArrowDownToLine,
  X,
  Scale,
  DollarSign,
  Receipt,
  RotateCcw,
  Percent,
  Check,
} from 'lucide-react';
import { POSSaleItem, POSSale, ProductItem, BranchDeliveryItem, BranchStockItem, ProductCategory } from '../../types';

// ==========================================
// AUDIO FEEDBACK HELPER (Web Audio API)
// ==========================================
const playPosBeep = (type: 'success' | 'scale' | 'error' = 'success') => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'scale') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.setValueAtTime(1450, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // AudioContext blocked or unsupported
  }
};

// ==========================================
// SVG BARCODE COMPONENT
// ==========================================
const BarcodeSVG: React.FC<{ code: string; width?: number; height?: number }> = ({ code, width = 180, height = 50 }) => {
  // Generate consistent bar widths based on char codes
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
      <rect width={width} height={height} fill="#ffffff" />
      {bars.map((bar, idx) => (
        <rect key={idx} x={bar.x} y={4} width={Math.max(1, bar.w)} height={height - 18} fill="#111827" />
      ))}
      <text
        x={width / 2}
        y={height - 2}
        textAnchor="middle"
        fontSize="10"
        fontFamily="monospace"
        fill="#374151"
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
    branchDeliveries,
    branchExpenses,
    currentUser,
    addPOSSale,
    addBranchDelivery,
    addBranchExpense,
    updateBranchStockItem,
    parseWeightBarcode,
  } = useApp();

  // Active Main Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'REGISTER' | 'INBOUND' | 'INVENTORY' | 'HISTORY' | 'REGISTER_REPORT'>('REGISTER');

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
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);

  // Digital Scale / Weight Modal for Manual item selection
  const [weightModalProduct, setWeightModalProduct] = useState<ProductItem | null>(null);
  const [weightKeypadValue, setWeightKeypadValue] = useState<string>('1.000');

  // Thermal Print Modal
  const [printReceipt, setPrintReceipt] = useState<POSSale | null>(null);

  // Reference for barcode input focus
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // Auto focus scanner input when in REGISTER tab
  useEffect(() => {
    if (activeSubTab === 'REGISTER' && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [activeSubTab]);

  // Toast auto-clear
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

      // Check stock warning
      const currentStock = branchItem ? branchItem.inStockKg : prod.inStockKg;
      if (currentStock <= 0) {
        showToast(`ئاگاداری: ستۆکی (${prod.nameKu}) تەواو بووە لە عەمبار!`, 'warn');
      }

      // Add to Cart
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
      // If same product and not specific scale barcode, accumulate
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
    if (window.confirm('ئایا دڵنیایت لە بەتاڵکردنەوەی تەواوی سەبەتەکە؟')) {
      setCart([]);
      setDiscountAmount(0);
      setDiscountPercent(0);
      setCashGiven('');
      playPosBeep('scale');
    }
  };

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const calculatedDiscount = discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : discountAmount;
  const netTotal = Math.max(0, subtotal - calculatedDiscount);
  const numericCashGiven = parseFloat(cashGiven) || 0;
  const changeDue = numericCashGiven > netTotal ? numericCashGiven - netTotal : 0;

  // Complete POS Sale
  const handleCompleteSale = () => {
    if (cart.length === 0) {
      alert('تکایە بەرهەم بخەرە ناو سەبەتەی فرۆشتنەوە!');
      return;
    }

    if (paymentType === 'CASH' && numericCashGiven > 0 && numericCashGiven < netTotal) {
      if (!window.confirm('بڕی نەقدی دراو کەمترە لە کۆی پارەی وەسڵەکە! ئایا وەکو قەرز تۆمار دەکرێت؟')) {
        return;
      }
    }

    const sale = addPOSSale({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      subtotal,
      discount: calculatedDiscount,
      total: netTotal,
      paidAmount: paymentType === 'CASH' ? (numericCashGiven > 0 ? numericCashGiven : netTotal) : netTotal,
      changeAmount: changeDue,
      paymentType,
      customerName: customerNameInput.trim() || 'کڕیاری ئاسایی نەقد',
      cashierName: currentUser?.name || 'کاشێری شۆروم',
    });

    playPosBeep('success');
    setPrintReceipt(sale);
    setCart([]);
    setDiscountAmount(0);
    setDiscountPercent(0);
    setCashGiven('');
    showToast(`وەسڵی ${sale.saleNo} بە سەرکەوتوویی تەواو کرا!`, 'success');
  };

  // ==========================================
  // INBOUND WAREHOUSE BY BARCODE STATE
  // ==========================================
  const [inboundBarcode, setInboundBarcode] = useState('');
  const [inboundReceiptNo, setInboundReceiptNo] = useState(`INB-${Math.floor(1000 + Math.random() * 9000)}`);
  const [inboundRepName, setInboundRepName] = useState('مەندوب شوان (گواستنەوەی کارگە)');
  const [inboundStagingList, setInboundStagingList] = useState<BranchDeliveryItem[]>([]);
  const [inboundSelectedProd, setInboundSelectedProd] = useState<ProductItem | null>(products[0] || null);
  const [inboundWeight, setInboundWeight] = useState<string>('50');
  const [inboundFactoryCost, setInboundFactoryCost] = useState<number>(products[0]?.costPerKg || 2800);
  const [inboundDate, setInboundDate] = useState(new Date().toISOString().split('T')[0]);
  const [inboundNotes, setInboundNotes] = useState('داخلکردنی کۆگای فرۆشگا بە سکانەری بارکۆد');

  const handleInboundBarcodeScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = inboundBarcode.trim();
    if (!code) return;

    const res = parseWeightBarcode(code);
    if (res.valid && (res.product || res.branchItem)) {
      const prod = res.product || products.find(p => p.id === res.branchItem?.productId);
      if (prod) {
        setInboundSelectedProd(prod);
        setInboundFactoryCost(prod.costPerKg);
        if (res.weightKg > 0 && code.length === 13) {
          setInboundWeight(res.weightKg.toString());
        }
        playPosBeep('scale');
        showToast(`بەرهەم ناسێنرا: ${prod.nameKu}`, 'success');
        setInboundBarcode('');
      }
    } else {
      playPosBeep('error');
      showToast(`بارکۆدی داخڵکردن نەدۆزرایەوە: ${code}`, 'warn');
      setInboundBarcode('');
    }
  };

  const addStagedInboundItem = () => {
    if (!inboundSelectedProd) return;
    const weight = parseFloat(inboundWeight);
    if (isNaN(weight) || weight <= 0) {
      alert('تکایە کێشێکی دروست بە کیلۆگرام بنووسە!');
      return;
    }

    const totalCost = Math.round(weight * inboundFactoryCost);
    setInboundStagingList(prev => [
      ...prev,
      {
        productId: inboundSelectedProd.id,
        productName: inboundSelectedProd.nameKu,
        weightKg: weight,
        factoryPricePerKg: inboundFactoryCost,
        totalCost,
      },
    ]);

    playPosBeep('success');
    showToast(`زیادکرا بۆ لیستی هاتوو: ${inboundSelectedProd.nameKu} (${weight} کگم)`, 'success');
    setInboundWeight('50');
  };

  const removeStagedInboundItem = (index: number) => {
    setInboundStagingList(prev => prev.filter((_, i) => i !== index));
    playPosBeep('scale');
  };

  const commitInboundToWarehouse = () => {
    if (inboundStagingList.length === 0) {
      alert('تکایە لانیکەم بەرهەمێک داخل بکە پێش تۆمارکردن!');
      return;
    }

    const totalWeightKg = inboundStagingList.reduce((sum, item) => sum + item.weightKg, 0);
    const totalCost = inboundStagingList.reduce((sum, item) => sum + item.totalCost, 0);

    addBranchDelivery({
      manualReceiptNo: inboundReceiptNo.trim() || `INB-${Date.now().toString().slice(-4)}`,
      date: inboundDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      repName: inboundRepName,
      items: [...inboundStagingList],
      totalWeightKg,
      totalCost,
      notes: inboundNotes,
    });

    playPosBeep('success');
    showToast(`کۆی ${totalWeightKg.toFixed(1)} کگم کاڵا بە سەرکەوتوویی خرایە سەر کۆگای فرۆشگا!`, 'success');
    setInboundStagingList([]);
    setInboundReceiptNo(`INB-${Math.floor(1000 + Math.random() * 9000)}`);
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
    if (!expTitle || isNaN(amount) || amount <= 0) {
      alert('تکایە ناوی خەرجی و بڕێکی دروست بنووسە!');
      return;
    }

    addBranchExpense({
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: expTitle,
      category: expCategory,
      amount,
      notes: 'تۆمارکراوی خەرجی شۆروم',
    });

    setExpTitle('');
    setExpAmount('');
    setShowAddExpenseModal(false);
    showToast('خەرجی شۆروم بە سەرکەوتوویی تۆمارکرا', 'success');
  };

  // Filter Products for Register Touch Grid
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'ALL' || p.category === activeCategory;
    const matchSearch = p.nameKu.toLowerCase().includes(searchFilter.toLowerCase()) || p.code.includes(searchFilter);
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md animate-bounce transition-all ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600/95 text-white border-emerald-400'
              : toastMessage.type === 'warn'
              ? 'bg-amber-600/95 text-white border-amber-400'
              : 'bg-blue-600/95 text-white border-blue-400'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-bold text-sm">{toastMessage.text}</span>
        </div>
      )}

      {/* HEADER & MAIN SUB-TABS */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white">فرۆشگای تایبەت (شۆرۆم - POS)</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                سیستەمی بارکۆدی تەرازوو
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              فرۆشتنی ڕاستەوخۆ بە بارکۆد، داخلکردنی کۆگای شۆروم، و ژمێرەری سەندوق
            </p>
          </div>
        </div>

        {/* Sub-Tabs Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('REGISTER')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'REGISTER'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Barcode className="w-4 h-4" />
            فرۆشتنی خێرا (کاشێر)
          </button>

          <button
            onClick={() => setActiveSubTab('INBOUND')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'INBOUND'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            داخلکردنی کۆگا بە بارکۆد
          </button>

          <button
            onClick={() => setActiveSubTab('INVENTORY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'INVENTORY'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Boxes className="w-4 h-4" />
            کۆگای فرۆشگا ({branchStock.length})
          </button>

          <button
            onClick={() => setActiveSubTab('HISTORY')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'HISTORY'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <Receipt className="w-4 h-4" />
            مێژووی وەسڵەکان ({posSales.length})
          </button>

          <button
            onClick={() => setActiveSubTab('REGISTER_REPORT')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'REGISTER_REPORT'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            سەندوق و خەرجی
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POS REGISTER (فرۆشتنی ڕاستەوخۆ بە بارکۆد و تاچ) */}
      {/* ========================================================================= */}
      {activeSubTab === 'REGISTER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* LEFT 7 COLS: BARCODE SCANNER + TOUCH MENU */}
          <div className="lg:col-span-7 space-y-4">
            {/* ULTRA-RESPONSIVE BARCODE SCANNER BOX */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 rounded-3xl shadow-xl relative overflow-hidden border border-emerald-600/40">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-black tracking-wider uppercase text-emerald-200">
                    سکانەری بارکۆد ئامادەیە (Ready to Scan)
                  </span>
                </div>
                <span className="text-xs text-emerald-300/80 font-mono">تەرازووی EAN-13 یان بارکۆدی ئاسایی</span>
              </div>

              <form onSubmit={handleBarcodeSubmit} className="relative flex items-center">
                <input
                  ref={scannerInputRef}
                  type="text"
                  value={scannerInput}
                  onChange={e => setScannerInput(e.target.value)}
                  placeholder="سکانەر لێرە لێبدە یان بارکۆد بنووسە و Enter داگرە..."
                  className="w-full pl-28 pr-12 py-3.5 bg-black/40 border-2 border-emerald-400/60 focus:border-emerald-300 text-white rounded-2xl text-base font-mono font-bold tracking-wide placeholder-emerald-300/40 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 shadow-inner"
                  autoFocus
                />
                <Barcode className="w-6 h-6 text-emerald-300 absolute right-4 pointer-events-none" />
                <button
                  type="submit"
                  className="absolute left-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  تۆمار (Enter)
                </button>
              </form>

              {/* Fast barcode test buttons for quick click/test */}
              <div className="mt-3 pt-3 border-t border-emerald-800/60 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-emerald-300/80 font-bold">نموونەی کێشی تەرازوو:</span>
                <button
                  type="button"
                  onClick={() => {
                    setScannerInput('2100101018503');
                    setTimeout(() => {
                      addItemToCart(products[0], 1.85, 3500, '2100101018503');
                      playPosBeep('scale');
                      showToast('تەرازوو: مریشکی تەواو (1.850 کگم) زیادکرا', 'success');
                      setScannerInput('');
                    }, 50);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-200 border border-emerald-700 text-xs font-mono transition-all"
                >
                  مریشک (1.85 کگم)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = products.find(p => p.id === 'prod-2') || products[1];
                    addItemToCart(prod, 1.25, 6500, '2100102012508');
                    playPosBeep('scale');
                    showToast('تەرازوو: سنگی بێ ئێسک (1.250 کگم) زیادکرا', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-200 border border-emerald-700 text-xs font-mono transition-all"
                >
                  سنگ (1.25 کگم)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const prod = products.find(p => p.id === 'prod-3') || products[2];
                    addItemToCart(prod, 2.0, 4200, '2100103020005');
                    playPosBeep('scale');
                    showToast('تەرازوو: ڕانی مریشک (2.000 کگم) زیادکرا', 'success');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700/80 text-emerald-200 border border-emerald-700 text-xs font-mono transition-all"
                >
                  ڕان (2.00 کگم)
                </button>
              </div>
            </div>

            {/* PRODUCT CATEGORIES & SEARCH */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1">
                  {[
                    { id: 'ALL', name: 'هەموو بەرهەمەکان' },
                    { id: 'WHOLE_CHICKEN', name: 'مریشکی تەواو' },
                    { id: 'BREAST', name: 'سنگ' },
                    { id: 'THIGH', name: 'ڕان' },
                    { id: 'WINGS', name: 'باڵ و مل' },
                    { id: 'GIBLET', name: 'جگەر و قەسیل' },
                    { id: 'BONES_SCRAP', name: 'ئێسک و شلمک' },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                        activeCategory === cat.id
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Quick Search */}
                <div className="relative w-full sm:w-48 flex-shrink-0">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="گەڕان..."
                    className="w-full pr-9 pl-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* TOUCH TILES GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.map(product => {
                  const branchItem = branchStock.find(b => b.productId === product.id);
                  const inStock = branchItem ? branchItem.inStockKg : product.inStockKg;
                  const price = branchItem ? branchItem.retailPricePerKg : product.pricePerKg;

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        setWeightModalProduct(product);
                        setWeightKeypadValue('1.000');
                        playPosBeep('scale');
                      }}
                      className="group cursor-pointer p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 dark:bg-slate-800/60 dark:hover:bg-emerald-950/20 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-all shadow-sm active:scale-95 flex flex-col justify-between min-h-[110px]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            کۆد: {product.code}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              inStock > 20
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : inStock > 5
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            }`}
                          >
                            ستۆک: {inStock.toFixed(1)} کگم
                          </span>
                        </div>
                        <h4 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors line-clamp-1">
                          {product.nameKu}
                        </h4>
                      </div>

                      <div className="flex items-end justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                          {price.toLocaleString()} <span className="text-[10px]">د.ع/کگم</span>
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                          <Scale className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: ACTIVE SHOPPING CART & CHECKOUT REGISTER */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border-2 border-emerald-500/30 dark:border-emerald-500/20 shadow-xl flex flex-col min-h-[580px] justify-between">
              {/* Cart Header */}
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
                      {cart.length}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">سەبەتەی فرۆشتن</h3>
                      <p className="text-[10px] text-slate-400">کاشێر: {currentUser?.name || 'ئاراس ئەحمەد'}</p>
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                      title="بەتاڵکردنی سەبەتە (F4)"
                    >
                      <Trash2 className="w-4 h-4" />
                      سڕینەوە
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[260px] overflow-y-auto mt-2 pr-1">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <Barcode className="w-12 h-12 mx-auto mb-2 opacity-30 animate-pulse text-emerald-500" />
                      <p className="font-bold text-sm">سەبەتە بەتاڵە</p>
                      <p className="text-xs mt-1">بارکۆد سکان بکە یان بەرهەم هەڵبژێرە لە شاشەکە</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-2 group">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                            {item.productName}
                          </h5>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>{item.pricePerKg.toLocaleString()} د.ع/کگم</span>
                            {item.barcode && <span>• بارکۆد: {item.barcode}</span>}
                          </div>
                        </div>

                        {/* Weight Adjuster */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                          <button
                            onClick={() => updateCartItemWeight(idx, -0.25)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-rose-100 dark:hover:bg-rose-950 text-xs transition-colors"
                          >
                            -
                          </button>
                          <span className="w-14 text-center font-mono font-black text-xs text-slate-900 dark:text-white">
                            {item.weightKg.toFixed(3)}
                          </span>
                          <button
                            onClick={() => updateCartItemWeight(idx, 0.25)}
                            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-950 text-xs transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total & Delete */}
                        <div className="text-left w-20">
                          <div className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                            {item.total.toLocaleString()} د.ع
                          </div>
                        </div>

                        <button
                          onClick={() => removeCartItem(idx)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-500 transition-opacity p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Checkout Calculation & Pay Section */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                {/* Customer Name */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 whitespace-nowrap">کڕیار:</span>
                  <input
                    type="text"
                    value={customerNameInput}
                    onChange={e => setCustomerNameInput(e.target.value)}
                    placeholder="ناوی کڕیار..."
                    className="flex-1 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>

                {/* Subtotal & Discount row */}
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>کۆی کاڵاکان:</span>
                  <span className="font-mono text-slate-900 dark:text-white">{subtotal.toLocaleString()} د.ع</span>
                </div>

                {/* Discount controls */}
                <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
                    <Percent className="w-3.5 h-3.5 text-amber-500" />
                    <span>داشکاندن (خصم):</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="بڕ د.ع"
                      value={discountAmount || ''}
                      onChange={e => {
                        setDiscountAmount(parseFloat(e.target.value) || 0);
                        setDiscountPercent(0);
                      }}
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono text-left focus:outline-none"
                    />
                    <span className="text-slate-400">یان</span>
                    <div className="flex items-center gap-1">
                      {[5, 10].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            setDiscountPercent(pct);
                            setDiscountAmount(0);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            discountPercent === pct
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* NET PAYABLE AMOUNT (HUGE) */}
                <div className="p-3.5 rounded-2xl bg-slate-900 dark:bg-black text-white flex items-center justify-between shadow-lg">
                  <div>
                    <span className="text-xs font-bold text-slate-400">کۆی گشتی بۆ دان:</span>
                    <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                      {netTotal.toLocaleString()}{' '}
                      <span className="text-xs font-normal text-slate-400">دینار</span>
                    </div>
                  </div>

                  {/* Payment Type Switcher */}
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setPaymentType('CASH')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                        paymentType === 'CASH' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      نەقد
                    </button>
                    <button
                      onClick={() => setPaymentType('FIB_OR_CARD')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                        paymentType === 'FIB_OR_CARD' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      کارت
                    </button>
                    <button
                      onClick={() => setPaymentType('DEBT')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition-all ${
                        paymentType === 'DEBT' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      قەرز
                    </button>
                  </div>
                </div>

                {/* Cash Paid & Return Change Calculator (Only for Cash) */}
                {paymentType === 'CASH' && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">پارەی وەرگیراو:</span>
                      <input
                        type="number"
                        value={cashGiven}
                        onChange={e => setCashGiven(e.target.value)}
                        placeholder="نموونە: 25000"
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-xl font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block mb-1">پارەی گەڕاوە (باقی):</span>
                      <div className="font-mono font-black text-base text-emerald-700 dark:text-emerald-300 py-1">
                        {changeDue > 0 ? `${changeDue.toLocaleString()} د.ع` : '٠ د.ع'}
                      </div>
                    </div>
                  </div>
                )}

                {/* COMPLETE SALE BUTTON */}
                <button
                  onClick={handleCompleteSale}
                  disabled={cart.length === 0}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-base shadow-xl shadow-emerald-600/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  <span>تەواوکردن و چاپکردنی وەسڵ (F8 / Enter)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: INBOUND WAREHOUSE BY BARCODE (داخلکردنی کۆگا بە سکانەری بارکۆد) */}
      {/* ========================================================================= */}
      {activeSubTab === 'INBOUND' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inbound Intake Console */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                  <ArrowDownToLine className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">داخلکردنی باری نوێ بۆ کۆگا</h3>
                  <p className="text-xs text-slate-500">بە سکانەری بارکۆد یان بە پێی وەسڵی دەستی کارگە</p>
                </div>
              </div>

              {/* BARCODE SCANNER FOR INBOUND */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2 border border-blue-500/30">
                <div className="flex items-center justify-between text-xs text-blue-300 font-bold">
                  <span>سکانەری بارکۆدی کارتۆن / کاڵا</span>
                  <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                </div>
                <form onSubmit={handleInboundBarcodeScan} className="flex gap-2">
                  <input
                    type="text"
                    value={inboundBarcode}
                    onChange={e => setInboundBarcode(e.target.value)}
                    placeholder="بارکۆدی بەرهەم لێبدە..."
                    className="flex-1 px-3 py-2 bg-slate-800 border border-blue-400/50 rounded-xl font-mono text-sm text-white focus:outline-none focus:border-blue-300"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs"
                  >
                    پشکنین
                  </button>
                </form>
              </div>

              {/* Delivery Metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">ژ. وەسڵی دەستی کارگە:</label>
                  <input
                    type="text"
                    value={inboundReceiptNo}
                    onChange={e => setInboundReceiptNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">بەروار:</label>
                  <input
                    type="date"
                    value={inboundDate}
                    onChange={e => setInboundDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-xs text-slate-600 dark:text-slate-300 block mb-1">مەندوب / هێنەر:</label>
                <input
                  type="text"
                  value={inboundRepName}
                  onChange={e => setInboundRepName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                />
              </div>

              {/* Product Select & Weight */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">بەرهەمی هاتوو:</span>
                  <select
                    value={inboundSelectedProd?.id}
                    onChange={e => {
                      const found = products.find(p => p.id === e.target.value);
                      if (found) {
                        setInboundSelectedProd(found);
                        setInboundFactoryCost(found.costPerKg);
                      }
                    }}
                    className="px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-xs"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameKu} (کۆد: {p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">کێشی هاتوو (کگم):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={inboundWeight}
                      onChange={e => setInboundWeight(e.target.value)}
                      placeholder="50"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono font-bold text-base text-blue-600"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">تێچووی کارگە (د.ع/کگم):</label>
                    <input
                      type="number"
                      value={inboundFactoryCost}
                      onChange={e => setInboundFactoryCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-mono font-bold text-sm"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addStagedInboundItem}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  زیادکردن بۆ لیستی ئەم وەجبەیە
                </button>
              </div>

              <div>
                <label className="font-bold text-xs text-slate-600 dark:text-slate-300 block mb-1">تێبینی:</label>
                <input
                  type="text"
                  value={inboundNotes}
                  onChange={e => setInboundNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Staging Manifest & Final Commit */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center text-xs">
                      {inboundStagingList.length}
                    </span>
                    <h4 className="font-black text-base text-slate-900 dark:text-white">
                      پێداچوونەوەی وەجبەی وەرگیراو
                    </h4>
                  </div>
                  <span className="text-xs font-mono text-slate-500">وەسڵ: {inboundReceiptNo}</span>
                </div>

                {/* Staging Table */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                        <th className="py-2">بەرهەم</th>
                        <th className="py-2 text-center">کێش (کگم)</th>
                        <th className="py-2 text-center">تێچوو/کگم</th>
                        <th className="py-2 text-left">کۆی تێچوو</th>
                        <th className="py-2 text-center">کردار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {inboundStagingList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            هێشتا هیچ کاڵایەک زیاد نەکراوە بۆ ئەم وەجبەیە. بارکۆد سکان بکە یان بەرهەم زیاد بکە.
                          </td>
                        </tr>
                      ) : (
                        inboundStagingList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 font-bold text-slate-900 dark:text-white">{item.productName}</td>
                            <td className="py-2.5 text-center font-mono font-black text-blue-600">
                              {item.weightKg.toFixed(2)} کگم
                            </td>
                            <td className="py-2.5 text-center font-mono">
                              {item.factoryPricePerKg.toLocaleString()} د.ع
                            </td>
                            <td className="py-2.5 text-left font-mono font-bold text-slate-800 dark:text-slate-200">
                              {item.totalCost.toLocaleString()} د.ع
                            </td>
                            <td className="py-2.5 text-center">
                              <button
                                onClick={() => removeStagedInboundItem(idx)}
                                className="text-rose-500 hover:text-rose-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total & Commit Button */}
              {inboundStagingList.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm font-bold">
                    <span>کۆی کێشی وەجبە:</span>
                    <span className="font-mono text-base font-black text-blue-600 dark:text-blue-400">
                      {inboundStagingList.reduce((sum, item) => sum + item.weightKg, 0).toFixed(2)} کگم
                    </span>
                    <span>کۆی بەهای کارگە:</span>
                    <span className="font-mono text-base font-black text-slate-900 dark:text-white">
                      {inboundStagingList.reduce((sum, item) => sum + item.totalCost, 0).toLocaleString()} د.ع
                    </span>
                  </div>

                  <button
                    onClick={commitInboundToWarehouse}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-base shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>تۆمارکردن و زیادکردن بۆ کۆگای فرۆشگا</span>
                  </button>
                </div>
              )}
            </div>

            {/* Inbound History Log */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                مێژووی هاتنی بار لە کارگەوە بۆ فرۆشگا
              </h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto pr-1">
                {branchDeliveries.map(del => (
                  <div key={del.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                        <span className="font-mono text-blue-600">#{del.manualReceiptNo}</span>
                        <span>• {del.repName}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {del.date} {del.time} • {del.items.map(i => `${i.productName} (${i.weightKg}کگم)`).join(', ')}
                      </span>
                    </div>
                    <div className="text-left font-mono font-black text-slate-700 dark:text-slate-300">
                      {del.totalWeightKg.toFixed(1)} کگم
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STORE INVENTORY (کۆگای فرۆشگا و ئاستی خەزێنە) */}
      {/* ========================================================================= */}
      {activeSubTab === 'INVENTORY' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-indigo-600" />
                کۆگای فرۆشگا (سەلاجەی شۆرۆم)
              </h3>
              <p className="text-xs text-slate-500">ئاستی کێشی ماوە، نرخی فرۆشتن بە کڕیار، و ئاگاداری کەمی بڕ</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="py-3 px-3">بەرهەم</th>
                  <th className="py-3 px-3">کۆد / بارکۆد</th>
                  <th className="py-3 px-3 text-center">کێشی ماوە لە کۆگا</th>
                  <th className="py-3 px-3 text-center">ئاستی ئاگاداری</th>
                  <th className="py-3 px-3 text-center">نرخی فرۆشتن (کڕیار)</th>
                  <th className="py-3 px-3 text-center">تێچووی کارگە</th>
                  <th className="py-3 px-3 text-center">دۆخ</th>
                  <th className="py-3 px-3 text-center">دەستکاری نرخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {branchStock.map(item => {
                  const isLow = item.inStockKg <= item.minAlertKg;
                  const isOut = item.inStockKg <= 0;

                  return (
                    <tr key={item.productId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 font-black text-sm text-slate-900 dark:text-white">
                        {item.productName}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {item.code} <span className="text-[10px]">({item.barcode || '2100' + item.code})</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-black text-sm text-indigo-600 dark:text-indigo-400">
                        {item.inStockKg.toFixed(2)} کگم
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">
                        {item.minAlertKg} کگم
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600">
                        {item.retailPricePerKg.toLocaleString()} د.ع
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-500">
                        {item.factoryCostPerKg.toLocaleString()} د.ع
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            isOut
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {isOut ? 'نەماوە ⚠️' : isLow ? 'کەمە ⚠️' : 'تەواوە ✅'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => {
                            const newPrice = prompt(`نرخی نوێی فرۆشتن بۆ (${item.productName}):`, item.retailPricePerKg.toString());
                            if (newPrice && !isNaN(parseFloat(newPrice))) {
                              updateBranchStockItem(item.productId, { retailPricePerKg: parseFloat(newPrice) });
                              showToast('نرخ نوێکرایەوە', 'success');
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                        >
                          گۆڕینی نرخ
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
      {/* TAB 4: POS SALES HISTORY & REPRINT (مێژووی وەسڵەکان و چاپی گەرم) */}
      {/* ========================================================================= */}
      {activeSubTab === 'HISTORY' && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-purple-600" />
                مێژووی وەسڵەکانی فرۆشگا
              </h3>
              <p className="text-xs text-slate-500">بینینەوە و چاپکردنەوەی هەموو وەسڵەکانی پۆس</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs">
              کۆی وەسڵەکان: {posSales.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                  <th className="py-3 px-3">ژمارەی وەسڵ</th>
                  <th className="py-3 px-3">بەروار و کات</th>
                  <th className="py-3 px-3">کڕیار</th>
                  <th className="py-3 px-3">کاشێر</th>
                  <th className="py-3 px-3 text-center">ژمارەی بڕگەکان</th>
                  <th className="py-3 px-3 text-center">شێوازی پارەدان</th>
                  <th className="py-3 px-3 text-left">کۆی پارە</th>
                  <th className="py-3 px-3 text-center">کردار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {posSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-3 px-3 font-mono font-black text-purple-600">
                      {sale.saleNo}
                    </td>
                    <td className="py-3 px-3 text-slate-500 font-mono">
                      {sale.date} {sale.time}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {sale.customerName || 'کڕیاری ئاسایی'}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {sale.cashierName}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {sale.items.length} بەرهەم ({sale.items.reduce((s, i) => s + i.weightKg, 0).toFixed(2)} کگم)
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sale.paymentType === 'CASH'
                            ? 'bg-emerald-100 text-emerald-700'
                            : sale.paymentType === 'FIB_OR_CARD'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {sale.paymentType === 'CASH' ? 'نەقد' : sale.paymentType === 'FIB_OR_CARD' ? 'کارت' : 'قەرز'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-left font-mono font-black text-sm text-emerald-600">
                      {sale.total.toLocaleString()} د.ع
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setPrintReceipt(sale)}
                        className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 hover:text-purple-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        چاپکردنەوە
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CASH REGISTER & EXPENSES (سەندوق و خەرجی) */}
      {/* ========================================================================= */}
      {activeSubTab === 'REGISTER_REPORT' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold block mb-1">کۆی فرۆشی پۆس:</span>
              <div className="text-2xl font-black font-mono text-emerald-600">
                {posSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()} <span className="text-xs">د.ع</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold block mb-1">پارەی نەقدی وەرگیراو:</span>
              <div className="text-2xl font-black font-mono text-blue-600">
                {posSales
                  .filter(s => s.paymentType === 'CASH')
                  .reduce((sum, s) => sum + s.total, 0)
                  .toLocaleString()}{' '}
                <span className="text-xs">د.ع</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold block mb-1">کۆی خەرجییەکانی شۆروم:</span>
              <div className="text-2xl font-black font-mono text-rose-600">
                {branchExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} <span className="text-xs">د.ع</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-xs text-slate-500 font-bold block mb-1">باڵانسی نەقدی ماوە لە سەندوق:</span>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {(
                  posSales.filter(s => s.paymentType === 'CASH').reduce((sum, s) => sum + s.total, 0) -
                  branchExpenses.reduce((sum, e) => sum + e.amount, 0)
                ).toLocaleString()}{' '}
                <span className="text-xs font-normal">د.ع</span>
              </div>
            </div>
          </div>

          {/* Expenses Management */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">خەرجییەکانی فرۆشگا</h4>
                <p className="text-xs text-slate-500">پاکەت، عەلاگە، کارەبا، خاوێنکردنەوە و کرێی شۆروم</p>
              </div>

              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                تۆمارکردنی خەرجی نوێ
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {branchExpenses.map(exp => (
                <div key={exp.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">{exp.title}</h5>
                    <span className="text-[10px] text-slate-400">
                      {exp.date} {exp.time} • پۆلێن: {exp.category}
                    </span>
                  </div>
                  <div className="font-mono font-black text-sm text-rose-600">
                    -{exp.amount.toLocaleString()} د.ع
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: WEIGHT NUMPAD SCALE (کلیک لەسەر بەرهەم بۆ دیاریکردنی کێش) */}
      {/* ========================================================================= */}
      {weightModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-base text-slate-900 dark:text-white">{weightModalProduct.nameKu}</h3>
                <span className="text-xs text-slate-400 font-mono">
                  نرخ: {weightModalProduct.pricePerKg.toLocaleString()} د.ع/کگم
                </span>
              </div>
              <button
                onClick={() => setWeightModalProduct(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Weight Display */}
            <div className="p-4 rounded-2xl bg-slate-950 text-white text-center space-y-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">تەرازوو / کێشی کڕیار</span>
              <div className="text-4xl font-black font-mono text-emerald-400">
                {parseFloat(weightKeypadValue || '0').toFixed(3)}{' '}
                <span className="text-base font-normal text-slate-400">کگم</span>
              </div>
              <div className="text-sm font-mono text-slate-300">
                کۆی پارە:{' '}
                <span className="font-bold text-white">
                  {Math.round((parseFloat(weightKeypadValue || '0') || 0) * weightModalProduct.pricePerKg).toLocaleString()}
                </span>{' '}
                د.ع
              </div>
            </div>

            {/* Quick Weight Preset Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {['0.500', '1.000', '1.500', '2.000'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWeightKeypadValue(val)}
                  className="py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 text-slate-800 dark:text-slate-200 font-mono font-bold text-xs rounded-xl transition-colors"
                >
                  {val}
                </button>
              ))}
            </div>

            {/* NumPad */}
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
                  className="py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-mono font-black text-lg rounded-xl shadow-xs transition-colors"
                >
                  {char}
                </button>
              ))}
            </div>

            {/* Add to Cart Submit */}
            <button
              onClick={() => {
                const w = parseFloat(weightKeypadValue);
                if (w > 0) {
                  const branchItem = branchStock.find(b => b.productId === weightModalProduct.id);
                  const price = branchItem ? branchItem.retailPricePerKg : weightModalProduct.pricePerKg;
                  addItemToCart(weightModalProduct, w, price);
                  playPosBeep('scale');
                  showToast(`${weightModalProduct.nameKu} (${w.toFixed(3)} کگم) خرایە سەبەتە`, 'success');
                  setWeightModalProduct(null);
                }
              }}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              <Check className="w-5 h-5" />
              <span>خستنە ناو سەبەتە</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: THERMAL RECEIPT 80MM (وەسڵی چاپی گەرمی ستاندارد) */}
      {/* ========================================================================= */}
      {printReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-black text-slate-500">وەسڵی فرۆشتنی پۆس (80mm)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  چاپ
                </button>
                <button
                  onClick={() => setPrintReceipt(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Thermal Slip Content */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-center space-y-3">
              <div>
                <h2 className="font-black text-base tracking-wider text-slate-900">FFC FRESH CHICKEN</h2>
                <p className="text-[11px] text-slate-500">فرۆشگای تایبەتی مریشکی فرێش</p>
                <p className="text-[10px] text-slate-400 font-sans">سلێمانی - پیشەسازی</p>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-1.5 text-right text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">وەسڵ:</span>
                  <span className="font-bold">{printReceipt.saleNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">بەروار و کات:</span>
                  <span>
                    {printReceipt.date} {printReceipt.time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">کڕیار:</span>
                  <span className="font-sans font-bold">{printReceipt.customerName || 'کڕیاری ئاسایی'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">کاشێر:</span>
                  <span className="font-sans">{printReceipt.cashierName}</span>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="space-y-1 text-right text-[11px]">
                <div className="flex justify-between font-bold text-slate-400 pb-1 border-b border-slate-200">
                  <span>کاڵا / کێش</span>
                  <span>کۆی پارە</span>
                </div>
                {printReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                    <div>
                      <div className="font-sans font-bold text-slate-800">{item.productName}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.weightKg.toFixed(3)} کگم × {item.pricePerKg.toLocaleString()} د.ع
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{item.total.toLocaleString()} د.ع</div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t-2 border-slate-900 pt-2 text-right text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>کۆی بڕ:</span>
                  <span>{printReceipt.subtotal.toLocaleString()} د.ع</span>
                </div>
                {printReceipt.discount > 0 && (
                  <div className="flex justify-between text-amber-600 font-bold">
                    <span>داشکاندن:</span>
                    <span>-{printReceipt.discount.toLocaleString()} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1 border-t border-slate-300">
                  <span>کۆی گشتی:</span>
                  <span className="text-emerald-700">{printReceipt.total.toLocaleString()} د.ع</span>
                </div>

                {printReceipt.paymentType === 'CASH' && (
                  <>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                      <span>پارەی دراو:</span>
                      <span>{(printReceipt.paidAmount || printReceipt.total).toLocaleString()} د.ع</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>پارەی گەڕاوە:</span>
                      <span className="font-bold text-slate-800">
                        {(printReceipt.changeAmount || 0).toLocaleString()} د.ع
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Barcode representation */}
              <div className="pt-2">
                <BarcodeSVG code={printReceipt.saleNo.replace(/[^0-9]/g, '') || '1001001'} width={220} height={40} />
              </div>

              <p className="text-[10px] text-slate-400 font-sans pt-1">
                سوپاس بۆ سەردانەکەتان • مریشکی تەندروست و فرێش
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD EXPENSE */}
      {/* ========================================================================= */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleAddExpense}
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-black text-base text-slate-900 dark:text-white">تۆمارکردنی خەرجی شۆروم</h3>
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="p-1 rounded-lg text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-600 dark:text-slate-300 block mb-1">ناوی خەرجی:</label>
              <input
                type="text"
                value={expTitle}
                onChange={e => setExpTitle(e.target.value)}
                placeholder="نموونە: کڕینی عەلاگەی لۆگۆدار..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">بڕی پارە (د.ع):</label>
                <input
                  type="number"
                  value={expAmount}
                  onChange={e => setExpAmount(e.target.value)}
                  placeholder="25000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold text-sm text-rose-600"
                  required
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">پۆلێن:</label>
                <select
                  value={expCategory}
                  onChange={e => setExpCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs"
                >
                  <option value="PACKAGING">پاکەت و عەلاگە</option>
                  <option value="ELECTRICITY">کارەبا و بەفر</option>
                  <option value="RENT">کرێی شوێن</option>
                  <option value="SALARIES">مووچەی کاشێر</option>
                  <option value="CLEANING">خاوێنکردنەوە</option>
                  <option value="MAINTENANCE">چاککردنەوە</option>
                  <option value="OTHER">هی تر</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition-all"
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
