import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Truck, Plus, FileText, Search, X, Check, Scissors, ArrowLeft, Trash2 } from 'lucide-react';
import { TabType } from '../../types';

interface LiveIntakeViewProps {
  onNavigate?: (tab: TabType) => void;
  onSendToSlaughter?: (intakeId: string) => void;
}

export const LiveIntakeView: React.FC<LiveIntakeViewProps> = ({
  onNavigate,
  onSendToSlaughter,
}) => {
  const { intakes, suppliers, addIntake, addSupplier, softDeleteRecord, hasAccess } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [farmName, setFarmName] = useState('');
  const [showAddFarmBox, setShowAddFarmBox] = useState(false);
  const [newFarmName, setNewFarmName] = useState('');
  const [newFarmLocation, setNewFarmLocation] = useState('');
  const [newFarmPhone, setNewFarmPhone] = useState('');
  const [driverName, setDriverName] = useState('');
  const [birdCount, setBirdCount] = useState<number | ''>('');
  const [grossWeightKg, setGrossWeightKg] = useState<number | ''>('');
  const [tareWeightKg, setTareWeightKg] = useState<number | ''>('');
  const [pricePerKg, setPricePerKg] = useState<number | ''>(2500);
  const [paymentStatus, setPaymentStatus] = useState<'DEBT' | 'PAID' | 'PARTIAL'>('DEBT');
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');

  const farmOptions = useMemo(() => {
    const unique = new Map<string, string>();
    suppliers.forEach(s => {
      const clean = s.name.trim().replace(/\s+/g, ' ');
      if (clean && !unique.has(clean.toLowerCase())) {
        unique.set(clean.toLowerCase(), clean);
      }
    });
    intakes.forEach(i => {
      const clean = i.farmName.trim().replace(/\s+/g, ' ');
      if (clean && !unique.has(clean.toLowerCase())) {
        unique.set(clean.toLowerCase(), clean);
      }
    });
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, 'ckb'));
  }, [suppliers, intakes]);

  const handleAddNewFarm = () => {
    const cleanName = newFarmName.trim().replace(/\s+/g, ' ');
    if (!cleanName) return;

    const existing = farmOptions.find(f => f.toLowerCase() === cleanName.toLowerCase());
    if (existing) {
      setFarmName(existing);
    } else {
      addSupplier({
        name: cleanName,
        phone: newFarmPhone.trim(),
        farmLocation: newFarmLocation.trim(),
        currentBalance: 0,
      });
      setFarmName(cleanName);
    }

    setNewFarmName('');
    setNewFarmLocation('');
    setNewFarmPhone('');
    setShowAddFarmBox(false);
  };

  const netWeight = (Number(grossWeightKg) || 0) - (Number(tareWeightKg) || 0);
  const totalAmount = netWeight > 0 ? netWeight * (Number(pricePerKg) || 0) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo || !farmName || netWeight <= 0) {
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
      paidAmount: paymentStatus === 'PAID' ? totalAmount : Number(paidAmount) || 0,
      notes,
      yieldProcessed: false,
    });

    setShowModal(false);
    setShowAddFarmBox(false);
    setManualReceiptNo('');
    setFarmName('');
    setDriverName('');
    setBirdCount('');
    setGrossWeightKg('');
    setTareWeightKg('');
    setPaidAmount(0);
    setNotes('');
  };

  const filteredIntakes = intakes.filter(
    i =>
      i.manualReceiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.driverName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalNetKg = intakes.reduce((sum, i) => sum + i.netWeightKg, 0);
  const totalPurchaseCost = intakes.reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="apple-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#FF9500]/12 text-[#FF9500] flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              ١. وەرگرتنی مریشکی زیندوو (کێڵگەکان)
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              تۆمارکردنی باری هاتوو بە وەسڵی دەستی، کێشانی قەپان و ناردنی بۆ قۆناغی سەربڕین
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            وەسڵی دەستی نوێ
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('production')}
              className="px-4 py-2.5 bg-[#5856D6]/10 hover:bg-[#5856D6]/20 text-[#5856D6] font-bold text-xs rounded-full flex items-center gap-1.5 transition-all shrink-0"
            >
              قۆناغی ٢: سەربڕین
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="apple-card p-4">
          <span className="text-[11px] font-semibold text-[#86868B]">کۆی کێشی خاوێنی وەرگیراو</span>
          <div className="text-2xl font-black text-[#1D1D1F] tabular-nums mt-1">
            {totalNetKg.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
        </div>
        <div className="apple-card p-4">
          <span className="text-[11px] font-semibold text-[#86868B]">کۆی بەهای کڕین لە کێڵگە</span>
          <div className="text-2xl font-black text-[#0071E3] tabular-nums mt-1">
            {totalPurchaseCost.toLocaleString()} <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
        </div>
        <div className="apple-card p-4">
          <span className="text-[11px] font-semibold text-[#86868B]">ژمارەی وەجبە تۆمارکراوەکان</span>
          <div className="text-2xl font-black text-[#FF9500] tabular-nums mt-1">
            {intakes.length} <span className="text-xs font-medium text-[#86868B]">وەسڵ</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="apple-card p-3 flex items-center gap-2.5">
        <Search className="w-4 h-4 text-[#86868B] mr-1" />
        <input
          type="text"
          placeholder="گەڕان بەپێی ژمارەی وەسڵی دەستی، ناوی کێڵگە یان شۆفێر..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="bg-transparent text-xs text-[#1D1D1F] placeholder-[#86868B] outline-none w-full font-medium"
        />
      </div>

      {/* Clean Apple Table */}
      <div className="apple-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.06]">
              <tr>
                <th className="p-4">ژ. وەسڵی دەستی</th>
                <th className="p-4">بەروار</th>
                <th className="p-4">ناوی کێڵگە</th>
                <th className="p-4">شۆفێر / ئۆتۆمبێل</th>
                <th className="p-4 text-center">ژمارە (سەر)</th>
                <th className="p-4 text-center">کێشی خاوێن</th>
                <th className="p-4 text-center">نرخی کیلۆ</th>
                <th className="p-4 text-left">کۆی تێچوو</th>
                <th className="p-4 text-center">دۆخی پارەدان</th>
                <th className="p-4 text-center">قۆناغی ٢ (سەربڕین)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05] text-[#1D1D1F]">
              {filteredIntakes.map(intake => (
                <tr key={intake.id} className="hover:bg-[#F5F5F7]/60 transition-colors">
                  <td className="p-4">
                    <span className="bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
                      {intake.manualReceiptNo}
                    </span>
                  </td>
                  <td className="p-4 text-[#86868B] tabular-nums">{intake.date}</td>
                  <td className="p-4 font-bold text-[#1D1D1F]">{intake.farmName}</td>
                  <td className="p-4 text-[#515154]">{intake.driverName || '---'}</td>
                  <td className="p-4 text-center tabular-nums font-semibold">
                    {intake.birdCount > 0 ? intake.birdCount.toLocaleString() : '---'}
                  </td>
                  <td className="p-4 text-center font-black text-[#1D1D1F] tabular-nums">
                    {intake.netWeightKg.toLocaleString()} کگم
                  </td>
                  <td className="p-4 text-center tabular-nums text-[#515154]">
                    {intake.pricePerKg.toLocaleString()} د.ع
                  </td>
                  <td className="p-4 text-left font-black text-[#1D1D1F] tabular-nums">
                    {intake.totalAmount.toLocaleString()} د.ع
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                        intake.paymentStatus === 'PAID'
                          ? 'bg-[#34C759]/12 text-[#248A3D]'
                          : intake.paymentStatus === 'PARTIAL'
                          ? 'bg-[#FF9500]/12 text-[#B25000]'
                          : 'bg-[#FF3B30]/12 text-[#D70015]'
                      }`}
                    >
                      {intake.paymentStatus === 'PAID'
                        ? 'نەقد دراوە'
                        : intake.paymentStatus === 'PARTIAL'
                        ? 'بەشێکی دراوە'
                        : 'قەرزی سەر کارگە'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {intake.remainingLiveWeightKg > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSendToSlaughter
                              ? onSendToSlaughter(intake.id)
                              : onNavigate?.('production')
                          }
                          className="px-3 py-1.5 rounded-full bg-[#5856D6]/12 hover:bg-[#5856D6] text-[#5856D6] hover:text-white font-bold text-[11px] inline-flex items-center gap-1 transition-all"
                          title={`ماوە: ${intake.remainingLiveWeightKg} کگم`}
                        >
                          <Scissors className="w-3 h-3" />
                          سەربڕین ({intake.remainingLiveWeightKg.toLocaleString()} کگم)
                        </button>
                      ) : (
                        <span className="text-[10px] bg-[#34C759]/12 text-[#248A3D] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          تەواو سەربڕاوە
                        </span>
                      )}
                      {hasAccess('settings') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`وەسڵی وەرگرتنی #${intake.manualReceiptNo} بخرێتە سەبەتەی سۆفت دیلیت؟`)) {
                              softDeleteRecord('INTAKE', intake.id, 'سڕینەوەی خێرا لە وەرگرتنی کێڵگە');
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apple Sheet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl overflow-hidden shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0071E3]" />
                تۆمارکردنی وەجبەی نوێ بە وەسڵی دەستی
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">ژمارەی وەسڵی دەستی *</label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: M-5420"
                    value={manualReceiptNo}
                    onChange={e => setManualReceiptNo(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="apple-input w-full px-3.5 py-2"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#515154] font-semibold">ناوی کێڵگە / فرۆشیار *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddFarmBox(prev => !prev)}
                      className="text-[11px] font-bold text-[#0071E3] hover:text-[#0077ED] flex items-center gap-0.5 transition-colors"
                    >
                      {showAddFarmBox ? (
                        <>پاشگەزبوونەوە</>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          کێڵگەی نوێ
                        </>
                      )}
                    </button>
                  </div>

                  <select
                    required
                    value={farmName}
                    onChange={e => setFarmName(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold text-[#1D1D1F]"
                  >
                    <option value="">کێڵگەیەک هەڵبژێرە...</option>
                    {farmOptions.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>

                  {showAddFarmBox && (
                    <div className="mt-2 p-3 rounded-2xl bg-[#F5F5F7] border border-black/[0.06] space-y-2">
                      <input
                        type="text"
                        placeholder="ناوی کێڵگەی نوێ (بۆ نموونە: کێڵگەی شەهیدان)..."
                        value={newFarmName}
                        onChange={e => setNewFarmName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewFarm();
                          }
                        }}
                        className="apple-input w-full px-3 py-1.5 text-xs font-semibold bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="ناونیشان / شوێن (ئارەزوومەندانە)"
                          value={newFarmLocation}
                          onChange={e => setNewFarmLocation(e.target.value)}
                          className="apple-input w-full px-3 py-1.5 text-[11px] bg-white"
                        />
                        <input
                          type="text"
                          placeholder="مۆبایل (ئارەزوومەندانە)"
                          value={newFarmPhone}
                          onChange={e => setNewFarmPhone(e.target.value)}
                          dir="ltr"
                          className="apple-input w-full px-3 py-1.5 text-[11px] bg-white text-left"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddNewFarm}
                        disabled={!newFarmName.trim()}
                        className="w-full py-1.5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white font-bold text-[11px] flex items-center justify-center gap-1 transition-all"
                      >
                        <Check className="w-3.5 h-3.5" />
                        زیادکردن و هەڵبژاردنی کێڵگە
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">شۆفێر / تابلۆی ئۆتۆمبێل</label>
                  <input
                    type="text"
                    placeholder="ناوی شۆفێر..."
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    className="apple-input w-full px-3.5 py-2"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">ژمارەی مریشک (سەر)</label>
                  <input
                    type="number"
                    placeholder="1500"
                    value={birdCount}
                    onChange={e => setBirdCount(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input w-full px-3.5 py-2 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">نرخی کڕینی کیلۆ (د.ع) *</label>
                  <input
                    type="number"
                    required
                    value={pricePerKg}
                    onChange={e => setPricePerKg(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input w-full px-3.5 py-2 font-bold tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کێشی گشتی بە سەیارە (قەپان) کگم *</label>
                  <input
                    type="number"
                    required
                    placeholder="14000"
                    value={grossWeightKg}
                    onChange={e => setGrossWeightKg(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input w-full px-3.5 py-2 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کێشی بەتاڵ (تەفریق) کگم *</label>
                  <input
                    type="number"
                    required
                    placeholder="10000"
                    value={tareWeightKg}
                    onChange={e => setTareWeightKg(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input w-full px-3.5 py-2 tabular-nums"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#0071E3]/6 border border-[#0071E3]/15 flex items-center justify-between">
                <div>
                  <span className="text-[#86868B] block text-[11px]">کێشی خاوێنی زیندوو:</span>
                  <span className="text-xl font-black text-[#0071E3] tabular-nums">
                    {netWeight > 0 ? netWeight.toLocaleString() : 0} کگم
                  </span>
                </div>
                <div className="text-left">
                  <span className="text-[#86868B] block text-[11px]">کۆی پارەی کڕین:</span>
                  <span className="text-xl font-black text-[#1D1D1F] tabular-nums">
                    {totalAmount.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">دۆخی پارەدان</label>
                  <select
                    value={paymentStatus}
                    onChange={e => setPaymentStatus(e.target.value as 'DEBT' | 'PAID' | 'PARTIAL')}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
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
                      onChange={e => setPaidAmount(e.target.value ? Number(e.target.value) : '')}
                      className="apple-input w-full px-3.5 py-2 tabular-nums"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#515154] rounded-full font-semibold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-full shadow-sm"
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
