import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Gift,
  Plus,
  Clock,
  Printer,
  Trash2,
  CheckCircle,
  User,
  Heart,
  Scale,
} from 'lucide-react';
import { DispatchItem, DispatchOrder } from '../../types';
import { FactoryLogo } from '../layout/FactoryLogo';

export const GiftsView: React.FC = () => {
  const { dispatches, products, factorySettings, addDispatch } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<DispatchOrder | null>(null);
  const [showFactoryCostOnPrint, setShowFactoryCostOnPrint] = useState(false);

  // Form States
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [repName, setRepName] = useState('مەندوب شوان');
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('دیاری و بەخشین — لەسەر خەڵک فری (٠ دینار) و تێچوو لەسەر کارگە');

  // Line items
  const defaultProduct = products[0];
  const [selectedProductId, setSelectedProductId] = useState(defaultProduct?.id || '');
  const [itemWeight, setItemWeight] = useState<number | ''>('');
  const [itemFactoryCostPerKg, setItemFactoryCostPerKg] = useState<number | ''>(
    defaultProduct?.costPerKg ?? 2750
  );
  const [itemsList, setItemsList] = useState<DispatchItem[]>([]);

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    setItemFactoryCostPerKg(prod ? prod.costPerKg : 2750);
  };

  const handleOpenModal = () => {
    const firstProd = products[0];
    setManualReceiptNo(`G-${Math.floor(100 + Math.random() * 90)}`);
    setSelectedProductId(firstProd?.id || '');
    setItemFactoryCostPerKg(firstProd?.costPerKg ?? 2750);
    setItemsList([]);
    setItemWeight('');
    setRecipientName('');
    setNotes('دیاری و بەخشین — لەسەر خەڵک فری (٠ دینار) و تێچوو لەسەر کارگە');
    setShowModal(true);
  };

  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod || !itemWeight || Number(itemWeight) <= 0) {
      alert('تکایە بەرهەم و کێش دیاری بکە');
      return;
    }

    const weight = Number(itemWeight);
    const costPerKg =
      itemFactoryCostPerKg !== '' && Number(itemFactoryCostPerKg) >= 0
        ? Number(itemFactoryCostPerKg)
        : prod.costPerKg;
    const factoryCostAmount = Math.round(weight * costPerKg);

    const newItem: DispatchItem = {
      productId: prod.id,
      productName: prod.nameKu,
      barcode: `${prod.barcodePrefix}${String(Math.round(weight * 1000)).padStart(5, '0')}`,
      weightKg: weight,
      pricePerKg: 0, // Always 0 IQD (Free) on recipient!
      totalAmount: 0,
      factoryCostPerKg: costPerKg,
      factoryCostAmount,
    };

    setItemsList([...itemsList, newItem]);
    setItemWeight('');
  };

  const handleRemoveItem = (index: number) => {
    setItemsList(itemsList.filter((_, i) => i !== index));
  };

  const getItemFactoryCost = (item: DispatchItem): number => {
    if (item.factoryCostAmount !== undefined) return item.factoryCostAmount;
    const prod = products.find(p => p.id === item.productId);
    const cost = item.factoryCostPerKg ?? (prod ? prod.costPerKg : 2750);
    return Math.round(item.weightKg * cost);
  };

  const getOrderFactoryCost = (order: DispatchOrder): number => {
    if (order.totalFactoryCost !== undefined) return order.totalFactoryCost;
    return order.items.reduce((sum, item) => sum + getItemFactoryCost(item), 0);
  };

  const totalWeight = itemsList.reduce((sum, item) => sum + item.weightKg, 0);
  const totalCost = itemsList.reduce((sum, item) => sum + getItemFactoryCost(item), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo || !recipientName.trim()) {
      alert('تکایە ژمارەی وەسڵ و ناوی وەرگر بنووسە');
      return;
    }

    if (itemsList.length === 0) {
      alert('تکایە بەلایەنی کەم یەک بەرهەم لەگەڵ کێشەکەی زیاد بکە');
      return;
    }

    addDispatch({
      manualReceiptNo,
      date,
      time,
      destinationType: 'GIFT',
      destinationName: recipientName.trim(),
      repName,
      customerName: recipientName.trim(),
      paymentType: 'CASH',
      items: itemsList,
      totalWeightKg: totalWeight,
      totalAmount: 0, // Always 0 IQD (Free on recipient)
      totalFactoryCost: totalCost, // Tracked on Factory account
      status: 'COMPLETED',
      notes,
    });

    setShowModal(false);
  };

  // Only GIFT dispatches
  const giftsList = dispatches.filter(d => d.destinationType === 'GIFT');
  const totalGiftsKg = giftsList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const totalFactoryCost = giftsList.reduce((sum, d) => sum + getOrderFactoryCost(d), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2.5">
            <Gift className="w-6 h-6 text-[#AF52DE]" />
            دیاری و هەدیە (سامپڵ و بەلاش)
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            تۆمارکردنی مریشکی بەخشراو بە ٠ دینار بۆ مارکێتەکان، تێست، یان خێرخوازی لەسەر تێچووی کۆگا
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 bg-[#AF52DE] hover:bg-[#9E45CC] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#AF52DE]/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          + تۆمارکردنی وەسڵی دیاری (هەدیە)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>کۆی کێشی بەخشراو</span>
            <div className="w-8 h-8 rounded-2xl bg-[#AF52DE]/10 text-[#AF52DE] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#AF52DE]">
            {totalGiftsKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            لە کێشی کۆگای کارگە دەرچووە
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>نرخی فرۆش بە کڕیار</span>
            <div className="w-8 h-8 rounded-2xl bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#248A3D]">
            ٠ <span className="text-xs font-medium text-[#86868B]">د.ع (بەلاش)</span>
          </div>
          <div className="mt-2 text-[11px] text-[#248A3D] font-medium">
            بێ هیچ بڕە پارەیەک
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>تێچووی لەسەر کارگە</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF9500]">
            {totalFactoryCost.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            تێچووی کڕین و بەخێوکردن
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>ژمارەی وەسڵەکانی دیاری</span>
            <div className="w-8 h-8 rounded-2xl bg-black/5 text-[#1D1D1F] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1D1D1F]">
            {giftsList.length} <span className="text-xs font-medium text-[#86868B]">وەسڵ</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            تۆمارکراوی سیستەم
          </div>
        </div>
      </div>

      {/* Table of Gifts */}
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1D1D1F]">
            لیستی وەسڵەکانی دیاری و هەدیە ({giftsList.length})
          </span>
          <span className="text-xs text-[#86868B]">بەروار و کاتژمێری دەرچوون</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">ژ. وەسڵی دەستی</th>
                <th className="p-4">بەروار و کات</th>
                <th className="p-4">ناوی وەرگر (مارکێت / لایەن)</th>
                <th className="p-4">ناوی بەخشەر / مەندوب</th>
                <th className="p-4">بەرهەمەکان</th>
                <th className="p-4">کۆی کێش (کگم)</th>
                <th className="p-4">تێچوو لەسەر کارگە</th>
                <th className="p-4">لەسەر خەڵک / وەرگر</th>
                <th className="p-4">تێبینی</th>
                <th className="p-4 text-center">وەسڵ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {giftsList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-[#86868B]">
                    هیچ وەسڵێکی دیاری تۆمار نەکراوە
                  </td>
                </tr>
              ) : (
                giftsList.map((d) => {
                  const rowFactoryCost = getOrderFactoryCost(d);
                  return (
                  <tr key={d.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4 font-bold text-[#AF52DE]">
                      <span className="bg-[#AF52DE]/10 px-2.5 py-1 rounded-full text-[11px] font-mono">
                        {d.manualReceiptNo}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="font-semibold text-[#1D1D1F]">{d.date}</div>
                      <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-[#86868B]" />
                        <span>{d.time || '10:00 ص'}</span>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-[#1D1D1F]">
                      {d.customerName || d.destinationName}
                    </td>

                    <td className="p-4 font-semibold text-[#515154]">
                      {d.repName || 'مەندوب'}
                    </td>

                    <td className="p-4 text-[#86868B]">
                      <div className="font-medium text-[#1D1D1F]">{d.items.length} جۆر بەرهەم</div>
                      <div className="text-[10px] text-[#86868B] truncate max-w-[150px]">
                        {d.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                      </div>
                    </td>

                    <td className="p-4 font-black text-[#AF52DE] text-sm">
                      {d.totalWeightKg.toLocaleString()} کگم
                    </td>

                    <td className="p-4">
                      <span className="bg-[#FF9500]/12 text-[#B25000] px-2.5 py-1 rounded-full text-[11px] font-black tabular-nums">
                        {rowFactoryCost.toLocaleString()} د.ع
                      </span>
                    </td>

                    <td className="p-4 font-bold text-[#34C759]">
                      <span className="bg-[#34C759]/10 text-[#248A3D] px-2.5 py-1 rounded-full text-[11px]">
                        ٠ د.ع (فری / بەلاش)
                      </span>
                    </td>

                    <td className="p-4 text-[#86868B]">
                      {d.notes || 'لەسەر تێچووی کۆگا'}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setShowFactoryCostOnPrint(false);
                          setSelectedReceiptForPrint(d);
                        }}
                        className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#AF52DE] transition-colors"
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

      {/* New Gift Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#AF52DE] text-white flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    تۆمارکردنی دیاری و هەدیەی نوێ (٠ دینار)
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    دەرکردنی مریشک وەک سامپڵ یان بەخشین بە ٠ دینار لەسەر تێچووی کۆگا
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    ژمارەی وەسڵی دەستی *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: G-106"
                    value={manualReceiptNo}
                    onChange={(e) => setManualReceiptNo(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] font-bold font-mono outline-none focus:border-[#AF52DE]"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کاتژمێر</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="نموونە: 10:00 ص"
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#AF52DE]" />
                    ناوی مەندوب / بەخشەر *
                  </label>
                  <input
                    type="text"
                    required
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
                    placeholder="ناوی بەخشەر..."
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#AF52DE] font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-[#FF3B30]" />
                    ناوی وەرگری دیاری (مارکێت، کەس، ڕێکخراو) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: مارکێتی گوڵزار یان ڕێکخراوی هەژاران"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#AF52DE] font-bold"
                  />
                </div>
              </div>

              {/* Notice */}
              <div className="p-3 rounded-2xl bg-[#AF52DE]/10 border border-[#AF52DE]/20 text-[#AF52DE] font-semibold flex items-center gap-2">
                <Gift className="w-4 h-4 shrink-0" />
                <span>
                  لەسەر وەرگر (خەڵک) بە تەواوی فرییە (٠ د.ع)، بەڵام نرخی تێچووەکەی لەسەر حسابی کارگە و ڕاپۆرتی قازانج و زیان تۆمار دەکرێت.
                </span>
              </div>

              {/* Line Items */}
              <div className="border border-black/[0.06] rounded-2xl p-4 bg-[#FBFBFD] space-y-3">
                <div className="font-bold text-[#1D1D1F] flex items-center justify-between">
                  <span>بەرهەمی دیاری و دیاریکردنی تێچووی کارگە</span>
                  <span className="text-[11px] font-normal text-[#86868B]">
                    نرخی تێچوو بە خۆکار لە کاڵاکان دێت و دەتوانیت بیگۆڕیت
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-[#86868B] font-semibold mb-1">
                      جۆری بەرهەم
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductChange(e.target.value)}
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
                    <label className="block text-[10px] text-[#86868B] font-semibold mb-1">
                      کێش (کگم) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="کێش (کگم) *"
                      value={itemWeight}
                      onChange={(e) => setItemWeight(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#B25000] font-semibold mb-1">
                      تێچووی کیلۆ لەسەر کارگە (د.ع)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="تێچووی کارگە"
                      value={itemFactoryCostPerKg}
                      onChange={(e) =>
                        setItemFactoryCostPerKg(e.target.value !== '' ? Number(e.target.value) : '')
                      }
                      className="w-full bg-white border border-[#FF9500]/35 rounded-xl px-3 py-2 text-[#B25000] font-black outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#AF52DE] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردنی بەرهەم بۆ وەسڵی دیاری
                </button>

                {itemsList.length > 0 && (
                  <div className="mt-3 bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F5F5F7] text-[#515154] font-semibold">
                        <tr>
                          <th className="p-2.5">بەرهەم</th>
                          <th className="p-2.5">کێش (کگم)</th>
                          <th className="p-2.5">نرخی کیلۆ (کارگە)</th>
                          <th className="p-2.5">تێچوو لەسەر کارگە</th>
                          <th className="p-2.5">لەسەر خەڵک</th>
                          <th className="p-2.5 text-center">سڕینەوە</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {itemsList.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold text-[#1D1D1F]">{item.productName}</td>
                            <td className="p-2.5 font-black text-[#AF52DE]">{item.weightKg} کگم</td>
                            <td className="p-2.5 font-semibold text-[#515154] tabular-nums">
                              {(item.factoryCostPerKg || 0).toLocaleString()} د.ع
                            </td>
                            <td className="p-2.5 font-black text-[#B25000] tabular-nums">
                              {getItemFactoryCost(item).toLocaleString()} د.ع
                            </td>
                            <td className="p-2.5 text-[#248A3D] font-bold">٠ د.ع (فری)</td>
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
              <div className="p-4 rounded-2xl bg-[#F5F5F7] border border-black/[0.05] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[#86868B] text-xs block">کۆی کێشی دیاری:</span>
                  <span className="text-base font-black text-[#AF52DE] tabular-nums">
                    {totalWeight.toLocaleString()} کگم
                  </span>
                </div>
                <div>
                  <span className="text-[#B25000] text-xs font-semibold block">
                    تێچووی گشتی لەسەر کارگە:
                  </span>
                  <span className="text-base font-black text-[#FF9500] tabular-nums">
                    {totalCost.toLocaleString()} د.ع
                  </span>
                </div>
                <div>
                  <span className="text-[#248A3D] text-xs font-semibold block">
                    لەسەر وەرگر (خەڵک):
                  </span>
                  <span className="text-base font-black text-[#248A3D]">
                    ٠ د.ع (فری)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تێبینی دەربارەی دیاری یان هۆکار..."
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#AF52DE]"
                />
              </div>

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
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#AF52DE] hover:bg-[#9E45CC] shadow-md shadow-[#AF52DE]/25 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  پەسەندکردنی وەسڵی دیاری
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
              <div className="flex items-center gap-3">
                <FactoryLogo size="md" />
                <div>
                  <h3 className="font-bold text-base text-[#1D1D1F]">وەسڵی دیاری و هەدیە (بەلاش)</h3>
                  <p className="text-[11px] text-[#86868B]">
                    {factorySettings.factoryName} • {factorySettings.phone1}
                  </p>
                </div>
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
                <span>ژمارەی وەسڵ:</span>
                <span className="font-bold text-[#AF52DE]">{selectedReceiptForPrint.manualReceiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>بەروار و کات:</span>
                <span>{selectedReceiptForPrint.date} - {selectedReceiptForPrint.time || '10:00 ص'}</span>
              </div>
              <div className="flex justify-between">
                <span>ناوی بەخشەر:</span>
                <span className="font-bold">{selectedReceiptForPrint.repName || 'مەندوب'}</span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>ناوی وەرگر:</span>
                <span className="font-bold text-[#1D1D1F]">{selectedReceiptForPrint.destinationName}</span>
              </div>

              <div className="space-y-1.5 py-2">
                <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                  <span>بەرهەم</span>
                  <div className="flex items-center gap-4">
                    <span>کێش (کگم)</span>
                    {showFactoryCostOnPrint && (
                      <span className="text-[#B25000]">تێچووی کارگە</span>
                    )}
                  </div>
                </div>
                {selectedReceiptForPrint.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.productName}</span>
                    <div className="flex items-center gap-4">
                      <span className="font-bold">{item.weightKg} کگم</span>
                      {showFactoryCostOnPrint && (
                        <span className="font-bold text-[#B25000] tabular-nums">
                          {getItemFactoryCost(item).toLocaleString()} د.ع
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                <span>کۆی گشتی کێش:</span>
                <span className="text-[#AF52DE]">{selectedReceiptForPrint.totalWeightKg} کگم</span>
              </div>
              {showFactoryCostOnPrint && (
                <div className="flex justify-between text-sm font-black text-[#B25000]">
                  <span>تێچووی لەسەر کارگە:</span>
                  <span>{getOrderFactoryCost(selectedReceiptForPrint).toLocaleString()} د.ع</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-[#34C759]">
                <span>بڕی پارە لەسەر وەرگر (خەڵک):</span>
                <span>٠ د.ع (فری / بەلاش)</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 no-print">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#515154] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showFactoryCostOnPrint}
                  onChange={(e) => setShowFactoryCostOnPrint(e.target.checked)}
                  className="rounded accent-[#FF9500]"
                />
                پیشاندانی تێچووی کارگە لەسەر وەسڵ (بۆ ژمێریاری)
              </label>

              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-[#AF52DE] hover:bg-[#9E45CC] text-white rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm"
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
