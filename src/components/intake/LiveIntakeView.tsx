import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, Plus, FileText, Search } from 'lucide-react';

export const LiveIntakeView: React.FC = () => {
  const { intakes, addIntake } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [farmName, setFarmName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [birdCount, setBirdCount] = useState<number | ''>('');
  const [grossWeightKg, setGrossWeightKg] = useState<number | ''>('');
  const [tareWeightKg, setTareWeightKg] = useState<number | ''>('');
  const [pricePerKg, setPricePerKg] = useState<number | ''>(2500);
  const [paymentStatus, setPaymentStatus] = useState<'DEBT' | 'PAID' | 'PARTIAL'>('DEBT');
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');

  const netWeight = (Number(grossWeightKg) || 0) - (Number(tareWeightKg) || 0);
  const totalAmount = netWeight > 0 ? netWeight * (Number(pricePerKg) || 0) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo || !farmName || netWeight <= 0) {
      alert('تکایە هەموو خانە سەرەکییەکان و ژمارەی وەسڵی دەستی و کێش بە دروستی پڕبکەرەوە');
      return;
    }

    addIntake({
      manualReceiptNo,
      date,
      farmName,
      driverName,
      birdCount: Number(birdCount) || 0,
      grossWeightKg: Number(grossWeightKg) || 0,
      tareWeightKg: Number(tareWeightKg) || 0,
      netWeightKg: netWeight,
      pricePerKg: Number(pricePerKg) || 0,
      totalAmount,
      paymentStatus,
      paidAmount: paymentStatus === 'PAID' ? totalAmount : (Number(paidAmount) || 0),
      notes,
      yieldProcessed: false,
    });

    setShowModal(false);
    setManualReceiptNo('');
    setFarmName('');
    setDriverName('');
    setBirdCount('');
    setGrossWeightKg('');
    setTareWeightKg('');
    setPaidAmount(0);
    setNotes('');
  };

  const filteredIntakes = intakes.filter(i =>
    i.manualReceiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.driverName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-[#0071E3]" />
            وەرگرتنی مریشکی زیندوو لە کێڵگەکان
          </h2>
          <p className="text-xs text-[#86868B] mt-1">
            تۆمارکردنی باری هاتوو بە وەسڵی دەستی، کێشانی قەپان، چاودێری کێشی سەربڕدراو و ئەوەندەی ماوەتەوە لە هەر وەسڵێک
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          تۆمارکردنی وەسڵی دەستی نوێ
        </button>
      </div>

      {/* Apple Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-black/[0.06] p-3.5 rounded-2xl shadow-sm">
        <Search className="w-4 h-4 text-[#86868B]" />
        <input
          type="text"
          placeholder="گەڕان بەپێی ژمارەی وەسڵی دەستی، ناوی کێڵگە یان شۆفێر..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs text-[#1D1D1F] placeholder-[#86868B] outline-none w-full"
        />
      </div>

      {/* Table of Intakes */}
      <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">ژ. وەسڵی دەستی</th>
                <th className="p-4">بەروار</th>
                <th className="p-4">ناوی کێڵگە</th>
                <th className="p-4">کێشی زیندووی کڕدراو</th>
                <th className="p-4">سەربڕدراو تا ئێستا</th>
                <th className="p-4">ماوە لەم وەسڵە</th>
                <th className="p-4">نرخی کیلۆ</th>
                <th className="p-4">کۆی تێچوو</th>
                <th className="p-4">دۆخی پارەدان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {filteredIntakes.map((intake) => (
                <tr key={intake.id} className="hover:bg-[#FBFBFD] transition-colors">
                  <td className="p-4 font-bold text-[#0071E3]">
                    <span className="bg-[#0071E3]/10 px-2.5 py-1 rounded-full text-[11px]">
                      {intake.manualReceiptNo}
                    </span>
                  </td>
                  <td className="p-4 text-[#86868B]">{intake.date}</td>
                  <td className="p-4 font-bold text-[#1D1D1F]">{intake.farmName}</td>
                  <td className="p-4 font-black text-[#1D1D1F] text-sm">
                    {intake.netWeightKg.toLocaleString()} کگم
                  </td>
                  <td className="p-4 font-bold text-[#0071E3]">
                    {intake.processedLiveWeightKg.toLocaleString()} کگم
                  </td>
                  <td className="p-4 font-black text-[#FF9500]">
                    {intake.remainingLiveWeightKg.toLocaleString()} کگم
                  </td>
                  <td className="p-4">{intake.pricePerKg.toLocaleString()} د.ع</td>
                  <td className="p-4 font-black text-[#1D1D1F]">
                    {intake.totalAmount.toLocaleString()} د.ع
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        intake.paymentStatus === 'PAID'
                          ? 'bg-[#34C759]/10 text-[#248A3D]'
                          : intake.paymentStatus === 'PARTIAL'
                          ? 'bg-[#FF9500]/10 text-[#FF9500]'
                          : 'bg-[#FF3B30]/10 text-[#FF3B30]'
                      }`}
                    >
                      {intake.paymentStatus === 'PAID'
                        ? 'نەقد دراوە'
                        : intake.paymentStatus === 'PARTIAL'
                        ? 'بەشێکی دراوە'
                        : 'قەرزی سەر کارگە'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apple Sheet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1D1D1F] flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#0071E3]" />
                تۆمارکردنی وەجبەی نوێ بەپێی وەسڵی دەستی
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    ژمارەی وەسڵی دەستی *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: M-5420"
                    value={manualReceiptNo}
                    onChange={(e) => setManualReceiptNo(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    ناوی کێڵگە / فرۆشیار *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="کێڵگەی حاجی کەمال..."
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    شۆفێر / تابلۆی ئۆتۆمبێل
                  </label>
                  <input
                    type="text"
                    placeholder="ناوی شۆفێر..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    ژمارەی مریشک (سەر)
                  </label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={birdCount}
                    onChange={(e) => setBirdCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    نرخی کڕینی هەر کیلۆیەک (د.ع) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="2500"
                    value={pricePerKg}
                    onChange={(e) => setPricePerKg(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    کێشی گشتی بە سەیارە (قەپان) کگم *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="14000"
                    value={grossWeightKg}
                    onChange={(e) => setGrossWeightKg(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">
                    کێشی بەتاڵ (تەفریق) کگم *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={tareWeightKg}
                    onChange={(e) => setTareWeightKg(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Apple Calculation Card */}
              <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 flex items-center justify-between">
                <div>
                  <span className="text-[#86868B] block text-[11px]">کێشی خاوێنی زیندوو:</span>
                  <span className="text-xl font-black text-[#0071E3]">
                    {netWeight > 0 ? netWeight.toLocaleString() : 0} کگم
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[#86868B] block text-[11px]">کۆی پارەی کڕین:</span>
                  <span className="text-xl font-black text-[#1D1D1F]">
                    {totalAmount.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              {/* Payment Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">دۆخی پارەدان</label>
                  <select
                    value={paymentStatus}
                    onChange={(e: any) => setPaymentStatus(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none font-medium"
                  >
                    <option value="DEBT">قەرزی سەر کارگە (دواتر دەدرێت)</option>
                    <option value="PAID">نەقد تەواو دراوە</option>
                    <option value="PARTIAL">بەشێکی دراوە</option>
                  </select>
                </div>

                {paymentStatus === 'PARTIAL' && (
                  <div>
                    <label className="block text-[#515154] font-semibold mb-1">بڕی دراو (د.ع)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] rounded-full font-semibold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold rounded-full shadow-sm shadow-[#0071E3]/25"
                >
                  تۆمارکردن لە سیستەم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
