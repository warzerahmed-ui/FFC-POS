// Core Types for Fresh Chicken ERP & POS System

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ACCOUNTANT' | 'REP' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  phone: string;
  password?: string;
  role: UserRole;
  roleTitleKu: string;
  isSuperAdmin?: boolean;
  avatarEmoji?: string;
}

export type ProductCategory = 
  | 'WHOLE_CHICKEN'     // مریشکی تەواو
  | 'BREAST'            // سنگی مریشک
  | 'THIGH'             // ڕان
  | 'WINGS'             // باڵ و مل
  | 'GIBLET'            // جگەر و دڵ و قەسیل
  | 'BONES_SCRAP';      // ئێسک و شلمک

export interface ProductItem {
  id: string;
  code: string;
  barcodePrefix: string;
  nameKu: string;
  category: ProductCategory;
  pricePerKg: number;
  costPerKg: number;
  unit: 'KG' | 'PIECE';
  inStockKg: number;
}

export interface LiveIntake {
  id: string;
  manualReceiptNo: string;   // ژمارەی وەسڵی دەستی
  date: string;              // بەرواری وەسڵ
  farmName: string;          // ناوی کێڵگە
  driverName: string;        // ناوی شۆفێر / ئۆتۆمبێل
  birdCount: number;         // ژمارەی مریشک
  grossWeightKg: number;     // کێشی گشتی (بە ئۆتۆمبێل)
  tareWeightKg: number;      // کێشی بەتاڵ (تەفریق)
  netWeightKg: number;       // کێشی خاوێنی زیندوو
  processedLiveWeightKg: number; // ئەو کێشەی تا ئێستا سەربڕدراوە لەم وەسڵە
  remainingLiveWeightKg: number; // ئەوەندەی لەم وەسڵە ماوەتەوە بۆ سەربڕین
  pricePerKg: number;        // نرخی کڕینی کیلۆ لە کێڵگە
  totalAmount: number;       // کۆی پارە
  paymentStatus: 'PAID' | 'DEBT' | 'PARTIAL';
  paidAmount: number;
  notes?: string;
  yieldProcessed?: boolean;
}

export interface YieldRecord {
  id: string;
  intakeId: string;
  manualReceiptNo: string;
  farmName: string;
  date: string;
  batchLiveWeightKg: number;
  dressedWeightKg: number;
  wasteWeightKg: number;
  yieldPercentage: number;
  wastePercentage: number;
  remainingAfterBatchKg: number;
  cuts: {
    productId: string;
    productName: string;
    weightKg: number;
  }[];
  notes?: string;
}

export type DispatchDestination = 'REP' | 'BRANCH' | 'GIFT' | 'RETURN';

export interface DispatchItem {
  productId: string;
  productName: string;
  barcode: string;
  weightKg: number;
  pricePerKg: number;
  totalAmount: number;
}

export interface DispatchOrder {
  id: string;
  manualReceiptNo: string;
  date: string;
  time?: string;
  destinationType: DispatchDestination;
  destinationName: string;
  repName?: string;
  customerName?: string;
  paymentType?: 'CREDIT' | 'CASH';
  driverOrRepPhone?: string;
  items: DispatchItem[];
  totalWeightKg: number;
  totalAmount: number;
  status: 'DISPATCHED' | 'COMPLETED' | 'RETURN_INSPECTED';
  notes?: string;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  barcode: string;
  weightKg: number;
  soldWeightKg?: number;
  salePricePerKg?: number;
  unitCost: number;
  totalLoss: number;
  customerDeductionAmount?: number;
  reason: 'EXPIRED_3_DAYS' | 'DAMAGED' | 'SPOILED';
}

export interface ReturnOrder {
  id: string;
  dispatchId?: string;
  salesReceiptNo?: string;
  manualReceiptNo: string;
  date: string;
  time?: string;
  sourceType: 'REP' | 'BRANCH';
  sourceName: string;
  customerName?: string;
  repName?: string;
  items: ReturnItem[];
  totalWeightKg: number;
  totalLossAmount: number;
  totalCustomerDeduction?: number;
  disposalMethod: 'DESTROYED' | 'RENDERED_BONES';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'SUPERMARKET' | 'RESTAURANT' | 'HOTEL' | 'WHOLESALER';
  address: string;
  currentDebt: number;          // بڕی قەرز
  creditLimit: number;          // سنووری قەرز
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  farmLocation: string;
  currentBalance: number;       // قەرزی کێڵگە لەسەر کارگە
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: 'ELECTRICITY' | 'FUEL' | 'ICE' | 'PACKAGING' | 'SALARIES' | 'MAINTENANCE' | 'OTHER';
  title: string;
  amount: number;
  recipient: string;
  receiptNo?: string;
  notes?: string;
}

// Payment Voucher with previous debt, paid, discount, and remaining debt + exact time
export interface PaymentVoucher {
  id: string;
  voucherNo: string;
  date: string;                  // بەروار
  time: string;                  // کاتژمێری دانەوەی قەرز (بۆ نموونە: 10:15 ب.ن)
  type: 'RECEIPT' | 'PAYMENT';   // سند قبض (وەرگرتن لە کڕیار) | سند صرف (پێدان بە کێڵگە)
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyId: string;
  partyName: string;
  previousDebt: number;          // بڕی قەرز پێش دانەوە
  amount: number;                // بڕی دراو / وەرگیراو
  discount: number;              // داشکاندن (خصم)
  remainingDebt: number;         // بڕی قەرزی ماوە دوای ئەم سەنەدە
  paymentMethod: 'CASH' | 'TRANSFER';
  notes?: string;
}

export interface POSSaleItem {
  productId: string;
  productName: string;
  barcode?: string;
  weightKg: number;
  pricePerKg: number;
  total: number;
}

export interface POSSale {
  id: string;
  saleNo: string;
  date: string;
  time?: string;
  items: POSSaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount?: number;
  changeAmount?: number;
  paymentType: 'CASH' | 'FIB_OR_CARD' | 'DEBT';
  customerName?: string;
  cashierName: string;
}

// ==========================================
// DEDICATED STORE (BRANCH) TYPES
// ==========================================
export interface BranchStockItem {
  productId: string;
  productName: string;
  code: string;
  barcode: string;
  inStockKg: number;
  minAlertKg: number;
  retailPricePerKg: number;
  factoryCostPerKg: number;
  category?: ProductCategory;
  unit?: 'KG' | 'PIECE';
}

export interface BranchDeliveryItem {
  productId: string;
  productName: string;
  weightKg: number;
  factoryPricePerKg: number;
  totalCost: number;
}

export interface BranchDelivery {
  id: string;
  manualReceiptNo: string;       // ژمارەی وەسڵی دەستی کارگە
  date: string;                  // بەروار
  time: string;                  // کاتژمێر
  repName: string;               // مەندوبی هێنەر
  driverPhone?: string;
  items: BranchDeliveryItem[];
  totalWeightKg: number;
  totalCost: number;
  notes?: string;
}

export interface BranchExpense {
  id: string;
  date: string;
  time?: string;
  title: string;
  category: 'RENT' | 'ELECTRICITY' | 'PACKAGING' | 'SALARIES' | 'CLEANING' | 'MAINTENANCE' | 'OTHER';
  amount: number;
  notes?: string;
}
