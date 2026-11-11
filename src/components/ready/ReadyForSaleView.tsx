import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  PackageCheck,
  Plus,
  ShoppingCart,
  Factory,
  Banknote,
  CreditCard,
  Printer,
  Trash2,
  CheckCircle,
  Edit3,
  Clock,
  Boxes,
  X,
  RotateCcw,
  RefreshCw,
  Send,
  Store,
  User,
  ClipboardList,
} from 'lucide-react';
import { DispatchItem, DispatchOrder, ProductItem, ReturnOrder } from '../../types';
import { FactoryPipelineStepper } from '../layout/FactoryPipelineStepper';
import { TabType } from '../layout/Sidebar';

type SubTabType = 'inventory' | 'returns-conversion' | 'dispatches';
type OutgoingChannel = 'REP' | 'BRANCH' | 'DIRECT';

const REP_PRESETS = [
  'مەندوب شوان (هێڵی بەختیاری)',
  'مەندوب هێمن (هێڵی تووی مەلیك)',
  'مەندوب ئارام (هێڵی سەرچنار و ڕاپەڕین)',
  'مەندوب کامەران (هێڵی عەربەت و شارەزوور)',
];

interface ReadyForSaleViewProps {
  onNavigate?: (tab: TabType) => void;
}

export const ReadyForSaleView: React.FC<ReadyForSaleViewProps> = ({ onNavigate }) => {
  const {
    products,
    dispatches,
    branchDeliveries,
    returns,
    customers,
    addDispatch,
    addBranchDelivery,
    loadToRepCustody,
    convertReturnOrder,
    updateProductPrice,
  } = useApp();

  const [subTab, setSubTab] = useState<SubTabType>('inventory');

  // Outgoing Daily Dispatch / Sale Modal States
  const [showSendModal, setShowSendModal] = useState(false);
  const [channel, setChannel] = useState<OutgoingChannel>('REP');
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [sendDate, setSendDate] = useState(new Date().toISOString().split('T')[0]);
  const [sendTime, setSendTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [repName, setRepName] = useState(REP_PRESETS[0]);
  const [customerChoice, setCustomerChoice] = useState<string>(customers[0]?.name || 'CASH_WALKIN');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CREDIT');
  const [sendNotes, setSendNotes] = useState('');

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemWeight, setItemWeight] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState<number | ''>(products[0]?.pricePerKg || '');
  const [queuedItems, setQueuedItems] = useState<DispatchItem[]>([]);

  // 3-Day Return Conversion Modal States
  const [convertingReturn, setConvertingReturn] = useState<ReturnOrder | null>(null);
  const [convertedWeights, setConvertedWeights] = useState<Record<string, number>>({});
  const [conversionNotes, setConversionNotes] = useState('');

  // Edit Price Modal States
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editPricePerKg, setEditPricePerKg] = useState<number | ''>('');
  const [editCostPerKg, setEditCostPerKg] = useState<number | ''>('');

  // Print Modal
  const [printOrder, setPrintOrder] = useState<DispatchOrder | null>(null);

  // Derived Metrics
  const outgoingDispatches = useMemo(
    () => dispatches.filter(d => d.destinationType === 'REP' || d.destinationType === 'DIRECT'),
    [dispatches]
  );

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
  const totalSentKg =
    outgoingDispatches.reduce((s, d) => s + d.totalWeightKg, 0) +
    branchDeliveries.reduce((s, b) => s + b.totalWeightKg, 0);
  const totalSentIQD =
    outgoingDispatches.reduce((s, d) => s + d.totalAmount, 0) +
    branchDeliveries.reduce((s, b) => s + b.totalCost, 0);
  const pendingReturnsKg = pendingReturns.reduce((s, r) => s + r.totalWeightKg, 0);
  const convertedOutputKg = convertedReturns.reduce(
    (s, r) => s + (r.convertedOutputs?.reduce((cs, o) => cs + o.weightKg, 0) || 0),
    0
  );

  // --- Send for Sale Handlers ---
  const handleOpenSendModal = (preselectProduct?: ProductItem, defaultChannel: OutgoingChannel = 'REP') => {
    const targetProd = preselectProduct || products.find(p => p.inStockKg > 0) || products[0];
    setChannel(defaultChannel);
    setManualReceiptNo(
      defaultChannel === 'BRANCH'
        ? `BR-${Math.floor(200 + Math.random() * 800)}`
        : defaultChannel === 'DIRECT'
        ? `S-${Math.floor(100 + Math.random() * 900)}`
        : `D-${Math.floor(800 + Math.random() * 200)}`
    );
    setSendDate(new Date().toISOString().split('T')[0]);
    setSendTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setRepName(REP_PRESETS[0]);
    setCustomerChoice(customers[0]?.name || 'CASH_WALKIN');
    setCustomCustomerName('');
    setPaymentType(defaultChannel === 'DIRECT' ? 'CASH' : 'CREDIT');
    setSendNotes('');
    setQueuedItems([]);
    if (targetProd) {
      setSelectedProductId(targetProd.id);
      setItemPrice(targetProd.pricePerKg);
    }
    setItemWeight('');
    setShowSendModal(true);
  };

  const handleChannelChange = (newChannel: OutgoingChannel) => {
    setChannel(newChannel);
    if (newChannel === 'BRANCH') {
      setManualReceiptNo(`BR-${Math.floor(200 + Math.random() * 800)}`);
    } else if (newChannel === 'DIRECT') {
      setManualReceiptNo(`S-${Math.floor(100 + Math.random() * 900)}`);
      setPaymentType('CASH');
      setCustomerChoice('CASH_WALKIN');
    } else {
      setManualReceiptNo(`D-${Math.floor(800 + Math.random() * 200)}`);
      setPaymentType('CREDIT');
      setCustomerChoice(customers[0]?.name || 'CASH_WALKIN');
    }
  };

  const handleAddQueuedItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    const weight = Number(itemWeight);
    if (!prod || !weight || weight <= 0) {
      alert('تکایە بەرهەم و کێش بنووسە');
      return;
    }

    const alreadyQueuedKg = queuedItems
      .filter(i => i.productId === prod.id)
      .reduce((s, i) => s + i.weightKg, 0);
    if (alreadyQueuedKg + weight > prod.inStockKg) {
      alert(
        `بڕی پێویست لە کۆگای ئامادەدا نییە! تەنها ${(
          prod.inStockKg - alreadyQueuedKg
        ).toFixed(1)} کگم ماوە لە ${prod.nameKu}`
      );
      return;
    }

    const price = itemPrice !== '' ? Number(itemPrice) : prod.pricePerKg;
    setQueuedItems(prev => [
      ...prev,
      {
        productId: prod.id,
        productName: prod.nameKu,
        barcode: `${prod.barcodePrefix}${String(Math.round(weight * 1000)).padStart(5, '0')}`,
        weightKg: weight,
        pricePerKg: price,
        totalAmount: Math.round(weight * price),
      },
    ]);
    setItemWeight('');
  };

  const queuedTotalKg = queuedItems.reduce((s, i) => s + i.weightKg, 0);
  const queuedTotalIQD = queuedItems.reduce((s, i) => s + i.totalAmount, 0);

  const handleSubmitSend = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReceipt = manualReceiptNo.trim();
    if (!cleanReceipt) {
      alert('تکایە ژمارەی وەسڵ بنووسە');
      return;
    }
    if (queuedItems.length === 0) {
      alert('تکایە بەلایەنی کەم یەک بەرهەم زیاد بکە');
      return;
    }

    if (channel === 'BRANCH') {
      addBranchDelivery({
        manualReceiptNo: cleanReceipt,
        date: sendDate,
        time: sendTime,
        repName,
        items: queuedItems.map(i => ({
          productId: i.productId,
          productName: i.productName,
          weightKg: i.weightKg,
          factoryPricePerKg: i.pricePerKg,
          totalCost: i.totalAmount,
        })),
        totalWeightKg: queuedTotalKg,
        totalCost: queuedTotalIQD,
        notes: sendNotes.trim() || 'ناردنی ڕۆژانە لە کۆگای ئامادەوە بۆ فرۆشگای POS',
      });
    } else if (channel === 'REP') {
      loadToRepCustody({
        receiptNo: cleanReceipt,
        date: sendDate,
        time: sendTime,
        holderType: 'REP',
        holderName: repName,
        items: queuedItems.map(i => ({
          productId: i.productId,
          productName: i.productName,
          weightKg: i.weightKg,
        })),
        totalWeightKg: queuedTotalKg,
        notes: sendNotes.trim() || `ناردنی ڕۆژانە بۆ حسابی مەندوب (${repName})`,
      });
    } else {
      const finalCustomer =
        customerChoice === 'CASH_WALKIN'
          ? 'کڕیاری ڕاستەوخۆ (کارگە)'
          : customerChoice === 'CUSTOM'
          ? customCustomerName.trim() || 'کڕیاری نوێ'
          : customerChoice;

      if (customerChoice === 'CASH_WALKIN' && paymentType === 'CREDIT') {
        alert('بۆ فرۆشی قەرز تکایە ناوی مارکێت یان کڕیار دیاری بکە');
        return;
      }

      addDispatch({
        manualReceiptNo: cleanReceipt,
        date: sendDate,
        time: sendTime,
        destinationType: 'DIRECT',
        destinationName: finalCustomer,
        customerName: finalCustomer,
        repName: 'فرۆشتنی ڕاستەوخۆی کۆگای ئامادە',
        paymentType,
        items: queuedItems,
        totalWeightKg: queuedTotalKg,
        totalAmount: queuedTotalIQD,
        status: 'COMPLETED',
        notes: sendNotes.trim() || 'فرۆشتنی ڕاستەوخۆ لە کۆگای ئامادە',
      });
    }

    setShowSendModal(false);
  };

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
      .filter(p => (convertedWeights[p.id] || 0) > 0)
      .map(p => ({
        productId: p.id,
        productName: p.nameKu,
        weightKg: Number(convertedWeights[p.id]),
      }));

    convertReturnOrder(
      convertingReturn.id,
      outputs,
      conversionNotes.trim() ||
        (outputs.length > 0
          ? 'گۆڕدراوە بۆ شێوازی تر و خرایەوە ناو کۆگای ئامادە'
          : 'تەلەفی تەواو / بێ بەکارهێنانەوە')
    );

    setConvertingReturn(null);
  };

  // Price editing
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
              ٣. کۆگای ئامادە بۆ فرۆشتن و گۆڕینی گەڕاوە
            </h2>
            <p className="text-xs text-[#86868B] mt-0.5">
              ناردنی ڕۆژانە بۆ مەندوب، فرۆشگای POS و فرۆشتنی ڕاستەوخۆ • وەرگرتنەوەی گەڕاوەی ٣ ڕۆژ و گۆڕینی بۆ شێوازی تر
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenSendModal(undefined, 'REP')}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            ناردنی ڕۆژانە بۆ فرۆشتن
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('custody')}
              className="px-4 py-2.5 bg-[#AF52DE]/12 hover:bg-[#AF52DE]/20 text-[#AF52DE] font-bold text-xs rounded-full flex items-center gap-1.5 transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              حسابی مەندوب و فرۆشگا
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
            بەها: {totalStockValue.toLocaleString()} د.ع
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>نێردراوی ڕۆژانە بۆ فرۆشتن</span>
            <div className="w-8 h-8 rounded-full bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#248A3D] tabular-nums">
            {totalSentKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-2 tabular-nums">
            بەها: {totalSentIQD.toLocaleString()} د.ع
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
            {pendingReturns.length} وەسڵ گەڕاوەتەوە بۆ ئەم بەشە
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>گۆڕدراو بۆ شێوازی تر</span>
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
          گەڕاوەی ٣ ڕۆژ و گۆڕین ({pendingReturns.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('dispatches')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'dispatches'
              ? 'bg-white text-[#1D1D1F] shadow-sm'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <Send className="w-3.5 h-3.5 text-[#34C759]" />
          تۆماری نێردراو بۆ فرۆشتن ({outgoingDispatches.length + branchDeliveries.length})
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
                      <div className="text-[11px] text-[#86868B]">نرخی کیلۆ</div>
                      <div className="text-base font-black text-[#0071E3] tabular-nums mt-0.5">
                        {prod.pricePerKg.toLocaleString()}{' '}
                        <span className="text-[10px] font-medium">د.ع</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-black/[0.05] flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isOut}
                    onClick={() => handleOpenSendModal(prod, 'REP')}
                    className="flex-1 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    ناردن بۆ فرۆشتن
                  </button>

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
                گەڕاوەکانی ٣ ڕۆژ (هاتووەوە بۆ کۆگای ئامادە)
              </span>
              <span className="text-[11px] text-[#86868B]">
                هەر گەڕاوەیەک پاش ٣ ڕۆژ دەگەڕێتەوە ئێرە و دەتوانیت بیگۆڕیت بۆ شێواز یان بەرهەمێکی تر (وەک سنگ، ڕان، ئێسک و شلمک...)
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. وەسڵ</th>
                  <th className="p-4">بەروار</th>
                  <th className="p-4">مارکێت / سەرچاوە</th>
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
                        <td className="p-4">
                          <span className="bg-[#FF3B30]/10 text-[#FF3B30] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
                            {r.salesReceiptNo || r.manualReceiptNo}
                          </span>
                        </td>
                        <td className="p-4 font-medium tabular-nums">{r.date}</td>
                        <td className="p-4 font-bold">{r.customerName || r.sourceName}</td>
                        <td className="p-4 text-[#515154] text-[11px]">
                          {r.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                        </td>
                        <td className="p-4 font-black text-[#FF3B30] tabular-nums">
                          {r.totalWeightKg} کگم
                        </td>
                        <td className="p-4">
                          {isConverted ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 bg-[#34C759]/12 text-[#248A3D] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                                <CheckCircle className="w-3 h-3" />
                                گۆڕدراوە بۆ شێوازی تر
                              </span>
                              {r.convertedOutputs && r.convertedOutputs.length > 0 ? (
                                <div className="text-[10px] text-[#5856D6] font-semibold">
                                  ←{' '}
                                  {r.convertedOutputs
                                    .map(o => `${o.productName} (${o.weightKg} کگم)`)
                                    .join('، ')}
                                </div>
                              ) : (
                                <div className="text-[10px] text-[#86868B]">
                                  تەلەفی تەواو (٠ کگم گۆڕدراو)
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-[#FF9500]/12 text-[#B25000] px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                              چاوەڕوانی گۆڕین
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {!isConverted ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConvertModal(r)}
                              className="px-3.5 py-1.5 rounded-full bg-[#5856D6] hover:bg-[#4947C2] text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                            >
                              <RefreshCw className="w-3 h-3" />
                              گۆڕین بۆ شێوازی تر
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#86868B]">{r.convertedAt || 'تەواو'}</span>
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

      {/* SubTab 3: Outgoing Daily Dispatches */}
      {subTab === 'dispatches' && (
        <div className="apple-card overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
            <span className="font-bold text-xs text-[#1D1D1F]">
              تۆماری ناردنی ڕۆژانە لە کۆگای ئامادەوە بۆ فرۆشتن ({outgoingDispatches.length + branchDeliveries.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. وەسڵ</th>
                  <th className="p-4">بەروار و کات</th>
                  <th className="p-4">ئاڕاستەی فرۆشتن</th>
                  <th className="p-4">کڕیار / شۆرۆم</th>
                  <th className="p-4">بەرهەمەکان</th>
                  <th className="p-4">کێش (کگم)</th>
                  <th className="p-4">بڕی پارە (د.ع)</th>
                  <th className="p-4 text-center">وەسڵ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {outgoingDispatches.map(d => (
                  <tr key={d.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4">
                      <span className="bg-[#0071E3]/10 text-[#0071E3] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
                        {d.manualReceiptNo}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{d.date}</div>
                      <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {d.time || '09:00 ص'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          d.destinationType === 'REP'
                            ? 'bg-[#0071E3]/10 text-[#0071E3]'
                            : 'bg-[#34C759]/12 text-[#248A3D]'
                        }`}
                      >
                        {d.destinationType === 'REP' ? 'نێردراو بۆ مەندوب' : 'فرۆشتنی ڕاستەوخۆ'}
                      </span>
                    </td>
                    <td className="p-4 font-bold">{d.customerName || d.destinationName}</td>
                    <td className="p-4 text-[11px] text-[#515154]">
                      {d.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                    </td>
                    <td className="p-4 font-black tabular-nums">{d.totalWeightKg} کگم</td>
                    <td className="p-4 font-black text-[#248A3D] tabular-nums">
                      {d.totalAmount.toLocaleString()} د.ع
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => setPrintOrder(d)}
                        className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#0071E3]"
                        title="پرینت"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {branchDeliveries.map(b => (
                  <tr key={b.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4">
                      <span className="bg-[#AF52DE]/10 text-[#AF52DE] px-2.5 py-1 rounded-full text-[11px] font-mono font-bold">
                        {b.manualReceiptNo}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold">{b.date}</div>
                      <div className="text-[10px] text-[#86868B]">{b.time}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-[#AF52DE]/12 text-[#AF52DE]">
                        نێردراو بۆ فرۆشگای POS
                      </span>
                    </td>
                    <td className="p-4 font-bold">فرۆشگای شۆرۆم ({b.repName})</td>
                    <td className="p-4 text-[11px] text-[#515154]">
                      {b.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                    </td>
                    <td className="p-4 font-black tabular-nums">{b.totalWeightKg} کگم</td>
                    <td className="p-4 font-black text-[#AF52DE] tabular-nums">
                      {b.totalCost.toLocaleString()} د.ع
                    </td>
                    <td className="p-4 text-center text-[#86868B] text-[10px]">شۆرۆم</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal 1: Send Daily Ready Stock to Sales (Rep / Showroom POS / Direct) */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    ناردنی ڕۆژانە لە کۆگای ئامادەوە بۆ فرۆشتن
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    هەڵبژاردنی بەشی فرۆشتن: مەندوب، فرۆشگای POS، یان فرۆشتنی ڕاستەوخۆ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSendModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSend} className="p-6 space-y-4 text-xs">
              {/* Destination Channel Selector */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleChannelChange('REP')}
                  className={`p-3 rounded-2xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                    channel === 'REP'
                      ? 'bg-[#0071E3]/10 border-[#0071E3] text-[#0071E3]'
                      : 'bg-[#F5F5F7] border-transparent text-[#515154]'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  ناردن بۆ مەندوب
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelChange('BRANCH')}
                  className={`p-3 rounded-2xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                    channel === 'BRANCH'
                      ? 'bg-[#AF52DE]/10 border-[#AF52DE] text-[#AF52DE]'
                      : 'bg-[#F5F5F7] border-transparent text-[#515154]'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  فرۆشگای POS
                </button>

                <button
                  type="button"
                  onClick={() => handleChannelChange('DIRECT')}
                  className={`p-3 rounded-2xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                    channel === 'DIRECT'
                      ? 'bg-[#34C759]/12 border-[#34C759] text-[#248A3D]'
                      : 'bg-[#F5F5F7] border-transparent text-[#515154]'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                  فرۆشتنی ڕاستەوخۆ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">ژمارەی وەسڵ *</label>
                  <input
                    type="text"
                    required
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
                    value={sendDate}
                    onChange={e => setSendDate(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کاتژمێر</label>
                  <input
                    type="text"
                    value={sendTime}
                    onChange={e => setSendTime(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  />
                </div>
              </div>

              {/* Channel-specific fields */}
              {channel === 'BRANCH' ? (
                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#AF52DE]" />
                    مەندوب / گەیەنەر بۆ فرۆشگای POS
                  </label>
                  <select
                    value={repName}
                    onChange={e => setRepName(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  >
                    {REP_PRESETS.map((r, i) => (
                      <option key={i} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ) : channel === 'REP' ? (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#0071E3]" />
                      ناردن بۆ حسابی مەندوب (عەهدەی ڕۆژانە) *
                    </label>
                    <select
                      value={repName}
                      onChange={e => setRepName(e.target.value)}
                      className="apple-input w-full px-3.5 py-2 font-semibold"
                    >
                      {REP_PRESETS.map((r, i) => (
                        <option key={i} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#0071E3]/6 border border-[#0071E3]/15 text-[11px] text-[#1D1D1F] leading-relaxed">
                    ئەم بارە دەچێتە سەر <span className="font-bold text-[#0071E3]">حسابی عەهدەی مەندوب</span>؛
                    دواتر ئەوەی فرۆشرا بە وەسڵ لە بەشی فرۆشتنی مەندوب دادەبەزێت و ماوەکەش لەسەری دەمێنێتەوە هەتا دەگەڕێتەوە کۆگای ئامادە.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[#515154] font-semibold mb-1">
                      کڕیار / مارکێت *
                    </label>
                    <select
                      value={customerChoice}
                      onChange={e => setCustomerChoice(e.target.value)}
                      className="apple-input w-full px-3.5 py-2 font-semibold"
                    >
                      <option value="CASH_WALKIN">کڕیاری ڕاستەوخۆ (کاش)</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="CUSTOM">+ کڕیارێکی تر (دەستی بنووسە)...</option>
                    </select>
                    {customerChoice === 'CUSTOM' && (
                      <input
                        type="text"
                        required
                        placeholder="ناوی کڕیار / مارکێت بنووسە..."
                        value={customCustomerName}
                        onChange={e => setCustomCustomerName(e.target.value)}
                        className="apple-input w-full px-3.5 py-2 mt-2 bg-white border-[#0071E3]"
                      />
                    )}
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-2xl bg-[#F5F5F7]">
                    <span className="font-bold text-[#1D1D1F]">شێوازی پارەدان:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentType('CASH')}
                        className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
                          paymentType === 'CASH'
                            ? 'bg-[#34C759] text-white'
                            : 'bg-white text-[#515154]'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        کاش
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentType('CREDIT')}
                        className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1 ${
                          paymentType === 'CREDIT'
                            ? 'bg-[#FF9500] text-white'
                            : 'bg-white text-[#515154]'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        قەرز
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Selection */}
              <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3">
                <div className="font-bold text-[#1D1D1F]">بەرهەمە ئامادەکانی ناو کۆگا</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        setSelectedProductId(e.target.value);
                        const prod = products.find(p => p.id === e.target.value);
                        if (prod) setItemPrice(prod.pricePerKg);
                      }}
                      className="apple-input w-full px-3 py-2 bg-white font-semibold"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nameKu} ({p.inStockKg.toLocaleString()} کگم)
                        </option>
                      ))}
                    </select>
                  </div>

                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="کێش (کگم) *"
                    value={itemWeight}
                    onChange={e => setItemWeight(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input px-3 py-2 bg-white font-bold"
                  />

                  <input
                    type="number"
                    placeholder="نرخی کیلۆ"
                    value={itemPrice}
                    onChange={e => setItemPrice(e.target.value ? Number(e.target.value) : '')}
                    className="apple-input px-3 py-2 bg-white font-bold"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddQueuedItem}
                  className="w-full py-2 rounded-xl bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردن بۆ وەسڵ
                </button>

                {queuedItems.length > 0 && (
                  <div className="bg-white rounded-xl border border-black/[0.05] overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-[#F5F5F7] text-[#515154]">
                        <tr>
                          <th className="p-2.5">بەرهەم</th>
                          <th className="p-2.5">کێش</th>
                          <th className="p-2.5">نرخ</th>
                          <th className="p-2.5">کۆ</th>
                          <th className="p-2.5 text-center">سڕینەوە</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {queuedItems.map((it, idx) => (
                          <tr key={idx}>
                            <td className="p-2.5 font-bold">{it.productName}</td>
                            <td className="p-2.5 font-black text-[#0071E3]">{it.weightKg} کگم</td>
                            <td className="p-2.5">{it.pricePerKg.toLocaleString()} د.ع</td>
                            <td className="p-2.5 font-black text-[#248A3D]">
                              {it.totalAmount.toLocaleString()} د.ع
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() =>
                                  setQueuedItems(queuedItems.filter((_, i) => i !== idx))
                                }
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

              <div className="p-4 rounded-2xl bg-[#F5F5F7] flex items-center justify-between">
                <div>
                  <span className="text-[#86868B]">کۆی کێش: </span>
                  <span className="font-black text-[#1D1D1F] text-sm">{queuedTotalKg} کگم</span>
                </div>
                <div>
                  <span className="text-[#86868B]">کۆی گشتی: </span>
                  <span className="font-black text-[#248A3D] text-base">
                    {queuedTotalIQD.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              <input
                type="text"
                placeholder="تێبینی (ئارەزوومەندانە)..."
                value={sendNotes}
                onChange={e => setSendNotes(e.target.value)}
                className="apple-input w-full px-3.5 py-2"
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-md shadow-[#0071E3]/25 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  ناردن بۆ فرۆشتن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Convert 3-Day Return Into Another Product / Form */}
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
                  دەگۆڕدرێت بۆ چ بەرهەم / شێوازێکی تر؟ (کێش بە کگم بنووسە — دەگەڕێتەوە ناو کۆگای ئامادە):
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

      {/* Modal 3: Edit Product Price */}
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

      {/* Print Modal */}
      {printOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1D1D1F]">
                  وەسڵی ناردن لە کۆگای ئامادەوە
                </h3>
                <p className="text-[11px] text-[#86868B]">کارگەی مریشکی فرێش</p>
              </div>
              <button
                type="button"
                onClick={() => setPrintOrder(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>ژمارەی وەسڵ:</span>
                <span className="font-bold text-[#0071E3]">{printOrder.manualReceiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>بەروار و کات:</span>
                <span>
                  {printOrder.date} - {printOrder.time || '09:00 ص'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>کڕیار:</span>
                <span className="font-bold">
                  {printOrder.customerName || printOrder.destinationName}
                </span>
              </div>
              <div className="space-y-1.5 py-2 border-t border-dashed border-black/10">
                {printOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-[11px]">
                    <span>{item.productName}</span>
                    <span>
                      {item.weightKg} کگم × {item.pricePerKg.toLocaleString()} ={' '}
                      {item.totalAmount.toLocaleString()} د.ع
                    </span>
                  </div>
                ))}
              </div>
              <div className="border-t-2 border-black/10 pt-2 flex justify-between text-sm font-bold">
                <span>کۆی کێش:</span>
                <span>{printOrder.totalWeightKg} کگم</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#0071E3]">
                <span>کۆی گشتی پارە:</span>
                <span>{printOrder.totalAmount.toLocaleString()} د.ع</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
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
