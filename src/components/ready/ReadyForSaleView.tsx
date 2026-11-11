import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PackageCheck,
  CheckCircle,
  Edit3,
  Boxes,
  X,
  RotateCcw,
  RefreshCw,
  ClipboardList,
  ArrowUpRight,
} from 'lucide-react';
import { ProductItem, ReturnOrder } from '../../types';
import { FactoryPipelineStepper } from '../layout/FactoryPipelineStepper';
import { TabType } from '../layout/Sidebar';

type SubTabType = 'inventory' | 'returns-conversion';

interface ReadyForSaleViewProps {
  onNavigate?: (tab: TabType) => void;
}

export const ReadyForSaleView: React.FC<ReadyForSaleViewProps> = ({ onNavigate }) => {
  const {
    products,
    custodyTransfers,
    branchDeliveries,
    returns,
    convertReturnOrder,
    updateProductPrice,
  } = useApp();

  const [subTab, setSubTab] = useState<SubTabType>('inventory');

  // 3-Day Return Conversion Modal States
  const [convertingReturn, setConvertingReturn] = useState<ReturnOrder | null>(null);
  const [convertedWeights, setConvertedWeights] = useState<Record<string, number>>({});
  const [conversionNotes, setConversionNotes] = useState('');

  // Edit Price Modal States
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editPricePerKg, setEditPricePerKg] = useState<number | ''>('');
  const [editCostPerKg, setEditCostPerKg] = useState<number | ''>('');

  // Derived Metrics
  const pendingReturns = useMemo(
    () => returns.filter(r => !r.conversionStatus || r.conversionStatus === 'PENDING'),
    [returns]
  );

  const convertedReturns = useMemo(
    () => returns.filter(r => r.conversionStatus === 'CONVERTED'),
    [returns]
  );

  const sortedReturns = useMemo(
    () => [...pendingReturns, ...convertedReturns],
    [pendingReturns, convertedReturns]
  );

  const totalStockKg = products.reduce((sum, p) => sum + p.inStockKg, 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.inStockKg * p.pricePerKg, 0);
  const totalLoadedOutKg =
    custodyTransfers
      .filter(t => t.direction === 'LOAD')
      .reduce((s, t) => s + t.totalWeightKg, 0) +
    branchDeliveries.reduce((s, b) => s + b.totalWeightKg, 0);
  const totalReturnedUnsoldKg = custodyTransfers
    .filter(t => t.direction === 'RETURN_TO_READY')
    .reduce((s, t) => s + t.totalWeightKg, 0);
  const pendingReturnsKg = pendingReturns.reduce((s, r) => s + r.totalWeightKg, 0);
  const convertedOutputKg = convertedReturns.reduce(
    (s, r) => s + (r.convertedOutputs?.reduce((cs, o) => cs + o.weightKg, 0) || 0),
    0
  );

  // --- 3-Day Return Conversion Handlers ---
  const handleOpenConvertModal = (ret: ReturnOrder) => {
    setConvertingReturn(ret);
    const initial: Record<string, number> = {};
    products.forEach(p => {
      initial[p.id] = 0;
    });
    setConvertedWeights(initial);
    setConversionNotes('');
  };

  const totalConvertedKg = Object.values(convertedWeights).reduce((s, w) => s + (w || 0), 0);

  const handleSubmitConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingReturn) return;

    if (totalConvertedKg > convertingReturn.totalWeightKg) {
      alert(
        `کێشی گۆڕدراو (${totalConvertedKg} کگم) ناتوانێت لە کێشی گەڕاوە (${convertingReturn.totalWeightKg} کگم) زیاتر بێت!`
      );
      return;
    }

    const outputs = products
      .map(p => ({
        productId: p.id,
        productName: p.nameKu,
        weightKg: Number(convertedWeights[p.id] || 0),
      }))
      .filter(o => o.weightKg > 0);

    convertReturnOrder(
      convertingReturn.id,
      outputs,
      conversionNotes.trim() ||
        (outputs.length > 0
          ? 'گۆڕدرا بۆ بەرهەمی تر و خرایەوە ناو کۆگای ئامادە بۆ فرۆشتن'
          : 'تەلەف کرا')
    );

    setConvertingReturn(null);
  };

  // --- Price Edit Handlers ---
  const handleOpenEditPrice = (prod: ProductItem) => {
    setEditingProduct(prod);
    setEditPricePerKg(prod.pricePerKg);
    setEditCostPerKg(prod.costPerKg);
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    updateProductPrice(
      editingProduct.id,
      Number(editPricePerKg) || editingProduct.pricePerKg,
      Number(editCostPerKg) || editingProduct.costPerKg
    );
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      {onNavigate && (
        <FactoryPipelineStepper activeStage="ready-for-sale" onNavigate={onNavigate} />
      )}

      {/* Header */}
      <div className="apple-card p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0071E3]/12 text-[#0071E3] flex items-center justify-center shrink-0">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#1D1D1F] tracking-tight">
              ٣. کۆگای ئامادە بۆ فرۆشتن و گۆڕینی گەڕاوەکان
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              بەڕێوەبردنی کۆگای ئامادە، نرخەکان، و گۆڕینی گەڕاوەی ٣ ڕۆژ (مەندوب و شۆرۆم) بۆ شێوازی تر و خستنەوە ناو کۆگا
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('custody')}
              className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <ClipboardList className="w-4 h-4" />
              ناردن بۆ حسابی مەندوب و شۆرۆم (قۆناغی ٤)
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setSubTab('returns-conversion')}
            className="px-4 py-2.5 bg-[#FF9500]/12 hover:bg-[#FF9500]/20 text-[#B25000] font-bold text-xs rounded-full flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            گەڕاوەی ٣ ڕۆژ ({pendingReturns.length} چاوەڕوان)
          </button>
        </div>
      </div>

      {/* Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>کۆگای ئامادە بۆ فرۆشتن</span>
            <div className="w-8 h-8 rounded-full bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1D1D1F] tabular-nums">
            {totalStockKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#0071E3] font-semibold mt-2 tabular-nums">
            بەهای کۆگا: {totalStockValue.toLocaleString()} د.ع
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>نێردراو بۆ مەندوب و شۆرۆم</span>
            <div className="w-8 h-8 rounded-full bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#248A3D] tabular-nums">
            {totalLoadedOutKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-2 tabular-nums">
            نەفرۆشراوی گەڕاوە بۆ کۆگا: {totalReturnedUnsoldKg.toLocaleString()} کگم
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>گەڕاوەی ٣ ڕۆژ (چاوەڕوانی گۆڕین)</span>
            <div className="w-8 h-8 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#FF3B30] tabular-nums">
            {pendingReturnsKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#FF9500] font-semibold mt-2">
            {pendingReturns.length} وەسڵ چاوەڕوانی گۆڕینی شێوازە
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>گۆڕدراو و گەڕێنراوە بۆ کۆگا</span>
            <div className="w-8 h-8 rounded-full bg-[#5856D6]/10 text-[#5856D6] flex items-center justify-center">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#5856D6] tabular-nums">
            {convertedOutputKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-2">
            لە {convertedReturns.length} وەسڵی گەڕاوە دروستکراوەتەوە
          </div>
        </div>
      </div>

      {/* Segmented Sub-Tabs */}
      <div className="inline-flex p-1 rounded-2xl bg-black/[0.05] flex-wrap gap-1">
        <button
          type="button"
          onClick={() => setSubTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'inventory'
              ? 'bg-white text-[#1D1D1F] shadow-sm'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <PackageCheck className="w-3.5 h-3.5 text-[#0071E3]" />
          کۆگای ئامادە ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('returns-conversion')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'returns-conversion'
              ? 'bg-white text-[#1D1D1F] shadow-sm'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#FF9500]" />
          گەڕاوەی ٣ ڕۆژ و گۆڕینی شێواز ({pendingReturns.length})
        </button>
      </div>

      {/* SubTab 1: Ready Inventory Cards */}
      {subTab === 'inventory' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(prod => {
            const isOut = prod.inStockKg <= 0;
            const isLow = prod.inStockKg > 0 && prod.inStockKg < 100;
            return (
              <div
                key={prod.id}
                className="apple-card apple-card-hover p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-[#86868B] bg-[#F5F5F7] px-2.5 py-0.5 rounded-full">
                      #{prod.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isOut
                          ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                          : isLow
                          ? 'bg-[#FF9500]/12 text-[#FF9500]'
                          : 'bg-[#34C759]/12 text-[#248A3D]'
                      }`}
                    >
                      {isOut ? 'تەواو بووە' : isLow ? 'کەم بووەتەوە' : 'ئامادەیە لە کۆگا'}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">{prod.nameKu}</h3>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="text-[11px] text-[#86868B]">بڕی بەردەست لە کۆگا</div>
                      <div className="text-2xl font-black text-[#1D1D1F] tabular-nums mt-0.5">
                        {prod.inStockKg.toLocaleString()}{' '}
                        <span className="text-xs font-medium text-[#86868B]">کگم</span>
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-[11px] text-[#86868B]">نرخی فرۆشی کیلۆ</div>
                      <div className="text-base font-black text-[#0071E3] tabular-nums mt-0.5">
                        {prod.pricePerKg.toLocaleString()}{' '}
                        <span className="text-[10px] font-medium">د.ع</span>
                      </div>
                      <div className="text-[10px] text-[#86868B] tabular-nums">
                        تێچوو: {prod.costPerKg.toLocaleString()} د.ع
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/[0.05] flex items-center gap-2">
                  {onNavigate && (
                    <button
                      type="button"
                      disabled={isOut}
                      onClick={() => onNavigate('custody')}
                      className="flex-1 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      ناردن بۆ مەندوب / شۆرۆم
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenEditPrice(prod)}
                    className="px-3.5 py-2 rounded-full bg-[#F5F5F7] hover:bg-[#E8E8ED] text-[#515154] text-xs font-semibold flex items-center gap-1 transition-all"
                    title="گۆڕینی نرخ"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    نرخ
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SubTab 2: 3-Day Returns Come Back Here -> Convert to Another Form */}
      {subTab === 'returns-conversion' && (
        <div className="apple-card overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-xs text-[#1D1D1F] block">
                گەڕاوەکانی ٣ ڕۆژ لە مەندوب و شۆرۆمەوە (گۆڕینی شێواز و دووبارە ناردنەوە بۆ فرۆشتن)
              </span>
              <span className="text-[11px] text-[#86868B]">
                هەر گەڕاوەیەکی ٣ ڕۆژ (لە مارکێتەکانی مەندوب یان ناو شۆرۆم) دێتە ئێرە و دەتوانیت بیگۆڕیت بۆ شێوازێکی تر (وەک سنگ، ڕان، ئێسک و شلمک...) تا خۆکار بچێتەوە ناو کۆگای ئامادە
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. وەسڵ</th>
                  <th className="p-4">بەروار</th>
                  <th className="p-4">سەرچاوە (مەندوب / شۆرۆم)</th>
                  <th className="p-4">بەرهەمی گەڕاوە</th>
                  <th className="p-4">کێشی گەڕاوە</th>
                  <th className="p-4">دۆخی گۆڕین</th>
                  <th className="p-4 text-center">کردار</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {sortedReturns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#86868B]">
                      هیچ گەڕاوەیەکی ٣ ڕۆژ نەگەڕاوەتەوە
                    </td>
                  </tr>
                ) : (
                  sortedReturns.map(r => {
                    const isConverted = r.conversionStatus === 'CONVERTED';
                    return (
                      <tr key={r.id} className="hover:bg-[#FBFBFD] transition-colors">
                        <td className="p-4 font-mono font-bold text-[#FF3B30]">
                          <div>{r.manualReceiptNo}</div>
                          {r.salesReceiptNo && (
                            <div className="text-[10px] text-[#0071E3]">
                              سەر وەسڵی: {r.salesReceiptNo}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-semibold">{r.date}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                r.sourceType === 'BRANCH'
                                  ? 'bg-[#AF52DE]/12 text-[#AF52DE]'
                                  : 'bg-[#0071E3]/12 text-[#0071E3]'
                              }`}
                            >
                              {r.sourceType === 'BRANCH' ? 'شۆرۆم POS' : 'مەندوب'}
                            </span>
                            <span className="font-bold">{r.customerName || r.sourceName}</span>
                          </div>
                          {r.repName && (
                            <div className="text-[10px] text-[#86868B] mt-0.5">{r.repName}</div>
                          )}
                        </td>
                        <td className="p-4 text-[11px] text-[#515154]">
                          {r.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                        </td>
                        <td className="p-4 font-black text-[#FF3B30] tabular-nums">
                          {r.totalWeightKg} کگم
                        </td>
                        <td className="p-4">
                          {isConverted ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#34C759]/12 text-[#248A3D] text-[10px] font-bold">
                                <CheckCircle className="w-3 h-3" />
                                گۆڕدرا بۆ کۆگای ئامادە ({r.convertedAt})
                              </span>
                              {r.convertedOutputs && r.convertedOutputs.length > 0 && (
                                <div className="text-[10px] text-[#515154]">
                                  بووە بە:{' '}
                                  {r.convertedOutputs
                                    .map(o => `${o.productName} (${o.weightKg} کگم)`)
                                    .join('، ')}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FF9500]/15 text-[#B25000] text-[10px] font-bold">
                              چاوەڕوانی گۆڕین
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {!isConverted ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(r)}
                              className="px-3.5 py-1.5 rounded-full bg-[#5856D6] hover:bg-[#4947C2] text-white font-bold text-[11px] flex items-center gap-1 mx-auto shadow-xs transition-all"
                            >
                              <RefreshCw className="w-3 h-3" />
                              گۆڕین بۆ شێوازی تر
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#248A3D] font-bold">تەواوبوو</span>
                          )}
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

      {/* Modal 1: Convert 3-Day Return Into Another Product / Form */}
      {convertingReturn && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#5856D6] text-white flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    گۆڕینی گەڕاوەی ٣ ڕۆژ بۆ شێوازی تر
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    وەسڵی {convertingReturn.salesReceiptNo || convertingReturn.manualReceiptNo} •{' '}
                    {convertingReturn.customerName || convertingReturn.sourceName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConvertingReturn(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitConversion} className="p-6 space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#FF3B30]/5 border border-[#FF3B30]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-[#1D1D1F] block">
                    گەڕاوەی هاتووەوە بۆ کۆگای ئامادە:
                  </span>
                  <span className="text-[11px] text-[#515154]">
                    {convertingReturn.items
                      .map(i => `${i.productName} (${i.weightKg} کگم)`)
                      .join('، ')}
                  </span>
                </div>
                <div className="text-lg font-black text-[#FF3B30] tabular-nums">
                  {convertingReturn.totalWeightKg} کگم
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3">
                <div className="font-bold text-[#1D1D1F]">
                  دەگۆڕدرێت بۆ چ بەرهەم / شێوازێکی تر؟ (کێش بە کگم بنووسە — خۆکار دەچێتەوە کۆگای ئامادە تا دووبارە بنێردرێت بۆ فرۆشتن):
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
                        max={convertingReturn.totalWeightKg}
                        placeholder="0 کگم"
                        value={convertedWeights[p.id] === 0 ? '' : convertedWeights[p.id] || ''}
                        onChange={e =>
                          setConvertedWeights(prev => ({
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

              <div className="p-4 rounded-2xl bg-[#5856D6]/8 border border-[#5856D6]/20 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-[#86868B] block">کێشی گەڕاوە</span>
                  <span className="text-sm font-black text-[#1D1D1F]">
                    {convertingReturn.totalWeightKg} کگم
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] block">گۆڕدراو بۆ شێوازی تر</span>
                  <span className="text-sm font-black text-[#248A3D]">
                    {totalConvertedKg.toLocaleString()} کگم
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] block">فەوتانی کۆتایی</span>
                  <span className="text-sm font-black text-[#FF3B30]">
                    {Math.max(0, Number((convertingReturn.totalWeightKg - totalConvertedKg).toFixed(2)))} کگم
                  </span>
                </div>
              </div>

              <input
                type="text"
                placeholder="تێبینی گۆڕین (بۆ نموونە: کراوەتە سنگی مریشک یان ئێسک و شلمک)..."
                value={conversionNotes}
                onChange={e => setConversionNotes(e.target.value)}
                className="apple-input w-full px-3.5 py-2"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setConvertingReturn(null)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#5856D6] hover:bg-[#4947C2] shadow-md flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  تۆمارکردنی گۆڕین و زیادکردن بۆ کۆگا
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Product Price */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-md p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <h3 className="font-bold text-sm text-[#1D1D1F]">
                دەستکاری نرخی: {editingProduct.nameKu}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#515154] font-semibold mb-1">
                  نرخی فرۆشتنی کیلۆ (د.ع)
                </label>
                <input
                  type="number"
                  required
                  value={editPricePerKg}
                  onChange={e =>
                    setEditPricePerKg(e.target.value ? Number(e.target.value) : '')
                  }
                  className="apple-input w-full px-3.5 py-2.5 font-black text-base"
                />
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێچووی کیلۆ (د.ع)</label>
                <input
                  type="number"
                  required
                  value={editCostPerKg}
                  onChange={e =>
                    setEditCostPerKg(e.target.value ? Number(e.target.value) : '')
                  }
                  className="apple-input w-full px-3.5 py-2.5 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED]"
                >
                  پاشەکەوتکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
