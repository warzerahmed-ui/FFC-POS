import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Factory,
  Plus,
  Scale,
  CheckCircle,
  ArrowLeft,
  Scissors,
  TrendingUp,
  AlertCircle,
  X,
  Truck,
} from 'lucide-react';
import { FactoryPipelineStepper } from '../layout/FactoryPipelineStepper';
import { TabType } from '../layout/Sidebar';
import { LiveIntake } from '../../types';

interface SlaughterCuttingViewProps {
  onNavigate: (tab: TabType) => void;
  preselectedIntakeId?: string | null;
  onClearPreselect?: () => void;
}

export const SlaughterCuttingView: React.FC<SlaughterCuttingViewProps> = ({
  onNavigate,
  preselectedIntakeId,
  onClearPreselect,
}) => {
  const { intakes, yields, products, addYieldRecord } = useApp();

  const [showModal, setShowModal] = useState(false);
  const [selectedIntakeId, setSelectedIntakeId] = useState('');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchLiveWeightKg, setBatchLiveWeightKg] = useState<number | ''>('');
  const [cutWeights, setCutWeights] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [justCompletedReceipt, setJustCompletedReceipt] = useState<string | null>(null);

  const pendingIntakes = useMemo(
    () => intakes.filter(i => i.remainingLiveWeightKg > 0),
    [intakes]
  );

  const openSlaughterModal = (intake?: LiveIntake) => {
    const target = intake || pendingIntakes[0];
    setSelectedIntakeId(target?.id || '');
    setBatchDate(new Date().toISOString().split('T')[0]);
    setBatchLiveWeightKg(target ? target.remainingLiveWeightKg : '');
    const initial: Record<string, number> = {};
    products.forEach(p => {
      initial[p.id] = 0;
    });
    setCutWeights(initial);
    setNotes('');
    setShowModal(true);
  };

  useEffect(() => {
    if (preselectedIntakeId) {
      const target = intakes.find(i => i.id === preselectedIntakeId && i.remainingLiveWeightKg > 0);
      if (target) {
        openSlaughterModal(target);
      }
      if (onClearPreselect) onClearPreselect();
    }
  }, [preselectedIntakeId, intakes]);

  const selectedIntake = intakes.find(i => i.id === selectedIntakeId);
  const liveKgNum = Number(batchLiveWeightKg) || 0;
  const dressedWeightKg = Object.values(cutWeights).reduce((s, w) => s + (w || 0), 0);
  const wasteWeightKg = Math.max(0, Number((liveKgNum - dressedWeightKg).toFixed(2)));
  const yieldPercentage =
    liveKgNum > 0 ? Number(((dressedWeightKg / liveKgNum) * 100).toFixed(1)) : 0;
  const wastePercentage =
    liveKgNum > 0 ? Number(((wasteWeightKg / liveKgNum) * 100).toFixed(1)) : 0;

  // Overall KPIs
  const totalProcessedLiveKg = yields.reduce((s, y) => s + y.batchLiveWeightKg, 0);
  const totalDressedKg = yields.reduce((s, y) => s + y.dressedWeightKg, 0);
  const totalWaitingLiveKg = pendingIntakes.reduce((s, i) => s + i.remainingLiveWeightKg, 0);
  const avgYieldPct =
    totalProcessedLiveKg > 0
      ? Number(((totalDressedKg / totalProcessedLiveKg) * 100).toFixed(1))
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntake) {
      alert('تکایە وەجبەیەکی وەرگیراو لە کێڵگە دیاری بکە');
      return;
    }
    if (liveKgNum <= 0 || liveKgNum > selectedIntake.remainingLiveWeightKg) {
      alert(
        `کێشی زیندوو دەبێت لە نێوان 1 و ${selectedIntake.remainingLiveWeightKg} کگم بێت`
      );
      return;
    }
    if (dressedWeightKg <= 0) {
      alert('تکایە کێشی بەرهەمە پارچەکراوەکان بنووسە');
      return;
    }

    const cuts = products
      .filter(p => (cutWeights[p.id] || 0) > 0)
      .map(p => ({
        productId: p.id,
        productName: p.nameKu,
        weightKg: Number(cutWeights[p.id]),
      }));

    addYieldRecord({
      intakeId: selectedIntake.id,
      manualReceiptNo: selectedIntake.manualReceiptNo,
      farmName: selectedIntake.farmName,
      date: batchDate,
      batchLiveWeightKg: liveKgNum,
      dressedWeightKg,
      wasteWeightKg,
      yieldPercentage,
      wastePercentage,
      cuts,
      notes: notes.trim() || 'سەربڕین و پارچەکردن بۆ کۆگای ئامادە بۆ فرۆشتن',
    });

    setJustCompletedReceipt(selectedIntake.manualReceiptNo);
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Connected 3-Stage Pipeline Stepper */}
      <FactoryPipelineStepper activeStage="production" onNavigate={onNavigate} />

      {/* Header */}
      <div className="apple-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#5856D6]/12 text-[#5856D6] flex items-center justify-center shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              ٢. سەربڕین و پارچەکردن
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              وەرگرتنی مریشکی زیندوو لە قۆناغی یەکەم، سەربڕین و پارچەکردن، و ناردنی بۆ قۆناغی ئامادە بۆ فرۆشتن
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openSlaughterModal()}
            disabled={pendingIntakes.length === 0}
            className="px-5 py-2.5 bg-[#5856D6] hover:bg-[#4947C2] disabled:opacity-40 text-white font-bold text-xs rounded-full shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            سەربڕین و پارچەکردنی نوێ
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ready-for-sale')}
            className="px-4 py-2.5 bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] font-bold text-xs rounded-full flex items-center gap-1.5 transition-all"
          >
            چوون بۆ ئامادە بۆ فرۆشتن
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hand-off confirmation banner */}
      {justCompletedReceipt && (
        <div className="p-4 rounded-2xl bg-[#34C759]/12 border border-[#34C759]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#1B7A34]">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>
              وەجبەی [{justCompletedReceipt}] سەربڕدرا و پارچەکان ڕاستەوخۆ نێردرانە ناو کۆگای{' '}
              <strong>ئامادە بۆ فرۆشتن</strong>!
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ready-for-sale')}
            className="px-4 py-1.5 rounded-full bg-[#248A3D] text-white text-xs font-bold flex items-center gap-1.5 w-fit"
          >
            فرۆشتن لە ئامادە بۆ فرۆشتن
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-card p-4">
          <div className="flex items-center justify-between text-[#86868B] text-[11px] font-semibold">
            <span>چاوەڕوانی سەربڕین (لە کێڵگەوە)</span>
            <Truck className="w-4 h-4 text-[#FF9500]" />
          </div>
          <div className="text-2xl font-black text-[#FF9500] tabular-nums mt-1">
            {totalWaitingLiveKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] mt-1">{pendingIntakes.length} وەجبەی ماوە</div>
        </div>

        <div className="apple-card p-4">
          <div className="flex items-center justify-between text-[#86868B] text-[11px] font-semibold">
            <span>کۆی سەربڕدراوی زیندوو</span>
            <Scale className="w-4 h-4 text-[#5856D6]" />
          </div>
          <div className="text-2xl font-black text-[#1D1D1F] tabular-nums mt-1">
            {totalProcessedLiveKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] mt-1">{yields.length} وەجبە</div>
        </div>

        <div className="apple-card p-4">
          <div className="flex items-center justify-between text-[#86868B] text-[11px] font-semibold">
            <span>بەرهەمی پارچەکراوی ئامادە</span>
            <Scissors className="w-4 h-4 text-[#34C759]" />
          </div>
          <div className="text-2xl font-black text-[#248A3D] tabular-nums mt-1">
            {totalDressedKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#248A3D] mt-1 font-medium">
            نێردراوە بۆ ئامادە بۆ فرۆشتن
          </div>
        </div>

        <div className="apple-card p-4">
          <div className="flex items-center justify-between text-[#86868B] text-[11px] font-semibold">
            <span>ڕێژەی گشتی سافی (Yield)</span>
            <TrendingUp className="w-4 h-4 text-[#0071E3]" />
          </div>
          <div className="text-2xl font-black text-[#0071E3] tabular-nums mt-1">{avgYieldPct}%</div>
          <div className="text-[11px] text-[#86868B] mt-1">ڕێژەی گۆشتی سافی</div>
        </div>
      </div>

      {/* Pending Live Batches from Stage 1 */}
      <div className="apple-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-[#1D1D1F]">
              باری زیندووی هاتوو لە قۆناغی وەرگرتن (چاوەڕوانی سەربڕین)
            </h3>
            <p className="text-[11px] text-[#86868B]">
              کرتە لەسەر هەر وەجبەیەک بکە بۆ سەربڕین و پارچەکردنی ڕاستەوخۆ
            </p>
          </div>
        </div>

        {pendingIntakes.length === 0 ? (
          <div className="p-5 rounded-2xl bg-[#F5F5F7] text-center text-xs text-[#86868B] flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#86868B]" />
              هەموو وەجبەکانی وەرگیراو سەربڕدراون!
            </span>
            <button
              type="button"
              onClick={() => onNavigate('intake')}
              className="px-4 py-1.5 rounded-full bg-white border border-black/[0.08] text-[#0071E3] font-bold text-xs"
            >
              تۆمارکردنی وەجبەی نوێ لە کێڵگە
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingIntakes.map(intake => (
              <div
                key={intake.id}
                className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="bg-[#FF9500]/12 text-[#FF9500] px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
                      {intake.manualReceiptNo}
                    </span>
                    <span className="text-[11px] text-[#86868B]">{intake.date}</span>
                  </div>
                  <div className="font-bold text-xs text-[#1D1D1F]">{intake.farmName}</div>
                  <div className="text-[11px] text-[#86868B] mt-1 tabular-nums">
                    کۆی وەرگیراو: {intake.netWeightKg.toLocaleString()} کگم • ماوە:{' '}
                    <strong className="text-[#FF9500]">
                      {intake.remainingLiveWeightKg.toLocaleString()} کگم
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openSlaughterModal(intake)}
                  className="w-full py-2 rounded-full bg-[#5856D6] hover:bg-[#4947C2] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Scissors className="w-3.5 h-3.5" />
                  سەربڕین و پارچەکردنی ئەم وەجبەیە
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slaughtering & Cutting History Table */}
      <div className="apple-card overflow-hidden">
        <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1D1D1F]">
            تۆماری سەربڕین و پارچەکردن ({yields.length})
          </span>
          <span className="text-[11px] text-[#86868B]">
            هەموو پارچەکان ڕاستەوخۆ چوونەتە قۆناغی ئامادە بۆ فرۆشتن
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">وەسڵی کێڵگە</th>
                <th className="p-4">بەروار</th>
                <th className="p-4">کێڵگە</th>
                <th className="p-4">کێشی زیندوو</th>
                <th className="p-4">کۆی پارچەکراو</th>
                <th className="p-4">ڕێژەی سافی</th>
                <th className="p-4">بەرهەمە ئامادەکراوەکان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {yields.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#86868B]">
                    هیچ تۆمارێکی سەربڕین نییە
                  </td>
                </tr>
              ) : (
                yields.map(y => (
                  <tr key={y.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4">
                      <span className="bg-[#5856D6]/10 text-[#5856D6] px-2.5 py-1 rounded-full font-mono text-[11px] font-bold">
                        {y.manualReceiptNo}
                      </span>
                    </td>
                    <td className="p-4 font-medium tabular-nums">{y.date}</td>
                    <td className="p-4 font-bold">{y.farmName}</td>
                    <td className="p-4 font-semibold tabular-nums">
                      {y.batchLiveWeightKg.toLocaleString()} کگم
                    </td>
                    <td className="p-4 font-black text-[#248A3D] tabular-nums">
                      {y.dressedWeightKg.toLocaleString()} کگم
                    </td>
                    <td className="p-4 font-bold text-[#0071E3] tabular-nums">
                      {y.yieldPercentage}%
                    </td>
                    <td className="p-4 text-[11px] text-[#515154]">
                      {y.cuts.map(c => `${c.productName} (${c.weightKg} کگم)`).join('، ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slaughtering & Cutting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5856D6] text-white flex items-center justify-center">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    سەربڕین و پارچەکردن بۆ ئامادەکردنی فرۆشتن
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    پارچەکان ڕاستەوخۆ دەچنە ناو کۆگای قۆناغی ٣ (ئامادە بۆ فرۆشتن)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#515154] font-semibold mb-1">
                    وەجبەی وەرگیراو لە کێڵگە *
                  </label>
                  <select
                    value={selectedIntakeId}
                    onChange={e => {
                      setSelectedIntakeId(e.target.value);
                      const found = intakes.find(i => i.id === e.target.value);
                      if (found) setBatchLiveWeightKg(found.remainingLiveWeightKg);
                    }}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  >
                    {pendingIntakes.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.manualReceiptNo} - {i.farmName} (ماوە: {i.remainingLiveWeightKg} کگم)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={batchDate}
                    onChange={e => setBatchDate(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">
                  کێشی زیندووی سەربڕدراو لەم وەجبەیە (کگم) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  max={selectedIntake?.remainingLiveWeightKg}
                  value={batchLiveWeightKg}
                  onChange={e =>
                    setBatchLiveWeightKg(e.target.value ? Number(e.target.value) : '')
                  }
                  className="apple-input w-full px-3.5 py-2.5 font-black text-base"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3">
                <div className="font-bold text-[#1D1D1F]">
                  پارچەکردن و بەرهەمە ئامادەبووەکان (کگم):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {products.map(p => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white border border-black/[0.06] flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-[#1D1D1F] text-xs">{p.nameKu}</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0 کگم"
                        value={cutWeights[p.id] === 0 ? '' : cutWeights[p.id] || ''}
                        onChange={e =>
                          setCutWeights(prev => ({
                            ...prev,
                            [p.id]: e.target.value === '' ? 0 : Number(e.target.value),
                          }))
                        }
                        className="w-24 bg-[#F5F5F7] rounded-xl px-2.5 py-1.5 font-black text-center outline-none focus:ring-2 focus:ring-[#5856D6]/25"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#5856D6]/8 border border-[#5856D6]/20 grid grid-cols-3 gap-3 text-center">
                <div>
                  <span className="text-[10px] text-[#86868B] block">گۆشتی پارچەکراو</span>
                  <span className="text-base font-black text-[#248A3D]">
                    {dressedWeightKg.toLocaleString()} کگم
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] block">پەڕ و فەوتان</span>
                  <span className="text-base font-black text-[#FF3B30]">
                    {wasteWeightKg.toLocaleString()} کگم ({wastePercentage}%)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] block">ڕێژەی سافی</span>
                  <span className="text-base font-black text-[#5856D6]">{yieldPercentage}%</span>
                </div>
              </div>

              <input
                type="text"
                placeholder="تێبینی (ئارەزوومەندانە)..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="apple-input w-full px-3.5 py-2"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#5856D6] hover:bg-[#4947C2] shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  تۆمارکردن و ناردن بۆ ئامادە بۆ فرۆشتن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
