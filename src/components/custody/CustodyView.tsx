import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardList,
  Plus,
  Send,
  RotateCcw,
  Store,
  User,
  CheckCircle,
  AlertCircle,
  Trash2,
  X,
  ArrowRight,
  PackageCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { TabType } from '../layout/Sidebar';
import { DailySettlementView } from '../accounting/DailySettlementView';

const REP_PRESETS = [
  'مەندوب شوان (هێڵی بەختیاری)',
  'مەندوب هێمن (هێڵی تووی مەلیك)',
  'مەندوب ئارام (هێڵی سەرچنار و ڕاپەڕین)',
  'مەندوب کامەران (هێڵی عەربەت و شارەزوور)',
];

const BRANCH_HOLDER_NAME = 'فرۆشگای تایبەت (POS / شۆرۆم)';

interface CustodyViewProps {
  onNavigate?: (tab: TabType) => void;
}

interface ProductBreakdown {
  productId: string;
  productName: string;
  loadedKg: number;
  soldKg: number;
  returnedKg: number;
  remainingKg: number;
}

interface HolderSummary {
  holderType: 'REP' | 'BRANCH';
  holderName: string;
  loadedKg: number;
  soldKg: number;
  returnedKg: number;
  remainingKg: number;
  products: ProductBreakdown[];
}

export const CustodyView: React.FC<CustodyViewProps> = ({ onNavigate }) => {
  const {
    products,
    dispatches,
    posSales,
    branchStock,
    branchDeliveries,
    custodyTransfers,
    loadToRepCustody,
    addBranchDelivery,
    returnUnsoldToReadyStock,
    hasAccess,
  } = useApp();

  const [custodyTab, setCustodyTab] = useState<'STOCK' | 'SETTLEMENT'>('STOCK');
  const [selectedFilterHolder, setSelectedFilterHolder] = useState<string>('ALL');

  // Modal 1: Load / Send from Ready Stock onto Rep or Store Custody Account
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadHolderKey, setLoadHolderKey] = useState<string>(REP_PRESETS[0]);
  const [loadReceiptNo, setLoadReceiptNo] = useState('');
  const [loadDate, setLoadDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadTime, setLoadTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [loadNotes, setLoadNotes] = useState('');
  const [loadProductId, setLoadProductId] = useState(products[0]?.id || '');
  const [loadWeight, setLoadWeight] = useState<number | ''>('');
  const [loadItems, setLoadItems] = useState<
    { productId: string; productName: string; weightKg: number }[]
  >([]);

  // Modal 2: Return Unsold Stock from Rep or Store Back to Ready Stock
  const [returnTarget, setReturnTarget] = useState<HolderSummary | null>(null);
  const [returnReceiptNo, setReturnReceiptNo] = useState('');
  const [returnWeights, setReturnWeights] = useState<Record<string, number>>({});
  const [returnNotes, setReturnNotes] = useState('');

  // Compute full custody balance per Rep + Dedicated Store (Branch)
  const holderSummaries: HolderSummary[] = useMemo(() => {
    const repNamesSet = new Set<string>(REP_PRESETS);
    custodyTransfers
      .filter(t => t.holderType === 'REP')
      .forEach(t => repNamesSet.add(t.holderName));
    dispatches
      .filter(d => d.destinationType === 'REP' && d.repName)
      .forEach(d => repNamesSet.add(d.repName!));

    const repSummaries: HolderSummary[] = Array.from(repNamesSet).map(repName => {
      const breakdown: ProductBreakdown[] = products
        .map(p => {
          const loadedKg = custodyTransfers
            .filter(t => t.holderType === 'REP' && t.holderName === repName && t.direction === 'LOAD')
            .reduce(
              (s, t) =>
                s +
                t.items
                  .filter(i => i.productId === p.id)
                  .reduce((is, i) => is + i.weightKg, 0),
              0
            );

          const soldKg = dispatches
            .filter(d => d.destinationType === 'REP' && (d.repName || '') === repName)
            .reduce(
              (s, d) =>
                s +
                d.items
                  .filter(i => i.productId === p.id)
                  .reduce((is, i) => is + i.weightKg, 0),
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
              (s, t) =>
                s +
                t.items
                  .filter(i => i.productId === p.id)
                  .reduce((is, i) => is + i.weightKg, 0),
              0
            );

          const remainingKg = Math.max(0, Number((loadedKg - soldKg - returnedKg).toFixed(2)));
          return {
            productId: p.id,
            productName: p.nameKu,
            loadedKg: Number(loadedKg.toFixed(2)),
            soldKg: Number(soldKg.toFixed(2)),
            returnedKg: Number(returnedKg.toFixed(2)),
            remainingKg,
          };
        })
        .filter(b => b.loadedKg > 0 || b.soldKg > 0 || b.returnedKg > 0 || b.remainingKg > 0);

      const loadedKg = Number(breakdown.reduce((s, b) => s + b.loadedKg, 0).toFixed(2));
      const soldKg = Number(breakdown.reduce((s, b) => s + b.soldKg, 0).toFixed(2));
      const returnedKg = Number(breakdown.reduce((s, b) => s + b.returnedKg, 0).toFixed(2));
      const remainingKg = Number(breakdown.reduce((s, b) => s + b.remainingKg, 0).toFixed(2));

      return {
        holderType: 'REP',
        holderName: repName,
        loadedKg,
        soldKg,
        returnedKg,
        remainingKg,
        products: breakdown,
      };
    });

    // Dedicated Store (POS / Showroom) reconciliation
    const branchBreakdown: ProductBreakdown[] = products
      .map(p => {
        const loadedKg = branchDeliveries.reduce(
          (s, d) =>
            s + d.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
          0
        );
        const soldKg = posSales.reduce(
          (s, sale) =>
            s + sale.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
          0
        );
        const returnedKg = custodyTransfers
          .filter(t => t.holderType === 'BRANCH' && t.direction === 'RETURN_TO_READY')
          .reduce(
            (s, t) =>
              s + t.items.filter(i => i.productId === p.id).reduce((is, i) => is + i.weightKg, 0),
            0
          );
        const stockMatch = branchStock.find(b => b.productId === p.id);
        const remainingKg = stockMatch ? Number(stockMatch.inStockKg.toFixed(2)) : 0;

        return {
          productId: p.id,
          productName: p.nameKu,
          loadedKg: Number(loadedKg.toFixed(2)),
          soldKg: Number(soldKg.toFixed(2)),
          returnedKg: Number(returnedKg.toFixed(2)),
          remainingKg,
        };
      })
      .filter(b => b.loadedKg > 0 || b.soldKg > 0 || b.returnedKg > 0 || b.remainingKg > 0);

    const branchSummary: HolderSummary = {
      holderType: 'BRANCH',
      holderName: BRANCH_HOLDER_NAME,
      loadedKg: Number(branchBreakdown.reduce((s, b) => s + b.loadedKg, 0).toFixed(2)),
      soldKg: Number(branchBreakdown.reduce((s, b) => s + b.soldKg, 0).toFixed(2)),
      returnedKg: Number(branchBreakdown.reduce((s, b) => s + b.returnedKg, 0).toFixed(2)),
      remainingKg: Number(branchBreakdown.reduce((s, b) => s + b.remainingKg, 0).toFixed(2)),
      products: branchBreakdown,
    };

    return [branchSummary, ...repSummaries];
  }, [products, custodyTransfers, dispatches, branchDeliveries, posSales, branchStock]);

  // Overall Totals
  const totalLoadedAll = Number(
    holderSummaries.reduce((s, h) => s + h.loadedKg, 0).toFixed(2)
  );
  const totalSoldAll = Number(
    holderSummaries.reduce((s, h) => s + h.soldKg, 0).toFixed(2)
  );
  const totalReturnedAll = Number(
    holderSummaries.reduce((s, h) => s + h.returnedKg, 0).toFixed(2)
  );
  const totalRemainingAll = Number(
    holderSummaries.reduce((s, h) => s + h.remainingKg, 0).toFixed(2)
  );

  // --- Load Modal Handlers ---
  const handleOpenLoadModal = (defaultHolder?: string) => {
    const holder = defaultHolder || REP_PRESETS[0];
    setLoadHolderKey(holder);
    setLoadReceiptNo(
      holder === 'BRANCH'
        ? `BR-${Math.floor(200 + Math.random() * 800)}`
        : `LD-${Math.floor(110 + Math.random() * 890)}`
    );
    setLoadDate(new Date().toISOString().split('T')[0]);
    setLoadTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setLoadNotes('');
    setLoadItems([]);
    setLoadProductId(products[0]?.id || '');
    setLoadWeight('');
    setShowLoadModal(true);
  };

  const handleAddLoadItem = () => {
    const prod = products.find(p => p.id === loadProductId);
    const weight = Number(loadWeight);
    if (!prod || !weight || weight <= 0) {
      alert('تکایە بەرهەم و کێش بنووسە');
      return;
    }

    const alreadyQueued = loadItems
      .filter(i => i.productId === prod.id)
      .reduce((s, i) => s + i.weightKg, 0);
    if (alreadyQueued + weight > prod.inStockKg) {
      alert(
        `بڕی پێویست لە کۆگای ئامادەدا نییە! تەنها ${(prod.inStockKg - alreadyQueued).toFixed(
          1
        )} کگم ماوە`
      );
      return;
    }

    setLoadItems(prev => [...prev, { productId: prod.id, productName: prod.nameKu, weightKg: weight }]);
    setLoadWeight('');
  };

  const handleSubmitLoad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadReceiptNo.trim() || loadItems.length === 0) {
      alert('تکایە ژمارەی وەسڵ و بەلایەنی کەم یەک بەرهەم زیاد بکە');
      return;
    }

    const totalKg = Number(loadItems.reduce((s, i) => s + i.weightKg, 0).toFixed(2));

    if (loadHolderKey === 'BRANCH') {
      const deliveryItems = loadItems.map(i => {
        const prod = products.find(p => p.id === i.productId);
        const factoryPrice = prod ? prod.costPerKg : 2750;
        return {
          productId: i.productId,
          productName: i.productName,
          weightKg: i.weightKg,
          factoryPricePerKg: factoryPrice,
          totalCost: Math.round(i.weightKg * factoryPrice),
        };
      });
      addBranchDelivery({
        manualReceiptNo: loadReceiptNo.trim(),
        date: loadDate,
        time: loadTime,
        repName: 'گەیاندنی کارگە بۆ فرۆشگای POS',
        items: deliveryItems,
        totalWeightKg: totalKg,
        totalCost: deliveryItems.reduce((s, d) => s + d.totalCost, 0),
        notes: loadNotes.trim() || 'ناردنی ڕۆژانە بۆ حسابی فرۆشگای تایبەت',
      });
    } else {
      loadToRepCustody({
        receiptNo: loadReceiptNo.trim(),
        date: loadDate,
        time: loadTime,
        holderType: 'REP',
        holderName: loadHolderKey,
        items: loadItems,
        totalWeightKg: totalKg,
        notes: loadNotes.trim() || `ناردنی ڕۆژانە بۆ عەهدەی ${loadHolderKey}`,
      });
    }

    setShowLoadModal(false);
  };

  // --- Return Unsold Modal Handlers ---
  const handleOpenReturnModal = (holder: HolderSummary) => {
    setReturnTarget(holder);
    setReturnReceiptNo(`RET-ST-${Math.floor(100 + Math.random() * 900)}`);
    const initial: Record<string, number> = {};
    holder.products.forEach(p => {
      if (p.remainingKg > 0) {
        initial[p.productId] = p.remainingKg;
      }
    });
    setReturnWeights(initial);
    setReturnNotes('');
  };

  const totalReturnBackKg = Number(
    Object.values(returnWeights)
      .reduce((s, w) => s + (w || 0), 0)
      .toFixed(2)
  );

  const handleSubmitReturnUnsold = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnTarget) return;

    const itemsToReturn = returnTarget.products
      .filter(p => (returnWeights[p.productId] || 0) > 0)
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        weightKg: Number(returnWeights[p.productId]),
      }));

    if (itemsToReturn.length === 0) {
      alert('تکایە کێشی گەڕانەوە بنووسە');
      return;
    }

    for (const item of itemsToReturn) {
      const orig = returnTarget.products.find(p => p.productId === item.productId);
      if (orig && item.weightKg > orig.remainingKg) {
        alert(
          `کێشی گەڕانەوەی ${item.productName} (${item.weightKg} کگم) ناتوانێت لە بڕی ماوەی سەر حساب (${orig.remainingKg} کگم) زیاتر بێت!`
        );
        return;
      }
    }

    returnUnsoldToReadyStock({
      receiptNo: returnReceiptNo.trim() || `RET-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      holderType: returnTarget.holderType,
      holderName: returnTarget.holderName,
      items: itemsToReturn,
      totalWeightKg: totalReturnBackKg,
      notes:
        returnNotes.trim() ||
        `گەڕانەوەی باری نەفرۆشراو لە ${returnTarget.holderName} بۆ کۆگای ئامادە`,
    });

    setReturnTarget(null);
  };

  const filteredSummaries =
    selectedFilterHolder === 'ALL'
      ? holderSummaries
      : holderSummaries.filter(h => h.holderName === selectedFilterHolder);

  // Unified chronological ledger of Load & Return back to Ready Stock
  const filteredTransfers = custodyTransfers.filter(t => {
    if (selectedFilterHolder === 'ALL') return true;
    return t.holderName === selectedFilterHolder;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`apple-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${custodyTab === 'SETTLEMENT' ? 'no-print' : ''}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/12 text-[#0071E3] flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              حسابی مەندوب و فرۆشگای تایبەت (عەهدە و تەسفییەی ڕۆژانە)
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              ناردنی ڕۆژانەی بەرهەم، کۆنترۆڵی کێشی ماوە، کەشفی حسابی فرۆش و تەسفییەی پارەی گەڕاوە
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasAccess('accounting') && (
            <div className="apple-segmented text-xs">
              <button
                type="button"
                onClick={() => setCustodyTab('STOCK')}
                className={`apple-segment-btn ${
                  custodyTab === 'STOCK' ? 'apple-segment-btn-active' : ''
                }`}
              >
                عەهدەی کاڵا (کگم)
              </button>
              <button
                type="button"
                onClick={() => setCustodyTab('SETTLEMENT')}
                className={`apple-segment-btn flex items-center gap-1 ${
                  custodyTab === 'SETTLEMENT' ? 'apple-segment-btn-active' : ''
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#34C759]" />
                کەشف و تەسفییەی پارە
              </button>
            </div>
          )}

          {custodyTab === 'STOCK' && (
            <button
              type="button"
              onClick={() => handleOpenLoadModal()}
              className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              ناردنە سەر حسابی مەندوب / فرۆشگا
            </button>
          )}

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('ready-for-sale')}
              className="px-4 py-2.5 bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#1D1D1F] font-bold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <PackageCheck className="w-4 h-4 text-[#0071E3]" />
              کۆگای ئامادە
            </button>
          )}
        </div>
      </div>

      {custodyTab === 'SETTLEMENT' && hasAccess('accounting') ? (
        <DailySettlementView />
      ) : (
        <>

      {/* Zero-Loss Balance KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-[#86868B]">کۆی نێردراو بۆ عەهدەکان</span>
          <div className="text-2xl font-black text-[#1D1D1F] tabular-nums mt-2">
            {totalLoadedAll.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#0071E3] font-semibold mt-1">
            نێردراوە لە کۆگای ئامادەوە
          </div>
        </div>

        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-[#86868B]">فرۆشراو بە وەسڵ (تەسفیەکراو)</span>
          <div className="text-2xl font-black text-[#248A3D] tabular-nums mt-2">
            {totalSoldAll.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#248A3D] font-medium mt-1">
            فرۆشی مەندوب + وەسڵی POS
          </div>
        </div>

        <div className="apple-card p-5">
          <span className="text-xs font-semibold text-[#86868B]">گەڕێنراوە بۆ کۆگای ئامادە</span>
          <div className="text-2xl font-black text-[#5856D6] tabular-nums mt-2">
            {totalReturnedAll.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-1">
            باری نەفرۆشراو گەڕاوەتەوە کۆگا
          </div>
        </div>

        <div className="apple-card p-5 border-[#FF9500]/30">
          <span className="text-xs font-semibold text-[#B25000]">
            نەفرۆشراوی ماوە لەسەر حساب
          </span>
          <div className="text-2xl font-black text-[#FF9500] tabular-nums mt-2">
            {totalRemainingAll.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#B25000] font-semibold mt-1">
            بە تەواوی لەسەر مەندوب و شۆرۆم دیارە
          </div>
        </div>
      </div>

      {/* Filter Pills by Account */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSelectedFilterHolder('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
            selectedFilterHolder === 'ALL'
              ? 'bg-[#1D1D1F] text-white'
              : 'bg-white text-[#515154] border border-black/[0.06] hover:bg-[#F5F5F7]'
          }`}
        >
          هەموو حسابەکان ({holderSummaries.length})
        </button>
        {holderSummaries.map(h => (
          <button
            key={h.holderName}
            type="button"
            onClick={() => setSelectedFilterHolder(h.holderName)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedFilterHolder === h.holderName
                ? 'bg-[#0071E3] text-white'
                : 'bg-white text-[#515154] border border-black/[0.06] hover:bg-[#F5F5F7]'
            }`}
          >
            {h.holderType === 'BRANCH' ? (
              <Store className="w-3 h-3" />
            ) : (
              <User className="w-3 h-3" />
            )}
            <span>{h.holderName.split(' (')[0]}</span>
            {h.remainingKg > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedFilterHolder === h.holderName
                    ? 'bg-white/25 text-white'
                    : 'bg-[#FF9500]/15 text-[#B25000]'
                }`}
              >
                {h.remainingKg} کگم
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Per-Account Custody Reconciliation Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredSummaries.map(holder => {
          const hasRemaining = holder.remainingKg > 0;
          return (
            <div key={holder.holderName} className="apple-card p-5 flex flex-col justify-between gap-4">
              <div>
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-black/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                        holder.holderType === 'BRANCH'
                          ? 'bg-[#AF52DE]/12 text-[#AF52DE]'
                          : 'bg-[#0071E3]/12 text-[#0071E3]'
                      }`}
                    >
                      {holder.holderType === 'BRANCH' ? (
                        <Store className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#1D1D1F]">{holder.holderName}</h3>
                      <span className="text-[10px] text-[#86868B] font-semibold">
                        {holder.holderType === 'BRANCH'
                          ? 'حسابی فرۆشگای تایبەت (POS)'
                          : 'حسابی عەهدەی مەندوب'}
                      </span>
                    </div>
                  </div>

                  {hasRemaining ? (
                    <span className="inline-flex items-center gap-1 bg-[#FF9500]/15 text-[#B25000] px-3 py-1 rounded-full text-[11px] font-black w-fit tabular-nums">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {holder.remainingKg.toLocaleString()} کگم لەسەر حساب ماوە
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-[#34C759]/12 text-[#248A3D] px-3 py-1 rounded-full text-[11px] font-bold w-fit">
                      <CheckCircle className="w-3.5 h-3.5" />
                      تەسفیەکراوە (٠ کگم)
                    </span>
                  )}
                </div>

                {/* 4-Column Reconciliation Summary */}
                <div className="grid grid-cols-4 gap-2 my-3 text-center">
                  <div className="p-2.5 rounded-xl bg-[#F5F5F7]">
                    <div className="text-[10px] text-[#86868B]">نێردراو</div>
                    <div className="text-xs font-black text-[#1D1D1F] tabular-nums mt-0.5">
                      {holder.loadedKg} کگم
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#34C759]/8">
                    <div className="text-[10px] text-[#248A3D]">فرۆشراو</div>
                    <div className="text-xs font-black text-[#248A3D] tabular-nums mt-0.5">
                      {holder.soldKg} کگم
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#5856D6]/8">
                    <div className="text-[10px] text-[#5856D6]">گەڕێنراوە</div>
                    <div className="text-xs font-black text-[#5856D6] tabular-nums mt-0.5">
                      {holder.returnedKg} کگم
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#FF9500]/10">
                    <div className="text-[10px] text-[#B25000]">ماوە</div>
                    <div className="text-xs font-black text-[#FF9500] tabular-nums mt-0.5">
                      {holder.remainingKg} کگم
                    </div>
                  </div>
                </div>

                {/* Product-by-Product Custody Breakdown */}
                {holder.products.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#86868B] bg-[#FBFBFD] rounded-2xl">
                    هێشتا هیچ بارێک نەنێردراوەتە سەر ئەم حسابە
                  </div>
                ) : (
                  <div className="rounded-2xl border border-black/[0.06] overflow-hidden">
                    <table className="w-full text-right text-[11px]">
                      <thead className="bg-[#F5F5F7] text-[#515154] font-bold">
                        <tr>
                          <th className="p-2.5">بەرهەم</th>
                          <th className="p-2.5 text-center">نێردراو</th>
                          <th className="p-2.5 text-center">فرۆشراو</th>
                          <th className="p-2.5 text-center">گەڕێنراوە</th>
                          <th className="p-2.5 text-center">ماوە لەسەر حساب</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {holder.products.map(p => (
                          <tr key={p.productId}>
                            <td className="p-2.5 font-bold text-[#1D1D1F]">{p.productName}</td>
                            <td className="p-2.5 text-center tabular-nums">{p.loadedKg} کگم</td>
                            <td className="p-2.5 text-center font-bold text-[#248A3D] tabular-nums">
                              {p.soldKg} کگم
                            </td>
                            <td className="p-2.5 text-center font-bold text-[#5856D6] tabular-nums">
                              {p.returnedKg} کگم
                            </td>
                            <td className="p-2.5 text-center font-black tabular-nums">
                              <span
                                className={
                                  p.remainingKg > 0 ? 'text-[#FF9500]' : 'text-[#86868B]'
                                }
                              >
                                {p.remainingKg} کگم
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.05]">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenLoadModal(
                      holder.holderType === 'BRANCH' ? 'BRANCH' : holder.holderName
                    )
                  }
                  className="px-3.5 py-2 rounded-full bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  ناردنی باری نوێ
                </button>

                {hasRemaining && (
                  <button
                    type="button"
                    onClick={() => handleOpenReturnModal(holder)}
                    className="px-3.5 py-2 rounded-full bg-[#5856D6] hover:bg-[#4947C2] text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    گەڕانەوەی نەفرۆشراو بۆ کۆگای ئامادە
                  </button>
                )}

                {onNavigate && (
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(holder.holderType === 'BRANCH' ? 'pos' : 'rep-sales')
                    }
                    className="mr-auto px-3 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#515154] text-[11px] font-semibold flex items-center gap-1 transition-all"
                  >
                    <ArrowRight className="w-3 h-3" />
                    تۆمارکردنی وەسڵی فرۆشتن
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Custody Movement History */}
      <div className="apple-card overflow-hidden">
        <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
          <span className="font-bold text-xs text-[#1D1D1F]">
            تۆماری جوڵەی ناردن و گەڕانەوە لە نێوان کۆگای ئامادە و عەهدەکان ({filteredTransfers.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
              <tr>
                <th className="p-4">ژ. وەسڵ</th>
                <th className="p-4">بەروار و کات</th>
                <th className="p-4">جۆری جوڵە</th>
                <th className="p-4">حسابی مەندوب / فرۆشگا</th>
                <th className="p-4">بەرهەمەکان</th>
                <th className="p-4">کۆی کێش</th>
                <th className="p-4">تێبینی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-[#86868B]">
                    هیچ جوڵەیەکی عەهدە تۆمار نەکراوە
                  </td>
                </tr>
              ) : (
                filteredTransfers.map(t => (
                  <tr key={t.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4">
                      <span className="bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
                        {t.receiptNo}
                      </span>
                    </td>
                    <td className="p-4 tabular-nums text-[11px]">
                      {t.date} • {t.time}
                    </td>
                    <td className="p-4">
                      {t.direction === 'LOAD' ? (
                        <span className="bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          نێردرا بۆ عەهدە
                        </span>
                      ) : (
                        <span className="bg-[#5856D6]/12 text-[#5856D6] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                          گەڕایەوە کۆگای ئامادە
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold">{t.holderName}</td>
                    <td className="p-4 text-[11px] text-[#515154]">
                      {t.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                    </td>
                    <td className="p-4 font-black tabular-nums">{t.totalWeightKg} کگم</td>
                    <td className="p-4 text-[11px] text-[#86868B]">{t.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Send Daily Stock to Rep or Dedicated Store Account */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    ناردنی ڕۆژانە لە کۆگای ئامادەوە بۆ حسابی مەندوب / فرۆشگا
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    لە کۆگای ئامادە دادەبەزێت و دەچێتە سەر عەهدەیان هەتا دەفرۆشرێت یان دەگەڕێنرێتەوە
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoadModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLoad} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#515154] font-semibold mb-1">
                    ناردنە سەر حسابی کێ؟ *
                  </label>
                  <select
                    value={loadHolderKey}
                    onChange={e => setLoadHolderKey(e.target.value)}
                    className="apple-input w-full px-3.5 py-2.5 font-bold"
                  >
                    <option value="BRANCH">{BRANCH_HOLDER_NAME}</option>
                    {REP_PRESETS.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">ژمارەی وەسڵ *</label>
                  <input
                    type="text"
                    required
                    value={loadReceiptNo}
                    onChange={e => setLoadReceiptNo(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بەروار *</label>
                  <input
                    type="date"
                    required
                    value={loadDate}
                    onChange={e => setLoadDate(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3">
                <div className="font-bold text-[#1D1D1F]">بەرهەمەکانی کۆگای ئامادە</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={loadProductId}
                    onChange={e => setLoadProductId(e.target.value)}
                    className="sm:col-span-2 apple-input px-3 py-2 bg-white font-semibold"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nameKu} (بەردەست: {p.inStockKg.toLocaleString()} کگم)
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="کێش (کگم) *"
                    value={loadWeight}
                    onChange={e => setLoadWeight(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input px-3 py-2 bg-white font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddLoadItem}
                  className="w-full py-2 rounded-xl bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردن بۆ لیستی ناردن
                </button>

                {loadItems.length > 0 && (
                  <div className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F5F5F7] text-[#515154]">
                        <tr>
                          <th className="p-2.5">بەرهەم</th>
                          <th className="p-2.5">کێش (کگم)</th>
                          <th className="p-2.5 text-center">سڕینەوە</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {loadItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold">{it.productName}</td>
                            <td className="p-2.5 font-black text-[#0071E3]">{it.weightKg} کگم</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => setLoadItems(loadItems.filter((_, i) => i !== idx))}
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

              <input
                type="text"
                placeholder="تێبینی (ئارەزوومەندانە)..."
                value={loadNotes}
                onChange={e => setLoadNotes(e.target.value)}
                className="apple-input w-full px-3.5 py-2"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowLoadModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  ناردنە سەر حساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Return Unsold Stock Back to Ready Stock */}
      {returnTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5856D6] text-white flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    گەڕانەوەی باری نەفرۆشراو بۆ کۆگای ئامادە
                  </h3>
                  <p className="text-[11px] text-[#86868B]">{returnTarget.holderName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnTarget(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturnUnsold} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[#515154] font-semibold mb-1">ژمارەی وەسڵی گەڕانەوە</label>
                <input
                  type="text"
                  required
                  value={returnReceiptNo}
                  onChange={e => setReturnReceiptNo(e.target.value)}
                  className="apple-input w-full px-3.5 py-2 font-mono font-bold"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3">
                <div className="font-bold text-[#1D1D1F]">
                  ئەو بەرهەمانەی لەسەر حسابی ماون (بڕی گەڕانەوە بۆ کۆگای ئامادە دیاری بکە):
                </div>

                <div className="space-y-2">
                  {returnTarget.products
                    .filter(p => p.remainingKg > 0)
                    .map(p => (
                      <div
                        key={p.productId}
                        className="p-3 rounded-xl bg-white border border-black/[0.06] flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-[#1D1D1F]">{p.productName}</div>
                          <div className="text-[10px] text-[#FF9500] font-semibold">
                            ماوە لەسەر حساب: {p.remainingKg} کگم
                          </div>
                        </div>

                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max={p.remainingKg}
                          value={
                            returnWeights[p.productId] === 0
                              ? ''
                              : returnWeights[p.productId] ?? ''
                          }
                          onChange={e =>
                            setReturnWeights(prev => ({
                              ...prev,
                              [p.productId]: e.target.value === '' ? 0 : Number(e.target.value),
                            }))
                          }
                          className="w-28 bg-[#F5F5F7] rounded-xl px-3 py-1.5 font-black text-center outline-none focus:ring-2 focus:ring-[#5856D6]/25"
                        />
                      </div>
                    ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#5856D6]/8 border border-[#5856D6]/20 flex items-center justify-between">
                <span className="font-bold text-[#1D1D1F]">
                  کۆی گشتی گەڕێنراو بۆ کۆگای ئامادە:
                </span>
                <span className="text-lg font-black text-[#5856D6] tabular-nums">
                  +{totalReturnBackKg} کگم
                </span>
              </div>

              <input
                type="text"
                placeholder="تێبینی..."
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
                className="apple-input w-full px-3.5 py-2"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setReturnTarget(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#5856D6] hover:bg-[#4947C2] flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  گەڕانەوە بۆ کۆگای ئامادە
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
