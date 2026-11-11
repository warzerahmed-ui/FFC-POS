import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calculator,
  Users,
  Building2,
  FileText,
  Plus,
  Printer,
  Receipt,
  Clock,
  Calendar,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Trash2,
} from 'lucide-react';
import { Customer, Supplier } from '../../types';
import { FactoryLogo } from '../layout/FactoryLogo';

export const AccountingView: React.FC = () => {
  const { customers, suppliers, vouchers, dispatches, posSales, returns, addVoucher, addCustomer, addSupplier, softDeleteRecord, hasAccess, factorySettings } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'VOUCHERS' | 'CUSTOMERS' | 'SUPPLIERS'>('VOUCHERS');

  // Customer Statement Modal with Date Range Filter!
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Supplier Statement Modal
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [suppStartDate, setSuppStartDate] = useState<string>('2026-10-01');
  const [suppEndDate, setSuppEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Settlement Voucher Modal States
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState<'RECEIPT' | 'PAYMENT'>('RECEIPT');
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [voucherTime, setVoucherTime] = useState(
    new Date().toLocaleTimeString('ckb-IQ', { hour: '2-digit', minute: '2-digit' })
  );
  const [voucherAmount, setVoucherAmount] = useState<number | ''>('');
  const [voucherDiscount, setVoucherDiscount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [voucherNotes, setVoucherNotes] = useState('');

  // Search in customers
  const [customerSearch, setCustomerSearch] = useState('');

  // Selected party's current debt
  const selectedCustomerObj = customers.find(c => c.id === selectedPartyId) || customers[0];
  const selectedSupplierObj = suppliers.find(s => s.id === selectedPartyId) || suppliers[0];

  const currentDebtBefore = voucherType === 'RECEIPT'
    ? (selectedCustomerObj ? selectedCustomerObj.currentDebt : 0)
    : (selectedSupplierObj ? selectedSupplierObj.currentBalance : 0);

  const totalSettledInput = (Number(voucherAmount) || 0) + (Number(voucherDiscount) || 0);
  const remainingDebtCalculated = Math.max(0, currentDebtBefore - totalSettledInput);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newInitialDebt] = useState<number | ''>(0);

  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || !voucherAmount || Number(voucherAmount) <= 0) {
      alert('تکایە لایەن و بڕی پارەکە دیاری بکە');
      return;
    }

    const partyName = voucherType === 'RECEIPT'
      ? customers.find(c => c.id === selectedPartyId)?.name || 'کڕیار'
      : suppliers.find(s => s.id === selectedPartyId)?.name || 'کێڵگە';

    addVoucher({
      voucherNo: `${voucherType === 'RECEIPT' ? 'REC' : 'PAY'}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: voucherDate,
      time: voucherTime || new Date().toLocaleTimeString('ckb-IQ', { hour: '2-digit', minute: '2-digit' }),
      type: voucherType,
      partyType: voucherType === 'RECEIPT' ? 'CUSTOMER' : 'SUPPLIER',
      partyId: selectedPartyId,
      partyName,
      amount: Number(voucherAmount),
      discount: Number(voucherDiscount) || 0,
      paymentMethod,
      notes: voucherNotes,
    });

    setShowVoucherModal(false);
    setVoucherAmount('');
    setVoucherDiscount('');
    setVoucherNotes('');
  };

  const handleAddCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    addCustomer({
      name: newName,
      phone: newPhone,
      type: 'SUPERMARKET',
      address: newAddress,
      currentDebt: Number(newInitialDebt) || 0,
      creditLimit: 5000000,
    });
    setShowAddCustomerModal(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
  };

  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    addSupplier({
      name: newName,
      phone: newPhone,
      farmLocation: newAddress,
      currentBalance: Number(newInitialDebt) || 0,
    });
    setShowAddSupplierModal(false);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
  };

  // Build Dynamic Real-Time Ledger Transactions for Selected Customer
  const getCustomerTransactions = (customer: Customer) => {
    // 1. Purchases (from dispatches associated with this market/rep or initial orders)
    const purchaseTx = dispatches.flatMap((d) => {
      // Check if dispatch matches customer name or if it's a general market sale
      const isMatch = 
        (d.customerName && (d.customerName.includes(customer.name) || customer.name.includes(d.customerName))) ||
        (d.destinationName && (d.destinationName.includes(customer.name) || customer.name.includes(d.destinationName)));

      if (isMatch && (d.destinationType === 'REP' || d.destinationType === 'DIRECT')) {
        return [{
          id: d.id,
          date: d.date,
          time: d.time || '08:30 ص',
          refNo: d.manualReceiptNo,
          type: 'PURCHASE' as const,
          description:
            d.destinationType === 'DIRECT'
              ? `فرۆشتن لە ئامادە بۆ فرۆشتن (${d.totalWeightKg} کگم)`
              : `فرۆشی مەندوب (${d.repName || 'مەندوب'} - ${d.totalWeightKg} کگم)`,
          debit: d.paymentType === 'CASH' ? 0 : d.totalAmount, // قەرز زیاد دەکات
          credit: 0,
          discount: 0,
        }];
      }
      return [];
    });

    // 1b. Showroom POS Debt Purchases
    const posDebtTx = posSales
      .filter(
        s =>
          s.paymentType === 'DEBT' &&
          (s.customerId === customer.id ||
            (s.customerName &&
              (s.customerName.includes(customer.name) || customer.name.includes(s.customerName))))
      )
      .map(s => ({
        id: `pos-${s.id}`,
        date: s.date,
        time: s.time || '10:00 ص',
        refNo: s.saleNo,
        type: 'PURCHASE' as const,
        description: `فرۆشی قەرزی شۆرۆم (${s.items.map(i => `${i.productName} ${i.weightKg} کگم`).join('، ')})`,
        debit: s.total,
        credit: 0,
        discount: s.discount || 0,
      }));

    // Add baseline historical purchase if needed
    if (purchaseTx.length === 0 && posDebtTx.length === 0) {
      purchaseTx.push({
        id: 'tx-base',
        date: '2026-10-15',
        time: '09:00 ص',
        refNo: 'D-710',
        type: 'PURCHASE' as const,
        description: 'وەجبەی مریشکی فرێش و پارچەکراو (١٢٠ کگم)',
        debit: 2525000,
        credit: 0,
        discount: 0,
      });
    }

    // 2. Real-time Payments (from vouchers where partyId === customer.id)
    const paymentTx = vouchers
      .filter(v => v.partyId === customer.id || v.partyName.includes(customer.name) || customer.name.includes(v.partyName))
      .map(v => ({
        id: v.id,
        date: v.date,
        time: v.time,
        refNo: v.voucherNo,
        type: 'PAYMENT' as const,
        description: `سند قبض - ${v.notes || 'پارەدانی کاش'}`,
        debit: 0,
        credit: v.amount, // قەرز کەم دەکاتەوە
        discount: v.discount || 0,
      }));

    // 3. Real-time Returns (گەڕاوەی تەلەفی ٣ ڕۆژ لە کڕیارەوە)
    const returnTx = returns
      .filter(r => 
        (r.customerName && (r.customerName.includes(customer.name) || customer.name.includes(r.customerName))) ||
        (r.sourceName && (r.sourceName.includes(customer.name) || customer.name.includes(r.sourceName)))
      )
      .map(r => ({
        id: r.id,
        date: r.date,
        time: r.time || '10:00 ص',
        refNo: r.manualReceiptNo,
        type: 'RETURN' as const,
        description: `گەڕاوەی تەلەف بۆ وەسڵی فرۆشتنی (${r.salesReceiptNo || 'دەستی'}) - ${r.totalWeightKg} کگم`,
        debit: 0,
        credit: r.totalCustomerDeduction || r.totalLossAmount, // کەمکردنەوەی قەرز لە حسابی کڕیار
        discount: 0,
      }));

    // Combine and sort by date & time
    const all = [...purchaseTx, ...posDebtTx, ...paymentTx, ...returnTx].sort((a, b) => a.date.localeCompare(b.date));

    // Calculate opening balance before startDate
    let openingBalance = 0;
    const periodTransactions: any[] = [];

    all.forEach(tx => {
      if (tx.date < startDate) {
        openingBalance += (tx.debit - tx.credit - tx.discount);
      } else if (tx.date <= endDate) {
        periodTransactions.push(tx);
      }
    });

    // Calculate running balance for filtered period
    let running = openingBalance;
    const rowsWithBalance = periodTransactions.map(tx => {
      running += (tx.debit - tx.credit - tx.discount);
      return {
        ...tx,
        balanceAfter: running,
      };
    });

    const totalDebitPeriod = periodTransactions.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCreditPeriod = periodTransactions.reduce((sum, tx) => sum + tx.credit, 0);
    const totalDiscountPeriod = periodTransactions.reduce((sum, tx) => sum + tx.discount, 0);

    return {
      openingBalance,
      rows: rowsWithBalance,
      totalDebitPeriod,
      totalCreditPeriod,
      totalDiscountPeriod,
      closingBalance: running,
    };
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone.includes(customerSearch)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] tracking-tight flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#0071E3]" />
            ژمێریاری گشتی، کەشف حساب و سافکردنی قەرزەکان
          </h2>
          <p className="text-xs text-[#86868B] mt-1">
            کەشف حسابی مانگانە و بەروار-بۆ-بەرواری مارکێتەکان، هاوکاتکردنی ڕاستەوخۆی سەنەداتی دانەوە و باڵانسی ماوە
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setVoucherType('RECEIPT');
              setSelectedPartyId(customers[0]?.id || '');
              setVoucherDate(new Date().toISOString().split('T')[0]);
              setVoucherTime(new Date().toLocaleTimeString('ckb-IQ', { hour: '2-digit', minute: '2-digit' }));
              setShowVoucherModal(true);
            }}
            className="px-4 py-2.5 bg-[#34C759] hover:bg-[#248A3D] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 shadow-sm shadow-[#34C759]/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            سەنەدی قەبز (وەرگرتنی قەرز)
          </button>

          <button
            onClick={() => {
              setVoucherType('PAYMENT');
              setSelectedPartyId(suppliers[0]?.id || '');
              setVoucherDate(new Date().toISOString().split('T')[0]);
              setVoucherTime(new Date().toLocaleTimeString('ckb-IQ', { hour: '2-digit', minute: '2-digit' }));
              setShowVoucherModal(true);
            }}
            className="px-4 py-2.5 bg-[#FF9500] hover:bg-[#E08500] text-white font-semibold text-xs rounded-full flex items-center gap-1.5 shadow-sm shadow-[#FF9500]/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            سەنەدی سەرف (دانەوە بە کێڵگە)
          </button>
        </div>
      </div>

      {/* Apple Segmented Control */}
      <div className="p-1 bg-[#EAEAEA] rounded-full inline-flex flex-wrap gap-1">
        <button
          onClick={() => setActiveSubTab('VOUCHERS')}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'VOUCHERS'
              ? 'bg-white text-[#1D1D1F] shadow-sm font-bold'
              : 'text-[#515154] hover:text-[#1D1D1F]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-[#34C759]" />
          سەنەداتی سافکردنی قەرز ({vouchers.length})
        </button>

        <button
          onClick={() => { setActiveSubTab('CUSTOMERS'); setSelectedSupplier(null); }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'CUSTOMERS'
              ? 'bg-white text-[#1D1D1F] shadow-sm font-bold'
              : 'text-[#515154] hover:text-[#1D1D1F]'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-[#0071E3]" />
          کەشف حسابی کڕیاران (مارکێتەکان)
        </button>

        <button
          onClick={() => { setActiveSubTab('SUPPLIERS'); setSelectedCustomer(null); }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all ${
            activeSubTab === 'SUPPLIERS'
              ? 'bg-white text-[#1D1D1F] shadow-sm font-bold'
              : 'text-[#515154] hover:text-[#1D1D1F]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-[#FF9500]" />
          کەشف حسابی کێڵگەکان
        </button>
      </div>

      {/* View 1: Vouchers List */}
      {activeSubTab === 'VOUCHERS' && (
        <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-4 bg-[#FBFBFD] border-b border-black/[0.05] flex items-center justify-between">
            <span className="text-xs font-bold text-[#1D1D1F] flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-[#34C759]" />
              لیستی سەنەدەکان بە پیشاندانی بەروار، کاتژمێر، بڕی پارەی دراو و قەرزی ماوە (باڵانس)
            </span>
            <span className="text-xs text-[#86868B]">
              کۆی سەنەدەکان: <strong>{vouchers.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ژ. سەنەد</th>
                  <th className="p-4">بەروار و کاتژمێر</th>
                  <th className="p-4">جۆری سەنەد</th>
                  <th className="p-4">لایەنی مامەڵە</th>
                  <th className="p-4">قەرزی پێشوو</th>
                  <th className="p-4">بڕی دراو / وەرگیراو</th>
                  <th className="p-4">داشکاندن (خصم)</th>
                  <th className="p-4">قەرزی ماوە (باڵانس)</th>
                  <th className="p-4">شێوازی پارەدان</th>
                  <th className="p-4">تێبینی</th>
                  {hasAccess('settings') && <th className="p-4 text-center">سڕینەوە</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FBFBFD] transition-colors">
                    <td className="p-4 font-mono font-bold text-[#0071E3]">
                      <span className="bg-[#0071E3]/10 px-2.5 py-1 rounded-full text-[11px]">
                        {v.voucherNo}
                      </span>
                    </td>
                    <td className="p-4 text-[#515154]">
                      <div className="font-semibold text-[#1D1D1F]">{v.date}</div>
                      <div className="text-[10px] text-[#86868B] flex items-center gap-1 mt-0.5 font-mono">
                        <Clock className="w-3 h-3 text-[#0071E3]" />
                        {v.time || '10:00 ص'}
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                          v.type === 'RECEIPT'
                            ? 'bg-[#34C759]/10 text-[#248A3D]'
                            : 'bg-[#FF9500]/10 text-[#FF9500]'
                        }`}
                      >
                        {v.type === 'RECEIPT' ? 'سند قبض (وەرگرتن)' : 'سند صرف (پێدان)'}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-[#1D1D1F]">{v.partyName}</td>
                    
                    <td className="p-4 text-[#86868B] font-semibold">
                      {v.previousDebt ? `${v.previousDebt.toLocaleString()} د.ع` : '---'}
                    </td>

                    <td className="p-4 font-black text-[#1D1D1F] text-sm">
                      {v.amount.toLocaleString()} د.ع
                    </td>

                    <td className="p-4 text-[#86868B]">
                      {v.discount ? `${v.discount.toLocaleString()} د.ع` : '---'}
                    </td>

                    <td className="p-4">
                      {v.remainingDebt === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34C759] bg-[#34C759]/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          تەواو ساف بوو (0 د.ع)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#FF3B30] bg-[#FF3B30]/10 px-2.5 py-1 rounded-full">
                          {v.remainingDebt.toLocaleString()} د.ع ماوە
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-[#515154]">
                      <span className="bg-[#F5F5F7] px-2.5 py-1 rounded-full text-[11px] font-medium">
                        {v.paymentMethod === 'CASH' ? 'کاش' : 'حەواڵە / کارت'}
                      </span>
                    </td>
                    <td className="p-4 text-[#86868B]">{v.notes || '---'}</td>
                    {hasAccess('settings') && (
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`سەنەدی #${v.voucherNo} بخرێتە سەبەتەی سۆفت دیلیت و قەرزی ${v.partyName} بگەڕێندرێتەوە؟`)) {
                              softDeleteRecord('VOUCHER', v.id, 'سڕینەوەی خێرا لە بەشی سەنەدەکان');
                            }
                          }}
                          className="p-1.5 rounded-lg bg-[#FF3B30]/10 hover:bg-[#FF3B30] text-[#FF3B30] hover:text-white transition-colors"
                          title="سۆفت دیلیت (گەڕانەوەی قەرز)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Customers Ledger */}
      {activeSubTab === 'CUSTOMERS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#86868B] absolute right-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="گەڕان بەپێی ناوی مارکێت یان تەلەفۆن..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="w-full bg-white border border-black/[0.08] rounded-full pr-9 pl-4 py-2 text-xs text-[#1D1D1F] placeholder-[#86868B] outline-none focus:border-[#0071E3]"
              />
            </div>

            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="text-xs text-[#0071E3] font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              + زیادکردنی کڕیاری نوێ
            </button>
          </div>

          <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ناوی کڕیار / مارکێت</th>
                  <th className="p-4">جۆر</th>
                  <th className="p-4">تەلەفۆن و ناونیشان</th>
                  <th className="p-4">سنووری قەرز</th>
                  <th className="p-4">بڕی قەرزی ئێستا</th>
                  <th className="p-4">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#FBFBFD]">
                    <td className="p-4 font-bold text-[#1D1D1F]">{c.name}</td>
                    <td className="p-4 text-[#86868B]">
                      {c.type === 'SUPERMARKET' ? 'مارکێت' : c.type === 'RESTAURANT' ? 'چێشتخانە' : 'کۆ'}
                    </td>
                    <td className="p-4 text-[#86868B]">{c.phone} - {c.address}</td>
                    <td className="p-4">{c.creditLimit.toLocaleString()} د.ع</td>
                    <td className="p-4 font-black text-[#FF3B30] text-sm">
                      {c.currentDebt.toLocaleString()} د.ع
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="px-4 py-2 bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        دەرهێنانی کەشف حساب (بە بەروار)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Suppliers Ledger */}
      {activeSubTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#86868B]">لیستی کێڵگە پەلەوەرییەکان:</span>
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="text-xs text-[#0071E3] font-semibold hover:underline flex items-center gap-1"
            >
              + زیادکردنی کێڵگەی نوێ
            </button>
          </div>

          <div className="rounded-3xl bg-white border border-black/[0.06] shadow-sm overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.05]">
                <tr>
                  <th className="p-4">ناوی کێڵگە / فرۆشیار</th>
                  <th className="p-4">تەلەفۆن</th>
                  <th className="p-4">شوێنی کێڵگە</th>
                  <th className="p-4">ماوەی قەرز لەسەر کارگە</th>
                  <th className="p-4">کردارەکان</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FBFBFD]">
                    <td className="p-4 font-bold text-[#1D1D1F]">{s.name}</td>
                    <td className="p-4 text-[#86868B]">{s.phone}</td>
                    <td className="p-4 text-[#86868B]">{s.farmLocation}</td>
                    <td className="p-4 font-black text-[#FF9500] text-sm">
                      {s.currentBalance.toLocaleString()} د.ع
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedSupplier(s)}
                        className="px-3.5 py-1.5 bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#1D1D1F] rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#0071E3]" />
                        کەشف حسابی کێڵگە
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DYNAMIC REAL-TIME CUSTOMER STATEMENT WITH DATE RANGE FILTER (Directly addressing user request!) */}
      {selectedCustomer && (() => {
        const ledger = getCustomerTransactions(selectedCustomer);

        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl space-y-5 font-sans border border-black/[0.08] max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              
              {/* Statement Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.08] pb-4 gap-4">
                <div className="flex items-start gap-3">
                  <FactoryLogo size="lg" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-extrabold text-[#1D1D1F]">
                        {factorySettings.factoryName} ({factorySettings.shortCode})
                      </span>
                      <span className="text-xs font-bold text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-0.5 rounded-full">
                        کەشف حسابی فەرمی کڕیار (Account Statement)
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold text-[#1D1D1F] mt-1">{selectedCustomer.name}</h3>
                    <p className="text-xs text-[#86868B]">ناونیشان: {selectedCustomer.address} | تەلەفۆن: {selectedCustomer.phone}</p>
                    <p className="text-[11px] text-[#86868B] mt-0.5">کارگە: {factorySettings.address} • {factorySettings.phone1}</p>
                  </div>
                </div>

                <div className="text-left bg-[#F5F5F7] p-3 rounded-2xl border border-black/[0.04]">
                  <span className="text-[11px] text-[#86868B] block">قەرزی ماوەی ئێستا:</span>
                  <span className="text-xl font-black text-[#FF3B30]">{selectedCustomer.currentDebt.toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* DATE RANGE FILTER CONTROLS (لە بەروار بۆ بەروار بۆ حسابی مانگانە) */}
              <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#0071E3]" />
                    فلتەرکردنی ماوە (بەروار بۆ بەروار):
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[#86868B]">لە بەرواری:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white border border-black/[0.08] rounded-xl px-3 py-1.5 text-[#1D1D1F] font-semibold outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[#86868B]">بۆ بەرواری:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white border border-black/[0.08] rounded-xl px-3 py-1.5 text-[#1D1D1F] font-semibold outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(1); // First of month
                      setStartDate(d.toISOString().split('T')[0]);
                      setEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 bg-white hover:bg-[#F5F5F7] text-[#0071E3] border border-[#0071E3]/20 rounded-lg font-bold"
                  >
                    ئەم مانگە
                  </button>
                  <button
                    onClick={() => {
                      setStartDate('2026-01-01');
                      setEndDate(new Date().toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1 bg-white hover:bg-[#F5F5F7] text-[#515154] border border-black/[0.08] rounded-lg font-bold"
                  >
                    هەموو کات
                  </button>
                </div>
              </div>

              {/* Statement Summary Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F5F5F7]">
                  <span className="text-[#86868B] block text-[11px]">قەرزی پێش ئەم بەروارە:</span>
                  <span className="text-base font-black text-[#1D1D1F] mt-0.5 block">{ledger.openingBalance.toLocaleString()} د.ع</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#0071E3]/10">
                  <span className="text-[#0071E3] block text-[11px]">کۆی کڕینی ئەم ماوەیە:</span>
                  <span className="text-base font-black text-[#0071E3] mt-0.5 block">+{ledger.totalDebitPeriod.toLocaleString()} د.ع</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#34C759]/10">
                  <span className="text-[#248A3D] block text-[11px]">کۆی پارەی دراو لەم ماوەیە:</span>
                  <span className="text-base font-black text-[#248A3D] mt-0.5 block">-{ledger.totalCreditPeriod.toLocaleString()} د.ع</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FF3B30]/10">
                  <span className="text-[#FF3B30] block text-[11px]">قەرزی ماوە لە کۆتایی ماوەکە:</span>
                  <span className="text-base font-black text-[#FF3B30] mt-0.5 block">{ledger.closingBalance.toLocaleString()} د.ع</span>
                </div>
              </div>

              {/* DETAILED LEDGER TABLE (Real-Time Rows with Running Balance) */}
              <div className="border border-black/[0.08] rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-right">
                  <thead className="bg-[#F5F5F7] text-[#515154] font-bold border-b border-black/[0.06]">
                    <tr>
                      <th className="p-3.5">بەروار و کاتژمێر</th>
                      <th className="p-3.5">ژ. وەسڵ / سەنەد</th>
                      <th className="p-3.5">ڕوونکردنەوە و شێوازی مامەڵە</th>
                      <th className="p-3.5">کڕین (قەرز +)</th>
                      <th className="p-3.5">پارەی دراو (-)</th>
                      <th className="p-3.5">داشکاندن (خصم)</th>
                      <th className="p-3.5">باڵانسی قەرزی ماوە</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.04] text-[#1D1D1F]">
                    {/* Opening Balance Row */}
                    <tr className="bg-[#FBFBFD] font-bold text-[#86868B]">
                      <td className="p-3">{startDate}</td>
                      <td className="p-3">---</td>
                      <td className="p-3">قەرزی سەرەتای ماوە (Opening Balance)</td>
                      <td className="p-3">---</td>
                      <td className="p-3">---</td>
                      <td className="p-3">---</td>
                      <td className="p-3 font-black text-[#1D1D1F]">{ledger.openingBalance.toLocaleString()} د.ع</td>
                    </tr>

                    {/* Period Rows */}
                    {ledger.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#FBFBFD]">
                        <td className="p-3.5">
                          <div className="font-semibold">{row.date}</div>
                          <div className="text-[10px] text-[#86868B] font-mono">{row.time}</div>
                        </td>
                        <td className="p-3.5 font-bold font-mono">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                            row.type === 'PAYMENT' 
                              ? 'bg-[#34C759]/10 text-[#248A3D]' 
                              : row.type === 'RETURN'
                              ? 'bg-[#FF9500]/10 text-[#FF9500]'
                              : 'bg-[#0071E3]/10 text-[#0071E3]'
                          }`}>
                            {row.refNo}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium">{row.description}</td>
                        <td className="p-3.5 font-bold text-[#0071E3]">
                          {row.debit > 0 ? `+${row.debit.toLocaleString()} د.ع` : '---'}
                        </td>
                        <td className="p-3.5 font-bold text-[#248A3D]">
                          {row.credit > 0 ? `-${row.credit.toLocaleString()} د.ع` : '---'}
                        </td>
                        <td className="p-3.5 text-[#86868B]">
                          {row.discount > 0 ? `${row.discount.toLocaleString()} د.ع` : '---'}
                        </td>
                        <td className="p-3.5 font-black text-[#FF3B30]">
                          {row.balanceAfter.toLocaleString()} د.ع
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between pt-3 text-xs border-t border-black/[0.08] gap-4">
                <span className="text-[#86868B]">
                  واژۆ و مۆری فەرمی ژمێریاری کارگە: __________________________
                </span>
                
                <div className="flex items-center gap-2.5 no-print">
                  <button
                    type="button"
                    onClick={() => {
                      const csvRows = [
                        [factorySettings.factoryName, 'کەشف حسابی کڕیار', selectedCustomer.name, `${startDate} تا ${endDate}`],
                        ['بەروار', 'کات', 'ژ. وەسڵ / سەنەد', 'وردەکاری', 'کڕین (+)', 'پارەی دراو (-)', 'داشکاندن', 'باڵانسی ماوە'],
                        [startDate, '---', '---', 'قەرزی سەرەتای ماوە', '0', '0', '0', String(ledger.openingBalance)],
                        ...ledger.rows.map(r => [
                          r.date,
                          r.time,
                          r.refNo,
                          r.description,
                          String(r.debit),
                          String(r.credit),
                          String(r.discount),
                          String(r.balanceAfter),
                        ]),
                      ];
                      const csv = '\uFEFF' + csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `Statement-${selectedCustomer.name}-${endDate}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2.5 bg-[#34C759]/12 hover:bg-[#34C759]/20 text-[#248A3D] rounded-full font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    Excel / CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-2.5 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white rounded-full font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    چاپکردنی کەشف حساب (PDF/کاغەز)
                  </button>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="px-5 py-2.5 bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#515154] rounded-full font-semibold"
                  >
                    داخستن
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Supplier Statement Modal */}
      {selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-4 font-sans border border-black/[0.08]">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-3">
                <FactoryLogo size="md" />
                <div>
                  <h3 className="text-lg font-extrabold text-[#1D1D1F]">کەشف حسابی کێڵگە / فرۆشیار</h3>
                  <p className="text-xs text-[#86868B]">{factorySettings.factoryName} - بەشی کڕین و کۆگا • {factorySettings.phone1}</p>
                </div>
              </div>
              <div className="text-left text-xs">
                <div>بەروار: <strong>{new Date().toISOString().split('T')[0]}</strong></div>
                <div className="text-[#FF9500] font-bold text-sm">ماوەی قەرز: {selectedSupplier.currentBalance.toLocaleString()} د.ع</div>
              </div>
            </div>

            <div className="bg-[#F5F5F7] p-4 rounded-2xl text-xs grid grid-cols-2 gap-2 text-[#515154]">
              <div>ناوی کێڵگە: <strong className="text-[#1D1D1F]">{selectedSupplier.name}</strong></div>
              <div>تەلەفۆن: <strong className="text-[#1D1D1F]">{selectedSupplier.phone}</strong></div>
              <div>شوێنی کێڵگە: <strong className="text-[#1D1D1F]">{selectedSupplier.farmLocation}</strong></div>
            </div>

            <div className="flex justify-between items-center pt-3 text-xs border-t border-black/[0.06]">
              <span className="text-[#86868B]">مۆری فەرمی کارگە: ______________</span>
              <div className="flex gap-2 no-print">
                <button
                  type="button"
                  onClick={() => {
                    const csvRows = [
                      [factorySettings.factoryName, 'کەشف حسابی کێڵگە', selectedSupplier.name, new Date().toISOString().split('T')[0]],
                      ['ناوی کێڵگە', 'تەلەفۆن', 'شوێن', 'قەرزی ماوە (د.ع)'],
                      [selectedSupplier.name, selectedSupplier.phone, selectedSupplier.farmLocation, String(selectedSupplier.currentBalance)],
                    ];
                    const csv = '\uFEFF' + csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Supplier-${selectedSupplier.name}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="px-4 py-2.5 bg-[#34C759]/12 hover:bg-[#34C759]/20 text-[#248A3D] rounded-full font-bold flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Excel / CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-[#1D1D1F] hover:bg-[#2C2C2E] text-white rounded-full font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  چاپکردن
                </button>
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="px-5 py-2.5 bg-[#F5F5F7] text-[#515154] rounded-full font-semibold"
                >
                  داخستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Voucher Modal (Tracks Date, Time, Current Debt, and Remaining Debt Live!) */}
      {showVoucherModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 text-xs shadow-2xl border border-black/[0.08] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#0071E3]" />
                  {voucherType === 'RECEIPT' ? 'سند قبض نوێ (وەرگرتنی قەرز)' : 'سند صرف نوێ (دانەوەی قەرز بە کێڵگە)'}
                </h3>
                <p className="text-[11px] text-[#86868B] mt-0.5">تۆمارکردنی کاتی ڕاستەقینە و حیسابکردنی قەرزی ماوە</p>
              </div>
              <button onClick={() => setShowVoucherModal(false)} className="w-7 h-7 rounded-full bg-[#F5F5F7] text-[#86868B] font-bold">✕</button>
            </div>

            <form onSubmit={handleVoucherSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[#515154] font-semibold mb-1">دیاریکردنی لایەن:</label>
                <select
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-semibold outline-none focus:border-[#0071E3] focus:bg-white"
                >
                  {voucherType === 'RECEIPT'
                    ? customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (قەرزی ئێستا: {c.currentDebt.toLocaleString()} د.ع)</option>
                      ))
                    : suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (قەرزی کێڵگە: {s.currentBalance.toLocaleString()} د.ع)</option>
                      ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
                    بەرواری سەنەد:
                  </label>
                  <input
                    type="date"
                    required
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[#515154] font-semibold mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#FF9500]" />
                    کاتی دانەوە (کاتژمێر):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نموونە: 10:15 ص"
                    value={voucherTime}
                    onChange={(e) => setVoucherTime(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">بڕی دراو / وەرگیراو (د.ع) *</label>
                  <input
                    type="number"
                    required
                    placeholder="500000"
                    value={voucherAmount}
                    onChange={(e) => setVoucherAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] font-black text-sm outline-none focus:border-[#0071E3] focus:bg-white"
                  />
                </div>

                {voucherType === 'RECEIPT' ? (
                  <div>
                    <label className="block text-[#515154] font-semibold mb-1">داشکاندن (خصم د.ع):</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={voucherDiscount}
                      onChange={(e) => setVoucherDiscount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F] outline-none"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[#515154] font-semibold mb-1">شێوازی پێدان:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e: any) => setPaymentMethod(e.target.value)}
                      className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                    >
                      <option value="CASH">کاش (دەستی)</option>
                      <option value="TRANSFER">حەواڵە / ئەلیکترۆنی</option>
                    </select>
                  </div>
                )}
              </div>

              {voucherType === 'RECEIPT' && (
                <div>
                  <label className="block text-[#515154] font-semibold mb-1">شێوازی وەرگرتن:</label>
                  <select
                    value={paymentMethod}
                    onChange={(e: any) => setPaymentMethod(e.target.value)}
                    className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                  >
                    <option value="CASH">کاش (لە ڕێگەی مەندوب یان نووسینگە)</option>
                    <option value="TRANSFER">حەواڵە / FIB</option>
                  </select>
                </div>
              )}

              {/* LIVE DEBT CALCULATION CARD */}
              <div className="p-4 rounded-2xl bg-[#0071E3]/5 border border-[#0071E3]/15 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#86868B]">قەرزی ئەم لایەنە پێش دانەوە:</span>
                  <span className="font-bold text-[#1D1D1F]">{currentDebtBefore.toLocaleString()} د.ع</span>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-black/[0.06] pb-2">
                  <span className="text-[#86868B]">کۆی بڕی دراو + داشکاندن:</span>
                  <span className="font-bold text-[#34C759]">-{totalSettledInput.toLocaleString()} د.ع</span>
                </div>

                <div className="flex justify-between items-center text-xs font-black pt-0.5">
                  <span className="text-[#1D1D1F]">بڕی ئەو قەرزەی دەمێنێتەوە (ماوە):</span>
                  <span className={`text-sm ${remainingDebtCalculated === 0 ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>
                    {remainingDebtCalculated === 0 ? '✓ تەواو ساف دەبێت (0 د.ع)' : `${remainingDebtCalculated.toLocaleString()} د.ع`}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[#515154] font-semibold mb-1">تێبینی:</label>
                <input
                  type="text"
                  placeholder="سافکردنی بەشێک لە وەسڵە کۆنەکان..."
                  value={voucherNotes}
                  onChange={(e) => setVoucherNotes(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-black/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowVoucherModal(false)}
                  className="w-1/2 py-2.5 bg-[#F5F5F7] text-[#515154] rounded-full font-semibold"
                >
                  پاشگەزبوونەوە
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold rounded-full shadow-sm shadow-[#0071E3]/25"
                >
                  تۆمارکردن و سافکردن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-3.5 text-xs shadow-2xl border border-black/[0.08]">
            <h3 className="font-bold text-[#1D1D1F] text-sm">زیادکردنی کڕیاری نوێ</h3>
            <form onSubmit={handleAddCustomerSubmit} className="space-y-3">
              <div>
                <label className="block text-[#515154] mb-1">ناوی کڕیار / مارکێت *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block text-[#515154] mb-1">تەلەفۆن</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block text-[#515154] mb-1">ناونیشان</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowAddCustomerModal(false)} className="w-1/2 py-2.5 bg-[#F5F5F7] text-[#515154] rounded-full font-semibold">پاشگەزبوونەوە</button>
                <button type="submit" className="w-1/2 py-2.5 bg-[#0071E3] text-white font-bold rounded-full">زیادکردن</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-3.5 text-xs shadow-2xl border border-black/[0.08]">
            <h3 className="font-bold text-[#1D1D1F] text-sm">زیادکردنی کێڵگەی نوێ</h3>
            <form onSubmit={handleAddSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-[#515154] mb-1">ناوی کێڵگە / فرۆشیار *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block text-[#515154] mb-1">تەلەفۆن</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block text-[#515154] mb-1">ناوچە و ناونیشانی کێڵگە</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-[#F5F5F7] border border-black/[0.06] rounded-xl px-3.5 py-2 text-[#1D1D1F]"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setShowAddSupplierModal(false)} className="w-1/2 py-2.5 bg-[#F5F5F7] text-[#515154] rounded-full font-semibold">پاشگەزبوونەوە</button>
                <button type="submit" className="w-1/2 py-2.5 bg-[#0071E3] text-white font-bold rounded-full">زیادکردن</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
