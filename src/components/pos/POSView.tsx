import React, { useState } from 'react';
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
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  Receipt,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { POSSaleItem, POSSale, ProductItem, BranchDeliveryItem } from '../../types';

export const POSView: React.FC = () => {
  const {
    products,
    posSales,
    branchStock,
    branchDeliveries,
    branchExpenses,
    addPOSSale,
    addBranchDelivery,
    addBranchExpense,
    parseWeightBarcode,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'POS' | 'INVENTORY' | 'EXPENSES' | 'REPORTS'>('POS');

  // ==========================================
  // POS REGISTER STATE
  // ==========================================
  const [cart, setCart] = useState<POSSaleItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [discount, setDiscount] = useState<number>(0);
  const [activeModalReceipt, setActiveModalReceipt] = useState<POSSale | null>(null);
  const [selectedProductForWeight, setSelectedProductForWeight] = useState<ProductItem | null>(null);
  const [customWeightInput, setCustomWeightInput] = useState<string>('1.5');

  // ==========================================
  // INBOUND REPS DELIVERY MODAL STATE
  // ==========================================
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [deliveryReceiptNo, setDeliveryReceiptNo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryTime, setDeliveryTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [deliveryRepName, setDeliveryRepName] = useState('مەندوب شوان (ئۆتۆمبێلی گواستنەوە)');
  const [deliveryPhone, setDeliveryPhone] = useState('0770 234 5678');
  const [deliveryItems, setDeliveryItems] = useState<BranchDeliveryItem[]>([]);
  const [selectedDeliveryProdId, setSelectedDeliveryProdId] = useState(products[0]?.id || '');
  const [deliveryWeightInput, setDeliveryWeightInput] = useState<number | ''>('');
  const [deliveryPriceInput, setDeliveryPriceInput] = useState<number | ''>('');
  const [deliveryNotes, setDeliveryNotes] = useState('باری بەیانی گەیشت بە وەسڵی دەستی کارگە');

  // ==========================================
  // STORE EXPENSES MODAL STATE
  // ==========================================
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<'RENT' | 'ELECTRICITY' | 'PACKAGING' | 'SALARIES' | 'CLEANING' | 'MAINTENANCE' | 'OTHER'>('PACKAGING');
  const [expAmount, setExpAmount] = useState<number | ''>('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');

  // ==========================================
  // REPORTS DATE RANGE FILTER
  // ==========================================
  const [reportStartDate, setReportStartDate] = useState('2026-10-01');
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // POS Add to Cart
  const addToCart = (product: ProductItem, weightKg: number) => {
    const stockItem = branchStock.find(bs => bs.productId === product.id);
    const available = stockItem ? stockItem.inStockKg : product.inStockKg;
    const price = stockItem ? stockItem.retailPricePerKg : product.pricePerKg;

    if (available <= 0) {
      alert(`ئاگاداری: کۆگای فرۆشگا لەم بەرهەمە (${product.nameKu}) نەماوە! تکایە بار لە کارگەوە وەرگرە.`);
    }

    const total = Math.round(weightKg * price);
    const existingIndex = cart.findIndex(i => i.productId === product.id);

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].weightKg += weightKg;
      updated[existingIndex].total = Math.round(updated[existingIndex].weightKg * price);
      setCart(updated);
    } else {
      const newItem: POSSaleItem = {
        productId: product.id,
        productName: product.nameKu,
        weightKg: Number(weightKg.toFixed(3)),
        pricePerKg: price,
        total,
      };
      setCart([...cart, newItem]);
    }
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput) return;

    const res = parseWeightBarcode(barcodeInput);
    if (res.valid && res.product) {
      addToCart(res.product, res.weightKg);
      setBarcodeInput('');
    } else {
      alert('بارکۆدەکە نەدۆزرایەوە یان نادروستە. نموونە: 2100101018501');
    }
  };

  const handleManualWeightAdd = () => {
    if (!selectedProductForWeight) return;
    const w = parseFloat(customWeightInput);
    if (isNaN(w) || w <= 0) {
      alert('تکایە کێشێکی دروست دیاری بکە');
      return;
    }
    addToCart(selectedProductForWeight, w);
    setSelectedProductForWeight(null);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const handleCheckout = (paymentType: 'CASH' | 'FIB_OR_CARD') => {
    if (cart.length === 0) return;

    const sale = addPOSSale({
      date: new Date().toLocaleString('ckb-IQ'),
      items: cart,
      subtotal,
      discount,
      total: grandTotal,
      paymentType,
      cashierName: 'کاشێری فرۆشگا',
    });

    setActiveModalReceipt(sale);
    clearCart();
  };

  // Add Item to Inbound Delivery
  const handleAddDeliveryItem = () => {
    const prod = products.find(p => p.id === selectedDeliveryProdId);
    if (!prod || !deliveryWeightInput || Number(deliveryWeightInput) <= 0) {
      alert('تکایە بەرهەم و کێش دیاری بکە');
      return;
    }

    const price = deliveryPriceInput !== '' ? Number(deliveryPriceInput) : prod.costPerKg;
    const weight = Number(deliveryWeightInput);

    const newItem: BranchDeliveryItem = {
      productId: prod.id,
      productName: prod.nameKu,
      weightKg: weight,
      factoryPricePerKg: price,
      totalCost: Math.round(weight * price),
    };

    setDeliveryItems([...deliveryItems, newItem]);
    setDeliveryWeightInput('');
    setDeliveryPriceInput('');
  };

  const handleRemoveDeliveryItem = (idx: number) => {
    setDeliveryItems(deliveryItems.filter((_, i) => i !== idx));
  };

  const totalDeliveryWeight = deliveryItems.reduce((sum, i) => sum + i.weightKg, 0);
  const totalDeliveryCost = deliveryItems.reduce((sum, i) => sum + i.totalCost, 0);

  const handleOpenDeliveryModal = () => {
    setDeliveryReceiptNo(`BR-${Math.floor(700 + Math.random() * 200)}`);
    setDeliveryItems([]);
    setDeliveryWeightInput('');
    setDeliveryPriceInput('');
    setShowDeliveryModal(true);
  };

  const handleDeliverySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryReceiptNo || deliveryItems.length === 0) {
      alert('تکایە ژمارەی وەسڵی دەستی و بەلایەنی کەم یەک بەرهەم بنووسە');
      return;
    }

    addBranchDelivery({
      manualReceiptNo: deliveryReceiptNo,
      date: deliveryDate,
      time: deliveryTime,
      repName: deliveryRepName,
      driverPhone: deliveryPhone,
      items: deliveryItems,
      totalWeightKg: totalDeliveryWeight,
      totalCost: totalDeliveryCost,
      notes: deliveryNotes,
    });

    setShowDeliveryModal(false);
  };

  // Add Store Expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || !expAmount || Number(expAmount) <= 0) {
      alert('تکایە ناوی خەرجی و بڕەکەی بنووسە');
      return;
    }

    addBranchExpense({
      date: expDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      title: expTitle,
      category: expCategory,
      amount: Number(expAmount),
      notes: expNotes,
    });

    setShowExpenseModal(false);
    setExpTitle('');
    setExpAmount('');
    setExpNotes('');
  };

  // ==========================================
  // BRANCH FINANCIAL REPORT CALCULATIONS
  // ==========================================
  const totalBranchSalesRevenue = posSales.reduce((sum, s) => sum + s.total, 0);
  const totalBranchChickenCost = branchDeliveries.reduce((sum, d) => sum + d.totalCost, 0);
  const totalBranchExpenses = branchExpenses.reduce((sum, e) => sum + e.amount, 0);
  const netBranchProfit = totalBranchSalesRevenue - totalBranchChickenCost - totalBranchExpenses;
  const totalBranchStockKg = branchStock.reduce((sum, s) => sum + s.inStockKg, 0);
  const totalBranchStockValue = branchStock.reduce((sum, s) => sum + (s.inStockKg * s.retailPricePerKg), 0);

  return (
    <div className="space-y-6">
      {/* Header and Segmented Control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-black/[0.06] shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#0071E3]" />
              فرۆشگای تایبەت (لقی سەربەخۆ)
            </h2>
            <span className="text-[10px] bg-[#34C759]/10 text-[#248A3D] font-bold px-2 py-0.5 rounded-full border border-[#34C759]/20">
              کۆگا و حسابی سەربەخۆ
            </span>
          </div>
          <p className="text-xs text-[#86868B] mt-1">
            کاشێری تاک بە وەسڵی 80mm، کۆگای سەربەخۆ، وەرگرتنی بار بە وەسڵی دەستی مەندوب، و ڕاپۆرتی دارایی
          </p>
        </div>

        {/* Apple Segmented Bar */}
        <div className="p-1 bg-[#EAEAEA] rounded-full inline-flex gap-1">
          {[
            { id: 'POS', label: 'کاشێری فرۆش (POS)', icon: ShoppingBag },
            { id: 'INVENTORY', label: 'کۆگای فرۆشگا و وەرگرتن', count: branchStock.length, icon: Boxes },
            { id: 'EXPENSES', label: 'خەرجی فرۆشگا', count: branchExpenses.length, icon: DollarSign },
            { id: 'REPORTS', label: 'ڕاپۆرتی سەربەخۆ', icon: FileSpreadsheet },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-white text-[#1D1D1F] shadow-sm font-bold'
                    : 'text-[#515154] hover:text-[#1D1D1F]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-[#0071E3]" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#F5F5F7]' : 'bg-black/5'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POS REGISTER */}
      {/* ========================================================================= */}
      {activeTab === 'POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left/Middle: Product Grid & Barcode */}
          <div className="lg:col-span-2 space-y-4">
            {/* Fast Barcode Bar */}
            <div className="bg-white p-4 rounded-3xl border border-black/[0.06] shadow-sm flex items-center justify-between gap-3">
              <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 text-[#86868B] absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="سکانکردنی بارکۆدی تەرازوو... (نموونە: 2100101018501)"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-full pr-10 pl-4 py-2 text-xs text-[#1D1D1F] placeholder-[#86868B] outline-none focus:border-[#0071E3] focus:bg-white font-mono font-bold transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white rounded-full text-xs font-semibold"
                >
                  داخڵکردن
                </button>
              </form>

              <div className="text-[11px] text-[#86868B] hidden sm:block">
                مەخزەنی فرۆشگا: <span className="font-bold text-[#0071E3]">{totalBranchStockKg.toFixed(1)} کگم</span>
              </div>
            </div>

            {/* Product Cards with Live Branch Inventory */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {products.map((product) => {
                const bStock = branchStock.find(b => b.productId === product.id);
                const inStock = bStock ? bStock.inStockKg : product.inStockKg;
                const price = bStock ? bStock.retailPricePerKg : product.pricePerKg;
                const isLow = inStock <= (bStock?.minAlertKg || 20);

                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductForWeight(product)}
                    className="p-4 rounded-3xl bg-white border border-black/[0.06] shadow-sm hover:shadow-md hover:border-[#0071E3]/40 transition-all text-right flex flex-col justify-between group active:scale-[0.98]"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">🍗</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isLow ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : 'bg-[#34C759]/10 text-[#248A3D]'
                        }`}>
                          کۆگا: {inStock.toFixed(1)} کگم
                        </span>
                      </div>
                      <div className="font-bold text-xs text-[#1D1D1F] group-hover:text-[#0071E3] transition-colors leading-tight">
                        {product.nameKu}
                      </div>
                      <div className="text-[10px] text-[#86868B] mt-0.5">
                        کۆد: {product.code}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-black/[0.04] flex items-center justify-between">
                      <span className="text-[10px] text-[#86868B]">نرخی کیلۆ:</span>
                      <span className="font-black text-xs text-[#0071E3]">
                        {price.toLocaleString()} د.ع
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Cart & Checkout Register */}
          <div className="bg-white rounded-3xl border border-black/[0.06] shadow-sm p-5 flex flex-col justify-between h-fit space-y-4">
            <div className="border-b border-black/[0.06] pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-[#1D1D1F] flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#0071E3]" />
                  وەسڵی ئێستای کڕیار
                </h3>
                <span className="text-[10px] text-[#86868B]">{cart.length} بەرهەم زیادکراوە</span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-[11px] text-[#FF3B30] hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  سڕینەوەی وەسڵ
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-[#86868B] text-xs">
                  سەبەتەکە بەتاڵە. کلیک لە بەرهەمەکان یان بارکۆد بکە بۆ فرۆشتن
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-2xl bg-[#FBFBFD] border border-black/[0.04] flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-[#1D1D1F]">{item.productName}</div>
                      <div className="text-[10px] text-[#86868B]">
                        {item.weightKg} کگم × {item.pricePerKg.toLocaleString()} د.ع
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#1D1D1F]">{item.total.toLocaleString()} د.ع</span>
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-[#86868B] hover:text-[#FF3B30] p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Discount */}
            <div className="border-t border-black/[0.06] pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-[#86868B]">
                <span>کۆی بەرهەمەکان:</span>
                <span>{subtotal.toLocaleString()} د.ع</span>
              </div>

              <div className="flex items-center justify-between text-[#86868B]">
                <span>داشکاندن (خصم):</span>
                <input
                  type="number"
                  placeholder="0"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-20 bg-[#F5F5F7] rounded-lg px-2 py-1 text-left text-xs font-bold outline-none"
                />
              </div>

              <div className="flex justify-between text-base font-black text-[#1D1D1F] pt-2 border-t border-black/[0.04]">
                <span>کۆی گشتی بۆ دان:</span>
                <span className="text-[#0071E3] text-lg">{grandTotal.toLocaleString()} د.ع</span>
              </div>
            </div>

            {/* Checkout Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                disabled={cart.length === 0}
                onClick={() => handleCheckout('CASH')}
                className="py-3 bg-[#34C759] hover:bg-[#2DB34E] disabled:opacity-40 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-sm shadow-[#34C759]/30 transition-all active:scale-[0.98]"
              >
                <Banknote className="w-4 h-4" />
                کاش (نەقد)
              </button>

              <button
                disabled={cart.length === 0}
                onClick={() => handleCheckout('FIB_OR_CARD')}
                className="py-3 bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-sm shadow-[#0071E3]/30 transition-all active:scale-[0.98]"
              >
                <CreditCard className="w-4 h-4" />
                کارت / FIB
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STORE INVENTORY & INBOUND DELIVERIES BY REPS */}
      {/* ========================================================================= */}
      {activeTab === 'INVENTORY' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#1D1D1F]">
                کۆگای سەربەخۆی فرۆشگا و باری وەرگیراو لە کارگە
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                مەندوب ڕۆژانە مریشک بە وەسڵی دەستی کارگە دەهێنێت بۆ ئەم فرۆشگایە و لێرە وەردەگیرێت
              </p>
            </div>

            <button
              onClick={handleOpenDeliveryModal}
              className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              + وەرگرتنی باری نوێ لە کارگە (بە وەسڵی دەستی)
            </button>
          </div>

          {/* Current Store Stock Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {branchStock.map((item) => {
              const isLow = item.inStockKg <= item.minAlertKg;
              return (
                <div key={item.productId} className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
                  <div className="flex items-center justify-between text-xs text-[#86868B] mb-2 font-semibold">
                    <span>{item.productName}</span>
                    <span className="text-lg">🍗</span>
                  </div>
                  <div className={`text-2xl font-black ${isLow ? 'text-[#FF3B30]' : 'text-[#1D1D1F]'}`}>
                    {item.inStockKg.toFixed(1)} <span className="text-xs font-normal text-[#86868B]">کگم ماوە</span>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-black/[0.04] text-[11px] flex justify-between text-[#86868B]">
                    <span>نرخی فرۆش: {item.retailPricePerKg.toLocaleString()} د.ع</span>
                    <span>تێچووی کارگە: {item.factoryCostPerKg.toLocaleString()} د.ع</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inbound Deliveries History Table */}
          <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
              <span className="font-bold text-xs text-[#1D1D1F]">
                مێژووی وەسڵەکانی وەرگرتن لە کارگەوە لە ڕێگەی مەندوب ({branchDeliveries.length})
              </span>
              <span className="text-xs text-[#86868B]">بەروار و کاتژمێری وەرگرتن</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                  <tr>
                    <th className="p-4">ژ. وەسڵی دەستی کارگە</th>
                    <th className="p-4">بەروار و کات</th>
                    <th className="p-4">مەندوبی هێنەر</th>
                    <th className="p-4">بەرهەمەکان</th>
                    <th className="p-4">کۆی کێش (کگم)</th>
                    <th className="p-4">تێچووی وەسڵی کارگە</th>
                    <th className="p-4">تێبینی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                  {branchDeliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-[#FBFBFD]">
                      <td className="p-4 font-bold text-[#0071E3]">
                        <span className="bg-[#0071E3]/10 px-2.5 py-1 rounded-full text-[11px] font-mono">
                          {del.manualReceiptNo}
                        </span>
                      </td>
                      <td className="p-4 font-semibold">{del.date} - {del.time}</td>
                      <td className="p-4 font-bold text-[#1D1D1F]">{del.repName}</td>
                      <td className="p-4 text-[#86868B]">
                        {del.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                      </td>
                      <td className="p-4 font-black text-[#1D1D1F] text-sm">
                        {del.totalWeightKg} کگم
                      </td>
                      <td className="p-4 font-black text-[#FF9500]">
                        {del.totalCost.toLocaleString()} د.ع
                      </td>
                      <td className="p-4 text-[#86868B]">{del.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: STORE EXPENSES */}
      {/* ========================================================================= */}
      {activeTab === 'EXPENSES' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#1D1D1F]">
                خەرجییە ناوخۆییەکانی فرۆشگای تایبەت
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                تۆمارکردنی کرێ، کارەبا، عەلاگە و پێداویستییە سەربەخۆکانی فرۆشگا
              </p>
            </div>

            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-5 py-2.5 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white font-semibold text-xs rounded-full shadow-sm flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              + تۆمارکردنی خەرجی فرۆشگا
            </button>
          </div>

          {/* Expenses Table */}
          <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                  <tr>
                    <th className="p-4">بەروار و کات</th>
                    <th className="p-4">جۆری خەرجی</th>
                    <th className="p-4">ناونیشانی خەرجی</th>
                    <th className="p-4">بڕی خەرجی (د.ع)</th>
                    <th className="p-4">تێبینی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                  {branchExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#FBFBFD]">
                      <td className="p-4 font-semibold">{exp.date} {exp.time && `• ${exp.time}`}</td>
                      <td className="p-4">
                        <span className="bg-[#FF9500]/10 text-[#FF9500] px-2.5 py-1 rounded-full text-[10px] font-bold">
                          {exp.category === 'RENT' ? 'کرێ' : exp.category === 'ELECTRICITY' ? 'کارەبا و مۆلیدە' : exp.category === 'PACKAGING' ? 'عەلاگە و نایلۆن' : exp.category === 'SALARIES' ? 'مووچەی کارمەند' : 'خەرجی گشتی'}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-[#1D1D1F]">{exp.title}</td>
                      <td className="p-4 font-black text-[#FF3B30] text-sm">
                        -{exp.amount.toLocaleString()} د.ع
                      </td>
                      <td className="p-4 text-[#86868B]">{exp.notes || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: INDEPENDENT BRANCH REPORT & P&L */}
      {/* ========================================================================= */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          {/* Header & Print */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-[#1D1D1F]">
                ڕاپۆرتی دارایی سەربەخۆی فرۆشگای تایبەت
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                تەرازووی داهات و قازانجی صافی فرۆشگا بە جیاکراوەیی لە کارگە
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white font-semibold text-xs rounded-full shadow-sm flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              چاپکردنی ڕاپۆرتی فرۆشگا
            </button>
          </div>

          {/* KPI P&L Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
              <span className="text-xs text-[#86868B] block font-semibold mb-1">کۆی داهاتی فرۆشی تاک</span>
              <div className="text-xl font-black text-[#34C759]">
                {totalBranchSalesRevenue.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">د.ع</span>
              </div>
              <span className="text-[11px] text-[#248A3D] mt-1 block font-medium">{posSales.length} وەسڵی کاشێر</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
              <span className="text-xs text-[#86868B] block font-semibold mb-1">تێچووی باری کارگە</span>
              <div className="text-xl font-black text-[#FF9500]">
                {totalBranchChickenCost.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">د.ع</span>
              </div>
              <span className="text-[11px] text-[#86868B] mt-1 block font-medium">وەسڵی دەستی مەندوب</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
              <span className="text-xs text-[#86868B] block font-semibold mb-1">خەرجییەکانی فرۆشگا</span>
              <div className="text-xl font-black text-[#FF3B30]">
                {totalBranchExpenses.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">د.ع</span>
              </div>
              <span className="text-[11px] text-[#86868B] mt-1 block font-medium">کرێ، کارەبا، عەلاگە</span>
            </div>

            <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
              <span className="text-xs text-[#86868B] block font-semibold mb-1">قازانجی صافی فرۆشگا</span>
              <div className={`text-xl font-black ${netBranchProfit >= 0 ? 'text-[#0071E3]' : 'text-[#FF3B30]'}`}>
                {netBranchProfit.toLocaleString()} <span className="text-xs font-normal text-[#86868B]">د.ع</span>
              </div>
              <span className="text-[11px] text-[#0071E3] mt-1 block font-medium">پاش داشکاندنی تێچوو و خەرجی</span>
            </div>
          </div>

          {/* Statement View */}
          <div className="p-6 rounded-3xl bg-white border border-black/[0.06] shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-[#1D1D1F] border-b border-black/[0.06] pb-2">
              پوختەی دارایی لقی فرۆشگای تایبەت
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-black/[0.04]">
                <span className="font-semibold text-[#515154]">(+) داهاتی کۆی فرۆشی کاشێر بە کاش و کارت:</span>
                <span className="font-bold text-[#34C759]">+{totalBranchSalesRevenue.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04]">
                <span className="font-semibold text-[#515154]">(-) تێچووی کڕینی مریشک لە کارگە (وەسڵی دەستی مەندوب):</span>
                <span className="font-bold text-[#FF9500]">-{totalBranchChickenCost.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between py-1 border-b border-black/[0.04]">
                <span className="font-semibold text-[#515154]">(-) کۆی خەرجییە گشتییەکانی دوکان و کارەبا:</span>
                <span className="font-bold text-[#FF3B30]">-{totalBranchExpenses.toLocaleString()} د.ع</span>
              </div>
              <div className="flex justify-between py-2 text-sm font-black border-t-2 border-black/10">
                <span>(=) قازانجی صافی لقی فرۆشگای تایبەت:</span>
                <span className={netBranchProfit >= 0 ? 'text-[#0071E3]' : 'text-[#FF3B30]'}>
                  {netBranchProfit.toLocaleString()} د.ع
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD INBOUND DELIVERY FROM REP (وەسڵی دەستی کارگە) */}
      {/* ========================================================================= */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    وەرگرتنی باری نوێ لە کارگەوە بە وەسڵی دەستی
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    مەندوب بار دەهێنێت بە وەسڵی دەستی و ڕاستەوخۆ دەچێتە کۆگای ئەم فرۆشگایە
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDeliveryModal(false)}
                className="w-8 h-8 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeliverySubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    ژمارەی وەسڵی دەستی کارگە *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: BR-702"
                    value={deliveryReceiptNo}
                    onChange={(e) => setDeliveryReceiptNo(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 font-mono font-bold text-[#1D1D1F] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">ناوی مەندوبی هێنەر *</label>
                  <input
                    type="text"
                    required
                    value={deliveryRepName}
                    onChange={(e) => setDeliveryRepName(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Add Delivery Item */}
              <div className="border border-black/[0.06] rounded-2xl p-4 bg-[#FBFBFD] space-y-3">
                <div className="font-bold text-[#1D1D1F] flex items-center justify-between">
                  <span>بەرهەمە هاتووەکانی ناو ئەم وەسڵە:</span>
                  <span className="text-[11px] font-normal text-[#86868B]">
                    هەر بەرهەمێک لەگەڵ کێش و نرخی وەسڵی کارگە زیاد بکە
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <select
                      value={selectedDeliveryProdId}
                      onChange={(e) => {
                        setSelectedDeliveryProdId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) setDeliveryPriceInput(p.costPerKg);
                      }}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none font-semibold"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.nameKu}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="کێش (کگم) *"
                      value={deliveryWeightInput}
                      onChange={(e) => setDeliveryWeightInput(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <input
                      type="number"
                      placeholder="نرخی تێچووی وەسڵ (د.ع)"
                      value={deliveryPriceInput}
                      onChange={(e) => setDeliveryPriceInput(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddDeliveryItem}
                  className="w-full py-2 bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردن بۆ ئەم وەسڵە
                </button>

                {deliveryItems.length > 0 && (
                  <div className="mt-3 bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F5F5F7] text-[#515154] font-semibold">
                        <tr>
                          <th className="p-2.5">بەرهەم</th>
                          <th className="p-2.5">کێش (کگم)</th>
                          <th className="p-2.5">نرخی وەسڵی کارگە</th>
                          <th className="p-2.5">کۆی تێچوو</th>
                          <th className="p-2.5 text-center">سڕینەوە</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {deliveryItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-[#1D1D1F]">{item.productName}</td>
                            <td className="p-2.5 font-black text-[#0071E3]">{item.weightKg} کگم</td>
                            <td className="p-2.5 text-[#515154]">{item.factoryPricePerKg.toLocaleString()} د.ع</td>
                            <td className="p-2.5 font-black text-[#FF9500]">{item.totalCost.toLocaleString()} د.ع</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveDeliveryItem(idx)}
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

              {/* Summary Bar */}
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex items-center justify-between">
                <div>
                  <span className="text-[#86868B] text-xs">کۆی کێشی وەرگیراو: </span>
                  <span className="text-base font-black text-[#0071E3]">{totalDeliveryWeight} کگم</span>
                </div>
                <div>
                  <span className="text-[#86868B] text-xs">کۆی تێچووی وەسڵ: </span>
                  <span className="text-base font-black text-[#FF9500]">{totalDeliveryCost.toLocaleString()} د.ع</span>
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="تێبینی..."
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-md shadow-[#0071E3]/25 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  پەسەندکردنی وەرگرتنی بار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD STORE EXPENSE */}
      {/* ========================================================================= */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <h3 className="font-bold text-base text-[#1D1D1F]">تۆمارکردنی خەرجی فرۆشگای تایبەت</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#515154] font-semibold mb-1">ناونیشانی خەرجی *</label>
                <input
                  type="text"
                  required
                  placeholder="نموونە: کرێی شوێن یان مۆلیدە..."
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">جۆر *</label>
                  <select
                    value={expCategory}
                    onChange={(e: any) => setExpCategory(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none font-semibold"
                  >
                    <option value="PACKAGING">عەلاگە و نایلۆن</option>
                    <option value="ELECTRICITY">کارەبا و مۆلیدە</option>
                    <option value="RENT">کرێی دوکان</option>
                    <option value="SALARIES">مووچەی کارمەند</option>
                    <option value="CLEANING">پاککەرەوە</option>
                    <option value="OTHER">خەرجی تر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بڕی خەرجی (د.ع) *</label>
                  <input
                    type="number"
                    required
                    placeholder="نموونە: 35000"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none font-black text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                <input
                  type="date"
                  required
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  placeholder="تێبینی..."
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#1D1D1F] hover:bg-[#2C2C2E]"
                >
                  تۆمارکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: QUICK WEIGHT INPUT MODAL FOR POS */}
      {/* ========================================================================= */}
      {selectedProductForWeight && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-black/[0.08] space-y-4 text-center">
            <span className="text-3xl block">🍗</span>
            <div>
              <h3 className="font-bold text-base text-[#1D1D1F]">{selectedProductForWeight.nameKu}</h3>
              <p className="text-xs text-[#0071E3] font-bold mt-0.5">
                {selectedProductForWeight.pricePerKg.toLocaleString()} د.ع / کیلۆ
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs font-bold">
              {['1.0', '1.5', '2.0', '2.5'].map((w) => (
                <button
                  key={w}
                  onClick={() => setCustomWeightInput(w)}
                  className={`py-2 rounded-xl border ${
                    customWeightInput === w
                      ? 'bg-[#0071E3] text-white border-[#0071E3]'
                      : 'bg-[#F5F5F7] text-[#1D1D1F] border-black/[0.05]'
                  }`}
                >
                  {w} کگم
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] text-[#86868B] mb-1 font-semibold">یان کێش بە دەستی بنووسە (کگم):</label>
              <input
                type="number"
                step="0.05"
                value={customWeightInput}
                onChange={(e) => setCustomWeightInput(e.target.value)}
                className="w-full text-center text-xl font-black py-2.5 rounded-2xl bg-[#F5F5F7] border border-black/[0.08] outline-none focus:border-[#0071E3] focus:bg-white"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setSelectedProductForWeight(null)}
                className="flex-1 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
              >
                پاشگەزبوونەوە
              </button>
              <button
                onClick={handleManualWeightAdd}
                className="flex-1 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED]"
              >
                زیادکردن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: 80MM THERMAL RECEIPT SLIP */}
      {/* ========================================================================= */}
      {activeModalReceipt && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-2">
              <span className="font-bold text-xs text-[#1D1D1F]">وەسڵی گەرمی 80mm کاشێر</span>
              <button
                onClick={() => setActiveModalReceipt(null)}
                className="w-6 h-6 rounded-full bg-[#F5F5F7] text-[#86868B] text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* 80mm Receipt Slip */}
            <div className="p-4 bg-[#FBFBFD] border border-black/[0.06] rounded-2xl font-mono text-xs space-y-2 text-center">
              <div className="font-black text-sm">🍗 فرۆشگای مریشکی فرێش</div>
              <div className="text-[10px] text-[#86868B]">لقی تایبەتی کارگە - فرۆشتنی تاک</div>
              <div className="text-[10px] text-[#86868B]">وەسڵی: {activeModalReceipt.saleNo} • {activeModalReceipt.date}</div>

              <div className="border-t border-b border-dashed border-black/20 py-2 space-y-1.5 text-right text-[11px]">
                {activeModalReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{item.productName} ({item.weightKg} کگم)</span>
                    <span className="font-bold">{item.total.toLocaleString()} د.ع</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-right pt-1">
                <div className="flex justify-between text-xs">
                  <span>کۆی گشتی:</span>
                  <span className="font-bold">{activeModalReceipt.subtotal.toLocaleString()} د.ع</span>
                </div>
                {activeModalReceipt.discount > 0 && (
                  <div className="flex justify-between text-xs text-[#FF3B30]">
                    <span>داشکاندن:</span>
                    <span>-{activeModalReceipt.discount.toLocaleString()} د.ع</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black pt-1 border-t border-black/10">
                  <span>بڕی دراو:</span>
                  <span className="text-[#0071E3]">{activeModalReceipt.total.toLocaleString()} د.ع</span>
                </div>
              </div>

              <div className="text-[10px] text-[#86868B] pt-2 border-t border-dashed border-black/20">
                سوپاس بۆ کڕینەکەت • بەخێربێنەوە
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-[#0071E3] text-white rounded-full font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                چاپی وەسڵ (80mm)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
