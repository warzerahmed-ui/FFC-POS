import React, { useState } from 'react';
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
} from 'lucide-react';
import { DispatchItem } from '../../types';

export const RepSalesView: React.FC = () => {
  const { dispatches, products, customers, addDispatch } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [selectedReceiptForPrint, setSelectedReceiptForPrint] = useState<any | null>(null);

  // Form States
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
  const [notes, setNotes] = useState('فرۆشی مەندوب بە وەسڵی دەستی');

  // Items for Rep Sale
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemWeight, setItemWeight] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState<number | ''>('');
  const [itemsList, setItemsList] = useState<DispatchItem[]>([]);

  // Rep presets
  const REP_PRESETS = [
    'مەندوب شوان (هێڵی بەختیاری)',
    'مەندوب هێمن (هێڵی تووی مەلیك)',
    'مەندوب ئارام (هێڵی سەرچنار و ڕاپەڕین)',
    'مەندوب کامەران (هێڵی عەربەت و شارەزوور)',
  ];

  const handleOpenModal = () => {
    setManualReceiptNo(`D-${Math.floor(800 + Math.random() * 200)}`);
    setItemsList([]);
    setItemWeight('');
    setItemPrice('');
    setNotes('فرۆشی مەندوب بە وەسڵی دەستی');
    setShowModal(true);
  };

  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod || !itemWeight || Number(itemWeight) <= 0) {
      alert('تکایە بەرهەم و کێش دیاری بکە');
      return;
    }

    const price = itemPrice !== '' ? Number(itemPrice) : prod.pricePerKg;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo) {
      alert('تکایە ژمارەی وەسڵی دەستی بنووسە');
      return;
    }

    if (itemsList.length === 0) {
      alert('تکایە بەرهەم و کێش داخل بکە');
      return;
    }

    const finalCustomer = customCustomer.trim() || customerName;

    addDispatch({
      manualReceiptNo,
      date,
      time,
      destinationType: 'REP',
      destinationName: finalCustomer,
      repName,
      customerName: finalCustomer,
      paymentType,
      driverOrRepPhone: phone,
      items: itemsList,
      totalWeightKg: totalWeight,
      totalAmount,
      status: 'COMPLETED',
      notes,
    });

    setShowModal(false);
  };

  // Only REP sales
  const repSalesList = dispatches.filter(d => d.destinationType === 'REP');
  const totalRepSalesKg = repSalesList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const totalRepSalesIQD = repSalesList.reduce((sum, d) => sum + d.totalAmount, 0);

  const creditSalesIQD = repSalesList
    .filter(d => d.paymentType === 'CREDIT' || !d.paymentType)
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const cashSalesIQD = repSalesList
    .filter(d => d.paymentType === 'CASH')
    .reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2.5">
            <Send className="w-6 h-6 text-[#0071E3]" />
            فرۆشی مەندوب بۆ مارکێتەکان
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            تۆمارکردنی فرۆشراوی مەندوبەکان بە وەسڵی دەستی، دیاریکردنی کێش و نرخ، لەگەڵ دانانی قەرز لەسەر مارکێتەکان
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          + تۆمارکردنی فرۆشی مەندوب
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>کۆی داهاتی فرۆشی مەندوبەکان</span>
            <div className="w-8 h-8 rounded-2xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1D1D1F]">
            {totalRepSalesIQD.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#0071E3] font-semibold">
            {totalRepSalesKg.toLocaleString()} کگم مریشکی فرۆشراو
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>فرۆشراوی قەرز (مارکێت)</span>
            <div className="w-8 h-8 rounded-2xl bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#FF9500]">
            {creditSalesIQD.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#34C759] font-medium">
            دەچێتە سەر کەشف حسابی مارکێت
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>فرۆشراوی کاش (نەقد)</span>
            <div className="w-8 h-8 rounded-2xl bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#248A3D]">
            {cashSalesIQD.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            پارەی وەرگیراوی دەستبەجێ
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-black/[0.06] shadow-sm">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>ژمارەی وەسڵەکانی مەندوب</span>
            <div className="w-8 h-8 rounded-2xl bg-black/5 text-[#1D1D1F] flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-[#1D1D1F]">
            {repSalesList.length} <span className="text-xs font-medium text-[#86868B]">وەسڵی دەستی</span>
          </div>
          <div className="mt-2 text-[11px] text-[#86868B] font-medium">
            تۆمارکراوی سیستەم
          </div>
        </div>
      </div>

      {/* Table of Rep Sales */}
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1D1D1F]">
            لیستی وەسڵەکانی فرۆشی مەندوب بۆ مارکێتەکان ({repSalesList.length})
          </span>
          <span className="text-xs text-[#86868B]">بەروار و کاتژمێری فەرمی</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">ژ. وەسڵی دەستی</th>
                <th className="p-4">بەروار و کات</th>
                <th className="p-4">ناوی مەندوب (فرۆشیار)</th>
                <th className="p-4">مارکێتی کڕیار</th>
                <th className="p-4">بەرهەمەکانی فرۆشراو</th>
                <th className="p-4">کۆی کێش (کگم)</th>
                <th className="p-4">کۆی بڕ (د.ع)</th>
                <th className="p-4">شێوازی پارەدان</th>
                <th className="p-4 text-center">وەسڵ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {repSalesList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[#86868B]">
                    هیچ وەسڵێکی فرۆشی مەندوب تۆمار نەکراوە
                  </td>
                </tr>
              ) : (
                repSalesList.map((d) => (
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

                    <td className="p-4 font-semibold text-[#1D1D1F]">
                      {d.repName || d.destinationName}
                    </td>

                    <td className="p-4 font-bold text-[#1D1D1F]">
                      {d.customerName || d.destinationName}
                    </td>

                    <td className="p-4 text-[#86868B]">
                      <div className="font-medium text-[#1D1D1F]">{d.items.length} جۆر بەرهەم</div>
                      <div className="text-[10px] text-[#86868B] truncate max-w-[150px]">
                        {d.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                      </div>
                    </td>

                    <td className="p-4 font-black text-[#1D1D1F] text-sm">
                      {d.totalWeightKg.toLocaleString()} کگم
                    </td>

                    <td className="p-4 font-black text-[#34C759]">
                      {d.totalAmount.toLocaleString()} د.ع
                    </td>

                    <td className="p-4">
                      {d.paymentType === 'CASH' ? (
                        <span className="text-[10px] bg-[#34C759]/10 text-[#248A3D] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                          <Banknote className="w-3 h-3" />
                          کاش (نەقد)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">
                          <CreditCard className="w-3 h-3" />
                          قەرز (لەسەر مارکێت)
                        </span>
                      )}
                    </td>

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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Rep Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] animate-in fade-in duration-200">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1D1D1F]">
                    تۆمارکردنی فرۆشی نوێی مەندوب بۆ مارکێت
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    مەندوب بار دەبات و بە وەسڵی دەستی کارگە لە مارکێت دەیفرۆشێت
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
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کاتژمێر</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="نموونە: 10:15 ص"
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none font-semibold"
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
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] font-semibold"
                  >
                    {REP_PRESETS.map((rep, idx) => (
                      <option key={idx} value={rep}>{rep}</option>
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
                      onChange={(e) => {
                        setCustomerName(e.target.value);
                        setCustomCustomer('');
                      }}
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] font-semibold"
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

              {/* Payment Type */}
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

              {/* Line Items */}
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
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) setItemPrice(prod.pricePerKg);
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

                  <div>
                    <input
                      type="number"
                      placeholder="نرخی کیلۆ (د.ع)"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-white border border-black/[0.06] rounded-xl px-3 py-2 text-[#1D1D1F] font-bold outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-2 bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردنی ئەم بەرهەمە بۆ ناو وەسڵ
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
                            <td className="p-2.5 text-[#515154]">{item.pricePerKg.toLocaleString()} د.ع</td>
                            <td className="p-2.5 font-black text-[#34C759]">{item.totalAmount.toLocaleString()} د.ع</td>
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
                  <span className="text-lg font-black text-[#34C759]">{totalAmount.toLocaleString()} د.ع</span>
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="تێبینی دەربارەی وەسڵ..."
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2.5 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
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
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-md shadow-[#0071E3]/25 flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  پەسەندکردنی فرۆشی مەندوب
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
                <h3 className="font-bold text-base text-[#1D1D1F]">وەسڵی فرۆشی مەندوب</h3>
                <p className="text-[11px] text-[#86868B]">کارگەی مریشکی فرێش - بەشی مەندوبەکان</p>
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
                <span>ژمارەی وەسڵی دەستی:</span>
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
                <span>شێوازی پارەدان:</span>
                <span className="font-bold">
                  {selectedReceiptForPrint.paymentType === 'CASH' ? 'کاش (نەقد)' : 'قەرز (لەسەر حسابی مارکێت)'}
                </span>
              </div>

              <div className="space-y-1.5 py-2">
                <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                  <span>بەرهەم</span>
                  <span>کێش / نرخ / کۆ</span>
                </div>
                {selectedReceiptForPrint.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.productName}</span>
                    <span>
                      {item.weightKg} کگم × {item.pricePerKg.toLocaleString()} = {item.totalAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                <span>کۆی گشتی کێش:</span>
                <span>{selectedReceiptForPrint.totalWeightKg} کگم</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#0071E3]">
                <span>کۆی گشتی پارە:</span>
                <span>{selectedReceiptForPrint.totalAmount.toLocaleString()} د.ع</span>
              </div>
            </div>

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
