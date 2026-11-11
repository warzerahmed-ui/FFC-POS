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
  Scale,
  Boxes,
  X,
} from 'lucide-react';
import { DispatchItem, DispatchOrder, ProductItem } from '../../types';
import { FactoryPipelineStepper } from '../layout/FactoryPipelineStepper';
import { TabType } from '../layout/Sidebar';

type SubTabType = 'inventory' | 'sales' | 'yields';

interface ReadyForSaleViewProps {
  onNavigate?: (tab: TabType) => void;
}

export const ReadyForSaleView: React.FC<ReadyForSaleViewProps> = ({ onNavigate }) => {
  const {
    products,
    intakes,
    yields,
    dispatches,
    customers,
    addDispatch,
    addYieldRecord,
    updateProductPrice,
  } = useApp();

  const [subTab, setSubTab] = useState<SubTabType>('inventory');

  // Direct Sale Modal States
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [manualReceiptNo, setManualReceiptNo] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [saleTime, setSaleTime] = useState(
    new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  );
  const [customerChoice, setCustomerChoice] = useState<string>('CASH_WALKIN');
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT'>('CASH');
  const [saleNotes, setSaleNotes] = useState('فرۆشتنی ڕاستەوخۆ لە کۆگای ئامادە بۆ فرۆشتن');

  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [itemWeight, setItemWeight] = useState<number | ''>('');
  const [itemPrice, setItemPrice] = useState<number | ''>(products[0]?.pricePerKg || '');
  const [saleItems, setSaleItems] = useState<DispatchItem[]>([]);

  // Production / Yield Prep Modal States (from Live Intake -> Ready for Sale)
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [selectedIntakeId, setSelectedIntakeId] = useState('');
  const [batchLiveWeightKg, setBatchLiveWeightKg] = useState<number | ''>('');
  const [cutWeights, setCutWeights] = useState<Record<string, number>>({});
  const [yieldNotes, setYieldNotes] = useState('');

  // Edit Price Modal States
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editPricePerKg, setEditPricePerKg] = useState<number | ''>('');
  const [editCostPerKg, setEditCostPerKg] = useState<number | ''>('');

  // Print Receipt Modal
  const [printSale, setPrintSale] = useState<DispatchOrder | null>(null);

  // Derived data
  const directSalesList = useMemo(
    () => dispatches.filter(d => d.destinationType === 'DIRECT'),
    [dispatches]
  );

  const pendingIntakes = useMemo(
    () => intakes.filter(i => i.remainingLiveWeightKg > 0),
    [intakes]
  );

  const totalStockKg = products.reduce((sum, p) => sum + p.inStockKg, 0);
  const totalStockValue = products.reduce((sum, p) => sum + p.inStockKg * p.pricePerKg, 0);
  const pendingLiveKg = pendingIntakes.reduce((sum, i) => sum + i.remainingLiveWeightKg, 0);
  const directSalesKg = directSalesList.reduce((sum, d) => sum + d.totalWeightKg, 0);
  const directSalesIQD = directSalesList.reduce((sum, d) => sum + d.totalAmount, 0);

  // Open Sale Modal (optionally preselected to a specific ready product)
  const handleOpenSaleModal = (preselectProduct?: ProductItem) => {
    const targetProd = preselectProduct || products.find(p => p.inStockKg > 0) || products[0];
    setManualReceiptNo(`S-${Math.floor(100 + Math.random() * 900)}`);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setSaleTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    setCustomerChoice('CASH_WALKIN');
    setCustomCustomerName('');
    setCustomerPhone('');
    setPaymentType('CASH');
    setSaleNotes('فرۆشتنی ڕاستەوخۆ لە کۆگای ئامادە بۆ فرۆشتن');
    setSaleItems([]);
    if (targetProd) {
      setSelectedProductId(targetProd.id);
      setItemPrice(targetProd.pricePerKg);
    }
    setItemWeight('');
    setShowSaleModal(true);
  };

  const handleAddSaleItem = () => {
    const prod = products.find(p => p.id === selectedProductId);
    const weight = Number(itemWeight);
    if (!prod || !weight || weight <= 0) {
      alert('تکایە بەرهەم و کێش بنووسە');
      return;
    }

    const alreadyQueuedKg = saleItems
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
    setSaleItems(prev => [
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

  const saleTotalKg = saleItems.reduce((s, i) => s + i.weightKg, 0);
  const saleTotalIQD = saleItems.reduce((s, i) => s + i.totalAmount, 0);

  const handleSubmitSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReceiptNo.trim()) {
      alert('تکایە ژمارەی وەسڵ بنووسە');
      return;
    }
    if (saleItems.length === 0) {
      alert('تکایە بەلایەنی کەم یەک بەرهەم بۆ فرۆشتن زیاد بکە');
      return;
    }

    const finalCustomer =
      customerChoice === 'CASH_WALKIN'
        ? 'کڕیاری ڕاستەوخۆ (کارگە)'
        : customerChoice === 'CUSTOM'
        ? customCustomerName.trim() || 'کڕیاری ڕاستەوخۆ'
        : customerChoice;

    if (customerChoice === 'CASH_WALKIN' && paymentType === 'CREDIT') {
      alert('بۆ فرۆشی قەرز تکایە ناوی کڕیار یان مارکێت دیاری بکە');
      return;
    }

    addDispatch({
      manualReceiptNo: manualReceiptNo.trim(),
      date: saleDate,
      time: saleTime,
      destinationType: 'DIRECT',
      destinationName: finalCustomer,
      customerName: finalCustomer,
      repName: 'فرۆشتنی ڕاستەوخۆی کارگە',
      paymentType,
      driverOrRepPhone: customerPhone.trim(),
      items: saleItems,
      totalWeightKg: saleTotalKg,
      totalAmount: saleTotalIQD,
      status: 'COMPLETED',
      notes: saleNotes.trim(),
    });

    setShowSaleModal(false);
  };

  // Production / Yield Prep Modal Handlers
  const handleOpenYieldModal = () => {
    const firstPending = pendingIntakes[0];
    setSelectedIntakeId(firstPending?.id || '');
    setBatchLiveWeightKg(firstPending ? firstPending.remainingLiveWeightKg : '');
    const initialCuts: Record<string, number> = {};
    products.forEach(p => {
      initialCuts[p.id] = 0;
    });
    setCutWeights(initialCuts);
    setYieldNotes('');
    setShowYieldModal(true);
  };

  const selectedIntake = intakes.find(i => i.id === selectedIntakeId);
  const dressedWeightKg = Object.values(cutWeights).reduce((s, w) => s + (w || 0), 0);
  const liveBatchNum = Number(batchLiveWeightKg) || 0;
  const wasteWeightKg = Math.max(0, Number((liveBatchNum - dressedWeightKg).toFixed(2)));
  const yieldPct = liveBatchNum > 0 ? Number(((dressedWeightKg / liveBatchNum) * 100).toFixed(1)) : 0;
  const wastePct = liveBatchNum > 0 ? Number(((wasteWeightKg / liveBatchNum) * 100).toFixed(1)) : 0;

  const handleSubmitYield = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntake) {
      alert('هیچ وەجبەیەکی زیندوو هەڵنەبژێردراوە');
      return;
    }
    if (liveBatchNum <= 0 || liveBatchNum > selectedIntake.remainingLiveWeightKg) {
      alert(
        `کێشی زیندوو دەبێت لە نێوان 1 و ${selectedIntake.remainingLiveWeightKg} کگم بێت`
      );
      return;
    }
    if (dressedWeightKg <= 0) {
      alert('تکایە کێشی بەرهەمە ئامادەکراوەکان بنووسە');
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
      date: new Date().toISOString().split('T')[0],
      batchLiveWeightKg: liveBatchNum,
      dressedWeightKg,
      wasteWeightKg,
      yieldPercentage: yieldPct,
      wastePercentage: wastePct,
      cuts,
      notes: yieldNotes.trim() || 'ئامادەکردن و پاککردن بۆ کۆگای ئامادە بۆ فرۆشتن',
    });

    setShowYieldModal(false);
  };

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2.5">
            <PackageCheck className="w-6 h-6 text-[#0071E3]" />
            ٣. ئامادە بۆ فرۆشتن
          </h2>
          <p className="text-xs text-[#86868B] mt-1 font-medium">
            کۆگای بەرهەمە ئامادەکان دوای سەربڕین و پارچەکردن، و فرۆشتنی ڕاستەوخۆ لە کارگەوە
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenSaleModal()}
            className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-xs rounded-full shadow-sm shadow-[#0071E3]/25 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <ShoppingCart className="w-4 h-4" />
            + فرۆشتن لەم بەشە
          </button>

          <button
            type="button"
            onClick={() => (onNavigate ? onNavigate('production') : handleOpenYieldModal())}
            className="px-5 py-2.5 bg-[#5856D6]/12 hover:bg-[#5856D6]/20 text-[#5856D6] font-semibold text-xs rounded-full flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <Factory className="w-4 h-4" />
            قۆناغی ٢: سەربڕین و پارچەکردن
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
          <div className="text-[11px] text-[#0071E3] font-semibold mt-2">
            لە {products.length} جۆر بەرهەمی پاککراو
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>بەهای کۆگای ئامادە</span>
            <div className="w-8 h-8 rounded-full bg-[#34C759]/10 text-[#248A3D] flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#248A3D] tabular-nums">
            {totalStockValue.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-2">
            بە نرخی فرۆشتنی ئێستا
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>فرۆشتنی ڕاستەوخۆ لێرەوە</span>
            <div className="w-8 h-8 rounded-full bg-[#AF52DE]/10 text-[#AF52DE] flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#1D1D1F] tabular-nums">
            {directSalesIQD.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">د.ع</span>
          </div>
          <div className="text-[11px] text-[#AF52DE] font-semibold mt-2 tabular-nums">
            {directSalesKg.toLocaleString()} کگم لە {directSalesList.length} وەسڵ
          </div>
        </div>

        <div className="apple-card p-5">
          <div className="flex items-center justify-between text-[#86868B] text-xs font-semibold mb-2">
            <span>زیندوو لە کێڵگەوە (چاوەڕوان)</span>
            <div className="w-8 h-8 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-[#FF9500] tabular-nums">
            {pendingLiveKg.toLocaleString()}{' '}
            <span className="text-xs font-medium text-[#86868B]">کگم</span>
          </div>
          <div className="text-[11px] text-[#86868B] font-medium mt-2">
            {pendingIntakes.length} وەجبەی سەربڕینی تەواونەکراو
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
          بەرهەمە ئامادەکان ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('sales')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'sales'
              ? 'bg-white text-[#1D1D1F] shadow-sm'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-[#34C759]" />
          تۆماری فرۆشتن ({directSalesList.length})
        </button>

        <button
          type="button"
          onClick={() => setSubTab('yields')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            subTab === 'yields'
              ? 'bg-white text-[#1D1D1F] shadow-sm'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <Factory className="w-3.5 h-3.5 text-[#FF9500]" />
          تۆماری ئامادەکردن ({yields.length})
        </button>
      </div>

      {/* View 1: Ready Inventory Cards */}
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
                      {isOut ? 'تەواو بووە' : isLow ? 'کەم بووەتەوە' : 'ئامادەیە بۆ فرۆشتن'}
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
                    onClick={() => handleOpenSaleModal(prod)}
                    className="flex-1 py-2 rounded-full bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-40 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    فرۆشتن
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

      {/* View 2: Direct Sales History */}
      {subTab === 'sales' && (
        <div className="apple-card overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
            <span className="font-bold text-xs text-[#1D1D1F]">
              وەسڵەکانی فرۆشتنی ڕاستەوخۆ لە کۆگای ئامادە ({directSalesList.length})
            </span>
            <span className="text-[11px] text-[#86868B]">
              ڕاستەوخۆ لە کۆگا دادەبەزێت و دەچێتە قازانج و زیان
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. وەسڵ</th>
                  <th className="p-4">بەروار و کات</th>
                  <th className="p-4">کڕیار</th>
                  <th className="p-4">بەرهەمەکان</th>
                  <th className="p-4">کێش (کگم)</th>
                  <th className="p-4">کۆی پارە (د.ع)</th>
                  <th className="p-4">شێواز</th>
                  <th className="p-4 text-center">وەسڵ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {directSalesList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-[#86868B]">
                      هێشتا هیچ فرۆشتنێک لە بەشی ئامادە بۆ فرۆشتن تۆمار نەکراوە
                    </td>
                  </tr>
                ) : (
                  directSalesList.map(d => (
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
                      <td className="p-4 font-bold">{d.customerName || d.destinationName}</td>
                      <td className="p-4 text-[#86868B]">
                        <div className="font-medium text-[#1D1D1F]">{d.items.length} جۆر</div>
                        <div className="text-[10px] truncate max-w-[180px]">
                          {d.items.map(i => `${i.productName} (${i.weightKg} کگم)`).join('، ')}
                        </div>
                      </td>
                      <td className="p-4 font-black tabular-nums">{d.totalWeightKg} کگم</td>
                      <td className="p-4 font-black text-[#248A3D] tabular-nums">
                        {d.totalAmount.toLocaleString()} د.ع
                      </td>
                      <td className="p-4">
                        {d.paymentType === 'CASH' ? (
                          <span className="text-[10px] bg-[#34C759]/10 text-[#248A3D] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                            <Banknote className="w-3 h-3" />
                            کاش
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#FF9500]/10 text-[#FF9500] px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            قەرز
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => setPrintSale(d)}
                          className="p-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] hover:text-[#0071E3] transition-colors"
                          title="پرینتکردنی وەسڵ"
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
      )}

      {/* View 3: Production / Yield Batches */}
      {subTab === 'yields' && (
        <div className="apple-card overflow-hidden">
          <div className="p-4 border-b border-black/[0.05] flex items-center justify-between">
            <span className="font-bold text-xs text-[#1D1D1F]">
              وەجبەکانی ئامادەکردن و سەربڕین ({yields.length})
            </span>
            <span className="text-[11px] text-[#86868B]">
              گۆڕینی مریشکی زیندووی کێڵگە بۆ بەرهەمی ئامادە بۆ فرۆشتن
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
                  <th className="p-4">کێشی ئامادە</th>
                  <th className="p-4">ڕێژەی سافی</th>
                  <th className="p-4">پارچە ئامادەکراوەکان</th>
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
                        <span className="bg-[#FF9500]/10 text-[#FF9500] px-2.5 py-1 rounded-full font-mono text-[11px] font-bold">
                          {y.manualReceiptNo}
                        </span>
                      </td>
                      <td className="p-4 font-medium">{y.date}</td>
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
      )}

      {/* Modal 1: Direct Sale from Ready Inventory */}
      {showSaleModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#0071E3] text-white flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    فرۆشتن لە بەشی ئامادە بۆ فرۆشتن
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    فرۆشتنی بەرهەمی پاککراو بە کاش یان قەرز لە کۆگای کارگەوە
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSaleModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSale} className="p-6 space-y-4 text-xs">
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
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کاتژمێر</label>
                  <input
                    type="text"
                    value={saleTime}
                    onChange={e => setSaleTime(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">کڕیار *</label>
                  <select
                    value={customerChoice}
                    onChange={e => setCustomerChoice(e.target.value)}
                    className="apple-input w-full px-3.5 py-2 font-semibold"
                  >
                    <option value="CASH_WALKIN">کڕیاری ڕاستەوخۆ (کاشی کارگە)</option>
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
                      placeholder="ناوی کڕیار بنووسە..."
                      value={customCustomerName}
                      onChange={e => setCustomCustomerName(e.target.value)}
                      className="apple-input w-full px-3.5 py-2 mt-2 bg-white border-[#0071E3]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1">شێوازی پارەدان</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('CASH')}
                      className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentType === 'CASH'
                          ? 'bg-[#34C759] text-white shadow-sm'
                          : 'bg-[#F5F5F7] text-[#515154]'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      کاش
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('CREDIT')}
                      className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all ${
                        paymentType === 'CREDIT'
                          ? 'bg-[#FF9500] text-white shadow-sm'
                          : 'bg-[#F5F5F7] text-[#515154]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      قەرز
                    </button>
                  </div>
                </div>
              </div>

              {/* Product Selector */}
              <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3">
                <div className="font-bold text-[#1D1D1F]">بەرهەمە ئامادەکان</div>
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
                  onClick={handleAddSaleItem}
                  className="w-full py-2 rounded-xl bg-white hover:bg-[#F5F5F7] border border-black/[0.08] text-[#0071E3] font-bold flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  زیادکردن بۆ وەسڵ
                </button>

                {saleItems.length > 0 && (
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
                        {saleItems.map((it, idx) => (
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
                                onClick={() => setSaleItems(saleItems.filter((_, i) => i !== idx))}
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
                  <span className="font-black text-[#1D1D1F] text-sm">{saleTotalKg} کگم</span>
                </div>
                <div>
                  <span className="text-[#86868B]">کۆی گشتی: </span>
                  <span className="font-black text-[#248A3D] text-base">
                    {saleTotalIQD.toLocaleString()} د.ع
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی</label>
                <input
                  type="text"
                  value={saleNotes}
                  onChange={e => setSaleNotes(e.target.value)}
                  className="apple-input w-full px-3.5 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#0071E3] hover:bg-[#0077ED] shadow-md shadow-[#0071E3]/25 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  تۆمارکردنی فرۆشتن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Prepare Ready Stock from Live Intake */}
      {showYieldModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-black/[0.08] apple-sheet">
            <div className="p-5 bg-[#FBFBFD] border-b border-black/[0.06] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#1D1D1F] text-[#34C759] flex items-center justify-center">
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    ئامادەکردن بۆ فرۆشتن (لە باری کێڵگەوە)
                  </h3>
                  <p className="text-[11px] text-[#86868B]">
                    گۆڕینی مریشکی زیندوو بۆ بەرهەمی پاککراو و زیادکردنی بۆ کۆگای ئامادە
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowYieldModal(false)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitYield} className="p-6 space-y-4 text-xs">
              {pendingIntakes.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#F5F5F7] text-center text-[#86868B]">
                  هیچ باری زیندووی ماوە لە بەشی وەرگرتنی مریشکدا نییە. سەرەتا وەجبەیەک لە کێڵگە تۆمار بکە.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#515154] font-semibold mb-1">
                        وەجبەی کێڵگە *
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
                      <label className="block text-[#515154] font-semibold mb-1">
                        کێشی زیندووی ئامادەکراو (کگم) *
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
                        className="apple-input w-full px-3.5 py-2 font-black"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-2.5">
                    <div className="font-bold text-[#1D1D1F] mb-1">
                      بڕی بەرهەمە ئامادەبووەکان (کگم):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {products.map(p => (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl bg-white border border-black/[0.06] flex items-center justify-between gap-2"
                        >
                          <span className="font-bold text-[#1D1D1F] text-[11px]">{p.nameKu}</span>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0"
                            value={cutWeights[p.id] === 0 ? '' : cutWeights[p.id] || ''}
                            onChange={e =>
                              setCutWeights(prev => ({
                                ...prev,
                                [p.id]: e.target.value === '' ? 0 : Number(e.target.value),
                              }))
                            }
                            className="w-24 bg-[#F5F5F7] rounded-lg px-2.5 py-1.5 font-black text-center outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 flex items-center justify-between">
                    <div>
                      <span className="text-[#86868B] block text-[11px]">کۆی گۆشتی ئامادەبوو</span>
                      <span className="text-lg font-black text-[#248A3D]">
                        {dressedWeightKg.toLocaleString()} کگم
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[#86868B] block text-[11px]">ڕێژەی سافی</span>
                      <span className="text-lg font-black text-[#0071E3]">{yieldPct}%</span>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="تێبینی (ئارەزوومەندانە)..."
                    value={yieldNotes}
                    onChange={e => setYieldNotes(e.target.value)}
                    className="apple-input w-full px-3.5 py-2"
                  />
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowYieldModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#515154] hover:bg-[#F5F5F7]"
                >
                  پاشگەزبوونەوە
                </button>
                {pendingIntakes.length > 0 && (
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full text-xs font-bold text-white bg-[#1D1D1F] hover:bg-[#2C2C2E] flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4 text-[#34C759]" />
                    زیادکردن بۆ کۆگای ئامادە
                  </button>
                )}
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
                <label className="block text-[#515154] font-semibold mb-1">
                  تێچووی کیلۆ (د.ع)
                </label>
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

      {/* Printable Direct Sale Receipt Modal */}
      {printSale && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-black/[0.08] space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#1D1D1F]">وەسڵی فرۆشتن (ئامادە بۆ فرۆشتن)</h3>
                <p className="text-[11px] text-[#86868B]">کارگەی مریشکی فرێش</p>
              </div>
              <button
                type="button"
                onClick={() => setPrintSale(null)}
                className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-[#FBFBFD] border border-black/[0.06] space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>ژمارەی وەسڵ:</span>
                <span className="font-bold text-[#0071E3]">{printSale.manualReceiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span>بەروار و کات:</span>
                <span>
                  {printSale.date} - {printSale.time || '09:00 ص'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>کڕیار:</span>
                <span className="font-bold">
                  {printSale.customerName || printSale.destinationName}
                </span>
              </div>
              <div className="flex justify-between border-b border-dashed border-black/10 pb-2">
                <span>شێوازی پارەدان:</span>
                <span className="font-bold">
                  {printSale.paymentType === 'CASH' ? 'کاش (نەقد)' : 'قەرز'}
                </span>
              </div>

              <div className="space-y-1.5 py-2">
                <div className="font-bold text-[#515154] pb-1 border-b border-black/[0.05] flex justify-between">
                  <span>بەرهەم</span>
                  <span>کێش / نرخ / کۆ</span>
                </div>
                {printSale.items.map((item, i) => (
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
                <span>{printSale.totalWeightKg} کگم</span>
              </div>
              <div className="flex justify-between text-base font-black text-[#0071E3]">
                <span>کۆی گشتی پارە:</span>
                <span>{printSale.totalAmount.toLocaleString()} د.ع</span>
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
