import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  INITIAL_PRODUCTS,
  INITIAL_INTAKES,
  INITIAL_YIELDS,
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_DISPATCHES,
  INITIAL_RETURNS,
  INITIAL_EXPENSES,
  INITIAL_VOUCHERS,
  INITIAL_POS_SALES,
  INITIAL_BRANCH_STOCK,
  INITIAL_BRANCH_DELIVERIES,
  INITIAL_BRANCH_EXPENSES,
  INITIAL_CUSTODY_TRANSFERS,
  INITIAL_DAILY_SETTLEMENTS,
  INITIAL_USERS,
} from '../data/mockData';
import {
  ProductItem,
  LiveIntake,
  YieldRecord,
  Customer,
  Supplier,
  DispatchOrder,
  ReturnOrder,
  ExpenseRecord,
  PaymentVoucher,
  POSSale,
  BranchStockItem,
  BranchDelivery,
  BranchExpense,
  CustodyTransfer,
  DailySettlement,
  User,
  FactorySettings,
  TrashEntityType,
  SoftDeletedItem,
  ActivityCategory,
  ActivityActionType,
  ActivityLogEntry,
  UserRole,
} from '../types';

export const ALL_SYSTEM_SECTIONS: { id: string; label: string; groupLabel: string }[] = [
  { id: 'dashboard', label: 'داشبۆردی سەرەکی', groupLabel: 'سەرەکی' },
  { id: 'intake', label: '١. وەرگرتنی مریشک (کێڵگە)', groupLabel: 'کارگە و کۆگا' },
  { id: 'production', label: '٢. سەربڕین و پارچەکردن', groupLabel: 'کارگە و کۆگا' },
  { id: 'ready-for-sale', label: '٣. ئامادە بۆ فرۆشتن', groupLabel: 'کارگە و کۆگا' },
  { id: 'custody', label: '٤. ناردن بۆ مەندوب و شۆرۆم', groupLabel: 'ناردن و فرۆشتن' },
  { id: 'rep-sales', label: '٥. فرۆشتنی مەندوب و گەڕاوە', groupLabel: 'ناردن و فرۆشتن' },
  { id: 'pos', label: '٦. فرۆشگای شۆرۆم (POS)', groupLabel: 'ناردن و فرۆشتن' },
  { id: 'gifts', label: '٧. دیاری و هەدیە', groupLabel: 'ناردن و فرۆشتن' },
  { id: 'accounting', label: '٨. کەشف حساب و دانەوەی قەرز', groupLabel: 'ژمێریاری و ڕاپۆرت' },
  { id: 'reports', label: '٩. قازانج و زەرەر و ڕاپۆرتی ڕۆژانە', groupLabel: 'ژمێریاری و ڕاپۆرت' },
  { id: 'settings', label: 'سیتینی کارگە و ئەکاونتەکان', groupLabel: 'بەڕێوەبردن' },
];

export const getDefaultTabsForRole = (role: UserRole): string[] => {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ALL_SYSTEM_SECTIONS.map(s => s.id);
    case 'ACCOUNTANT':
      return ['dashboard', 'accounting', 'reports'];
    case 'REP':
      return ['dashboard', 'custody', 'rep-sales', 'gifts'];
    case 'CASHIER':
      return ['dashboard', 'pos'];
    default:
      return ['dashboard'];
  }
};

interface AppContextType {
  products: ProductItem[];
  intakes: LiveIntake[];
  yields: YieldRecord[];
  customers: Customer[];
  suppliers: Supplier[];
  dispatches: DispatchOrder[];
  returns: ReturnOrder[];
  expenses: ExpenseRecord[];
  vouchers: PaymentVoucher[];
  posSales: POSSale[];

  // Dedicated Store (Branch) states
  branchStock: BranchStockItem[];
  branchDeliveries: BranchDelivery[];
  branchExpenses: BranchExpense[];

  // Rep & Branch Custody Transfers
  custodyTransfers: CustodyTransfer[];

  // Daily Rep & Showroom Financial Settlements
  settlements: DailySettlement[];

  // Authentication & Users
  currentUser: User;
  users: User[];
  login: (phone: string, pass: string) => boolean;
  switchUser: (userId: string) => void;
  logout: () => void;
  hasAccess: (tab: string) => boolean;
  isAuthenticated: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;

  // Actions
  addIntake: (intake: Omit<LiveIntake, 'id' | 'processedLiveWeightKg' | 'remainingLiveWeightKg'>) => void;
  addYieldRecord: (record: Omit<YieldRecord, 'id' | 'remainingAfterBatchKg'>) => void;
  addDispatch: (dispatch: Omit<DispatchOrder, 'id'>) => void;
  addReturn: (returnOrder: Omit<ReturnOrder, 'id'>) => void;
  convertReturnOrder: (
    returnId: string,
    outputs: { productId: string; productName: string; weightKg: number }[],
    notes?: string
  ) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  addVoucher: (voucher: Omit<PaymentVoucher, 'id' | 'previousDebt' | 'remainingDebt'>) => void;
  addPOSSale: (sale: Omit<POSSale, 'id' | 'saleNo'>) => POSSale;
  updateProductPrice: (id: string, newPrice: number, newCost: number) => void;
  
  // Dedicated Store Actions
  addBranchDelivery: (delivery: Omit<BranchDelivery, 'id'>) => void;
  addBranchExpense: (expense: Omit<BranchExpense, 'id'>) => void;
  updateBranchStockItem: (productId: string, updates: Partial<BranchStockItem>) => void;

  // Custody Actions (Rep & Branch Stock Reconciliation)
  loadToRepCustody: (transfer: Omit<CustodyTransfer, 'id' | 'direction'>) => void;
  returnUnsoldToReadyStock: (transfer: Omit<CustodyTransfer, 'id' | 'direction'>) => void;

  // Daily Settlement Action
  addDailySettlement: (settlement: Omit<DailySettlement, 'id'>) => DailySettlement;

  // Factory Settings, Account Management, Soft Delete & Activity Log
  factorySettings: FactorySettings;
  updateFactorySettings: (updates: Partial<FactorySettings>) => void;
  addUser: (userData: Omit<User, 'id'>) => { ok: boolean; error?: string; user?: User };
  updateUser: (
    userId: string,
    updates: Partial<Omit<User, 'id' | 'isSuperAdmin'>>
  ) => { ok: boolean; error?: string };
  trashItems: SoftDeletedItem[];
  softDeleteRecord: (entityType: TrashEntityType, entityId: string, reason?: string) => boolean;
  restoreTrashItem: (trashId: string) => boolean;
  permanentlyDeleteTrashItem: (trashId: string) => void;
  emptyTrash: () => void;
  activityLogs: ActivityLogEntry[];
  clearActivityLogs: () => void;

  // Rep list (from Settings REP users + historical dispatches/custody/settlements)
  repNames: string[];

  // Barcode decoding utility
  parseWeightBarcode: (barcodeStr: string) => { product?: ProductItem; branchItem?: BranchStockItem; weightKg: number; valid: boolean };

  // Full System Backup & Restore
  exportSystemBackup: () => string;
  importSystemBackup: (jsonStr: string) => { ok: boolean; error?: string; stats?: string };

  // Cloudflare D1 Cloud Sync
  cloudSyncStatus: 'SYNCING' | 'SYNCED' | 'LOCAL_ONLY' | 'ERROR';
  lastSyncedAt: string | null;
  syncNow: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'fresh_chicken_products_v4',
  INTAKES: 'fresh_chicken_intakes_v4',
  YIELDS: 'fresh_chicken_yields_v4',
  CUSTOMERS: 'fresh_chicken_customers_v4',
  SUPPLIERS: 'fresh_chicken_suppliers_v4',
  DISPATCHES: 'fresh_chicken_dispatches_v4',
  RETURNS: 'fresh_chicken_returns_v4',
  EXPENSES: 'fresh_chicken_expenses_v4',
  VOUCHERS: 'fresh_chicken_vouchers_v4',
  POS_SALES: 'fresh_chicken_pos_sales_v4',
  BRANCH_STOCK: 'fresh_chicken_branch_stock_v4',
  BRANCH_DELIVERIES: 'fresh_chicken_branch_deliveries_v4',
  BRANCH_EXPENSES: 'fresh_chicken_branch_expenses_v4',
  CUSTODY_TRANSFERS: 'fresh_chicken_custody_v4',
  DAILY_SETTLEMENTS: 'fresh_chicken_settlements_v4',
  USERS: 'fresh_chicken_users_v4',
  CURRENT_USER: 'fresh_chicken_current_user_v4',
  FACTORY_SETTINGS: 'fresh_chicken_settings_v4',
  TRASH_ITEMS: 'fresh_chicken_trash_v4',
  ACTIVITY_LOGS: 'fresh_chicken_activity_logs_v4',
};

const DEFAULT_FACTORY_SETTINGS: FactorySettings = {
  factoryName: 'کارگەی مریشکی فرێش',
  shortCode: 'FFC-POS',
  tagline: 'سیستەمی بەڕێوەبردنی کارگە، مەندوب، شۆرۆم و ژمێریاری',
  showroomName: 'فرۆشگای تایبەت (شۆرۆم POS)',
  phone1: '0770 111 2233',
  phone2: '0750 111 2233',
  address: 'کوردستان - ناوچەی پیشەسازی',
  licenseNo: 'FFC-2026-IQ',
  currency: 'د.ع',
  returnWindowDays: 3,
  receiptFooter: 'سوپاس بۆ متمانەتان • مریشکی فرێش هەمیشە تەندروست و پاکژە',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<ProductItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [intakes, setIntakes] = useState<LiveIntake[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INTAKES);
    return saved ? JSON.parse(saved) : INITIAL_INTAKES;
  });

  const [yields, setYields] = useState<YieldRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.YIELDS);
    return saved ? JSON.parse(saved) : INITIAL_YIELDS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [dispatches, setDispatches] = useState<DispatchOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DISPATCHES);
    return saved ? JSON.parse(saved) : INITIAL_DISPATCHES;
  });

  const [returns, setReturns] = useState<ReturnOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RETURNS);
    return saved ? JSON.parse(saved) : INITIAL_RETURNS;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [vouchers, setVouchers] = useState<PaymentVoucher[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VOUCHERS);
    return saved ? JSON.parse(saved) : INITIAL_VOUCHERS;
  });

  const [posSales, setPosSales] = useState<POSSale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POS_SALES);
    return saved ? JSON.parse(saved) : INITIAL_POS_SALES;
  });

  const [branchStock, setBranchStock] = useState<BranchStockItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCH_STOCK);
    return saved ? JSON.parse(saved) : INITIAL_BRANCH_STOCK;
  });

  const [branchDeliveries, setBranchDeliveries] = useState<BranchDelivery[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCH_DELIVERIES);
    return saved ? JSON.parse(saved) : INITIAL_BRANCH_DELIVERIES;
  });

  const [branchExpenses, setBranchExpenses] = useState<BranchExpense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BRANCH_EXPENSES);
    return saved ? JSON.parse(saved) : INITIAL_BRANCH_EXPENSES;
  });

  const [custodyTransfers, setCustodyTransfers] = useState<CustodyTransfer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTODY_TRANSFERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTODY_TRANSFERS;
  });

  const [settlements, setSettlements] = useState<DailySettlement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DAILY_SETTLEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_DAILY_SETTLEMENTS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [factorySettings, setFactorySettings] = useState<FactorySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FACTORY_SETTINGS);
    if (saved) {
      try {
        return { ...DEFAULT_FACTORY_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_FACTORY_SETTINGS;
  });

  const [trashItems, setTrashItems] = useState<SoftDeletedItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TRASH_ITEMS);
    return saved ? JSON.parse(saved) : [];
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS);
    return saved ? JSON.parse(saved) : [];
  });

  // Default to Admin (Super Admin stays hidden unless explicitly logged in with 07701441068 / 441068)
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_USERS[1];
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => localStorage.getItem('fresh_chicken_auth_v4') === '1'
  );
  useEffect(() => {
    localStorage.setItem('fresh_chicken_auth_v4', isAuthenticated ? '1' : '0');
  }, [isAuthenticated]);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INTAKES, JSON.stringify(intakes)); }, [intakes]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.YIELDS, JSON.stringify(yields)); }, [yields]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DISPATCHES, JSON.stringify(dispatches)); }, [dispatches]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.RETURNS, JSON.stringify(returns)); }, [returns]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.VOUCHERS, JSON.stringify(vouchers)); }, [vouchers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.POS_SALES, JSON.stringify(posSales)); }, [posSales]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.BRANCH_STOCK, JSON.stringify(branchStock)); }, [branchStock]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.BRANCH_DELIVERIES, JSON.stringify(branchDeliveries)); }, [branchDeliveries]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.BRANCH_EXPENSES, JSON.stringify(branchExpenses)); }, [branchExpenses]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CUSTODY_TRANSFERS, JSON.stringify(custodyTransfers)); }, [custodyTransfers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.DAILY_SETTLEMENTS, JSON.stringify(settlements)); }, [settlements]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.FACTORY_SETTINGS, JSON.stringify(factorySettings)); }, [factorySettings]);
  useEffect(() => {
    document.title = `${factorySettings.factoryName} | ${factorySettings.shortCode}`;
  }, [factorySettings.factoryName, factorySettings.shortCode]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.TRASH_ITEMS, JSON.stringify(trashItems)); }, [trashItems]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(activityLogs)); }, [activityLogs]);

  // ==========================================
  // CLOUDFLARE D1 CLOUD SYNC ENGINE
  // ==========================================
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'SYNCING' | 'SYNCED' | 'LOCAL_ONLY' | 'ERROR'>('SYNCING');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isHydratedFromCloudRef = useRef(false);
  const skipNextPushRef = useRef(false);
  const lastServerUpdatedAtRef = useRef<string | null>(null);
  const pushTimerRef = useRef<number | null>(null);

  const buildSnapshot = useCallback(
    () => ({
      products,
      intakes,
      yields,
      customers,
      suppliers,
      dispatches,
      returns,
      expenses,
      vouchers,
      posSales,
      branchStock,
      branchDeliveries,
      branchExpenses,
      custodyTransfers,
      settlements,
      users,
      factorySettings,
      trashItems,
      activityLogs,
    }),
    [
      products,
      intakes,
      yields,
      customers,
      suppliers,
      dispatches,
      returns,
      expenses,
      vouchers,
      posSales,
      branchStock,
      branchDeliveries,
      branchExpenses,
      custodyTransfers,
      settlements,
      users,
      factorySettings,
      trashItems,
      activityLogs,
    ]
  );

  const applyCloudState = useCallback((d: Record<string, unknown>) => {
    skipNextPushRef.current = true;
    if (Array.isArray(d.products)) setProducts(d.products as ProductItem[]);
    if (Array.isArray(d.intakes)) setIntakes(d.intakes as LiveIntake[]);
    if (Array.isArray(d.yields)) setYields(d.yields as YieldRecord[]);
    if (Array.isArray(d.customers)) setCustomers(d.customers as Customer[]);
    if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers as Supplier[]);
    if (Array.isArray(d.dispatches)) setDispatches(d.dispatches as DispatchOrder[]);
    if (Array.isArray(d.returns)) setReturns(d.returns as ReturnOrder[]);
    if (Array.isArray(d.expenses)) setExpenses(d.expenses as ExpenseRecord[]);
    if (Array.isArray(d.vouchers)) setVouchers(d.vouchers as PaymentVoucher[]);
    if (Array.isArray(d.posSales)) setPosSales(d.posSales as POSSale[]);
    if (Array.isArray(d.branchStock)) setBranchStock(d.branchStock as BranchStockItem[]);
    if (Array.isArray(d.branchDeliveries)) setBranchDeliveries(d.branchDeliveries as BranchDelivery[]);
    if (Array.isArray(d.branchExpenses)) setBranchExpenses(d.branchExpenses as BranchExpense[]);
    if (Array.isArray(d.custodyTransfers)) setCustodyTransfers(d.custodyTransfers as CustodyTransfer[]);
    if (Array.isArray(d.settlements)) setSettlements(d.settlements as DailySettlement[]);
    if (Array.isArray(d.users)) {
      const nextUsers = d.users as User[];
      setUsers(nextUsers);
      setCurrentUser(prev => {
        const refreshed = nextUsers.find(u => u.id === prev.id || u.phone === prev.phone);
        return refreshed || prev;
      });
    }
    if (d.factorySettings && typeof d.factorySettings === 'object') {
      setFactorySettings(prev => ({ ...prev, ...(d.factorySettings as Partial<FactorySettings>) }));
    }
    if (Array.isArray(d.trashItems)) setTrashItems(d.trashItems as SoftDeletedItem[]);
    if (Array.isArray(d.activityLogs)) setActivityLogs(d.activityLogs as ActivityLogEntry[]);
  }, []);

  const pushStateToD1 = useCallback(async (snapshot: Record<string, unknown>) => {
    try {
      setCloudSyncStatus('SYNCING');
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: snapshot }),
      });
      if (!res.ok) {
        setCloudSyncStatus(res.status === 503 || res.status === 404 ? 'LOCAL_ONLY' : 'ERROR');
        return;
      }
      const data = (await res.json()) as { ok?: boolean; serverUpdatedAt?: string };
      if (data.ok) {
        lastServerUpdatedAtRef.current = data.serverUpdatedAt || new Date().toISOString();
        setLastSyncedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        setCloudSyncStatus('SYNCED');
      } else {
        setCloudSyncStatus('ERROR');
      }
    } catch {
      setCloudSyncStatus('LOCAL_ONLY');
    }
  }, []);

  const pullStateFromD1 = useCallback(
    async (initializeIfEmpty = false) => {
      try {
        const res = await fetch('/api/sync', { cache: 'no-store' });
        if (!res.ok) {
          setCloudSyncStatus(res.status === 503 || res.status === 404 ? 'LOCAL_ONLY' : 'ERROR');
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          empty?: boolean;
          serverUpdatedAt?: string | null;
          state?: Record<string, unknown>;
        };
        if (!data.ok) {
          setCloudSyncStatus('ERROR');
          return;
        }
        if (data.empty) {
          if (initializeIfEmpty) {
            await pushStateToD1(buildSnapshot());
          }
          return;
        }
        if (data.state && data.serverUpdatedAt !== lastServerUpdatedAtRef.current) {
          applyCloudState(data.state);
          lastServerUpdatedAtRef.current = data.serverUpdatedAt || null;
        }
        setLastSyncedAt(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
        setCloudSyncStatus('SYNCED');
      } catch {
        setCloudSyncStatus('LOCAL_ONLY');
      }
    },
    [applyCloudState, buildSnapshot, pushStateToD1]
  );

  // Initial D1 hydration + 20s background pull from other devices
  useEffect(() => {
    let active = true;
    (async () => {
      await pullStateFromD1(true);
      if (active) {
        isHydratedFromCloudRef.current = true;
      }
    })();

    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && pushTimerRef.current === null) {
        pullStateFromD1(false);
      }
    }, 20000);

    return () => {
      active = false;
      window.clearInterval(pollInterval);
    };
  }, [pullStateFromD1]);

  // Debounced auto-save to Cloudflare D1 whenever local state changes
  const snapshotObj = useMemo(() => buildSnapshot(), [buildSnapshot]);
  useEffect(() => {
    if (!isHydratedFromCloudRef.current) return;
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (pushTimerRef.current !== null) {
      window.clearTimeout(pushTimerRef.current);
    }
    pushTimerRef.current = window.setTimeout(() => {
      pushTimerRef.current = null;
      pushStateToD1(snapshotObj);
    }, 600);

    return () => {
      if (pushTimerRef.current !== null) {
        window.clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
  }, [snapshotObj, pushStateToD1]);

  const syncNow = useCallback(async () => {
    await pushStateToD1(buildSnapshot());
  }, [pushStateToD1, buildSnapshot]);

  const recordActivity = (
    category: ActivityCategory,
    action: ActivityActionType,
    title: string,
    details: string,
    refNo?: string,
    actorOverride?: User
  ) => {
    const actor = actorOverride || currentUser;
    const now = new Date();
    const isHiddenSuper = actor?.isSuperAdmin || actor?.role === 'SUPER_ADMIN';
    const entry: ActivityLogEntry = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      userId: actor?.id || 'system',
      userName: isHiddenSuper ? 'بەڕێوەبەری کارگە' : actor?.name || 'بەکارهێنەر',
      userRoleTitle: isHiddenSuper ? 'بەڕێوەبەر' : actor?.roleTitleKu || '',
      category,
      action,
      title,
      details,
      refNo,
    };
    setActivityLogs(prev => [entry, ...prev].slice(0, 500));
  };

  const hasAccess = (tab: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.isSuperAdmin || currentUser.role === 'SUPER_ADMIN') {
      return true;
    }
    const normalizedTab = tab === 'dispatch' || tab === 'returns' ? 'rep-sales' : tab;
    if (Array.isArray(currentUser.allowedTabs)) {
      return currentUser.allowedTabs.includes(normalizedTab);
    }
    return getDefaultTabsForRole(currentUser.role).includes(normalizedTab);
  };

  const login = (phone: string, pass: string): boolean => {
    const cleanId = phone.trim().toLowerCase();
    const cleanPass = pass.trim();

    // Check hidden Super Admin: 07701441068 / 441068
    if (cleanId === '07701441068' && cleanPass === '441068') {
      const superAdmin = users.find(u => u.phone === '07701441068') || INITIAL_USERS[0];
      setCurrentUser(superAdmin);
      setShowLoginModal(false);
      setIsAuthenticated(true);
      recordActivity('AUTH', 'LOGIN', 'چوونەژوورەوە بۆ سیستەم', 'چوونەژوورەوەی بەڕێوەبەر', undefined, superAdmin);
      return true;
    }

    const aliasRoleMap: Record<string, string> = {
      admin: 'ADMIN',
      accountant: 'ACCOUNTANT',
      rep: 'REP',
      cashier: 'CASHIER',
    };

    const found = users.find(u => {
      if (u.isSuperAdmin || u.isActive === false) return false;
      const matchesIdentifier = u.phone === cleanId || (aliasRoleMap[cleanId] && u.role === aliasRoleMap[cleanId]);
      return matchesIdentifier && (u.password === cleanPass || !u.password);
    });

    if (found) {
      setCurrentUser(found);
      setShowLoginModal(false);
      setIsAuthenticated(true);
      recordActivity('AUTH', 'LOGIN', 'چوونەژوورەوە بۆ سیستەم', `ئەکاونتی ${found.name} (${found.roleTitleKu}) چووە ژوورەوە`, undefined, found);
      return true;
    }
    return false;
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId && !u.isSuperAdmin && u.isActive !== false);
    if (target) {
      setCurrentUser(target);
      recordActivity('AUTH', 'LOGIN', 'گۆڕینی ئەکاونت', `گۆڕین بۆ ئەکاونتی ${target.name}`, undefined, target);
    }
  };

  const logout = () => {
    recordActivity('AUTH', 'LOGOUT', 'چوونەدەرەوە لە سیستەم', 'بەکارهێنەر لە سیستەم چووە دەرەوە');
    setIsAuthenticated(false);
    setShowLoginModal(false);
  };

  const parseWeightBarcode = (barcodeStr: string) => {
    const clean = barcodeStr.trim();
    if (!clean) return { product: undefined, branchItem: undefined, weightKg: 0, valid: false };

    // Standard 13-digit scale barcode (starts with 20, 21, 22, 23, 24, 28)
    if (clean.length === 13 && /^(20|21|22|23|24|28)/.test(clean)) {
      const prodCode = clean.substring(2, 7); // e.g. 00101
      const weightGrams = parseInt(clean.substring(7, 12), 10);
      
      const product = products.find(p => 
        clean.startsWith(p.barcodePrefix) || 
        p.code === prodCode || 
        prodCode.endsWith(p.code)
      );
      const branchItem = product ? branchStock.find(b => b.productId === product.id) : undefined;
      const weightKg = isNaN(weightGrams) ? 1 : Math.round((weightGrams / 1000) * 1000) / 1000;
      return { product, branchItem, weightKg, valid: !!(product || branchItem) };
    }

    // Direct barcode or code match
    const product = products.find(p => 
      p.code === clean || 
      p.id === clean || 
      p.barcodePrefix === clean ||
      clean.startsWith(p.barcodePrefix)
    );
    const branchItem = product 
      ? branchStock.find(b => b.productId === product.id) 
      : branchStock.find(b => b.barcode === clean || b.code === clean || b.productId === clean);

    const resolvedProduct = product || (branchItem ? products.find(p => p.id === branchItem.productId) : undefined);

    if (resolvedProduct || branchItem) {
      return { product: resolvedProduct, branchItem, weightKg: 1, valid: true };
    }

    return { product: undefined, branchItem: undefined, weightKg: 0, valid: false };
  };

  const addIntake = (newIntake: Omit<LiveIntake, 'id' | 'processedLiveWeightKg' | 'remainingLiveWeightKg'>) => {
    const id = `int-${Date.now()}`;
    const intake: LiveIntake = {
      ...newIntake,
      id,
      processedLiveWeightKg: 0,
      remainingLiveWeightKg: newIntake.netWeightKg,
    };
    setIntakes(prev => [intake, ...prev]);
    recordActivity(
      'INTAKE',
      'CREATE',
      'وەرگرتنی مریشکی زیندوو',
      `${intake.farmName} • ${intake.netWeightKg.toLocaleString()} کگم • ${intake.totalAmount.toLocaleString()} د.ع`,
      intake.manualReceiptNo
    );

    if (intake.paymentStatus === 'DEBT' || intake.paymentStatus === 'PARTIAL') {
      const remainingDebt = intake.totalAmount - (intake.paidAmount || 0);
      setSuppliers(prev => prev.map(s => {
        if (s.name.includes(intake.farmName) || intake.farmName.includes(s.name)) {
          return { ...s, currentBalance: s.currentBalance + remainingDebt };
        }
        return s;
      }));
    }
  };

  const addYieldRecord = (newYield: Omit<YieldRecord, 'id' | 'remainingAfterBatchKg'>) => {
    const id = `yld-${Date.now()}`;
    const targetIntake = intakes.find(i => i.id === newYield.intakeId);
    const prevRemaining = targetIntake ? targetIntake.remainingLiveWeightKg : 0;
    const remainingAfter = Math.max(0, prevRemaining - newYield.batchLiveWeightKg);

    const record: YieldRecord = {
      ...newYield,
      id,
      remainingAfterBatchKg: remainingAfter,
    };

    setYields(prev => [record, ...prev]);
    recordActivity(
      'PRODUCTION',
      'CREATE',
      'سەربڕین و پارچەکردن',
      `وەسڵی #${newYield.manualReceiptNo} (${newYield.farmName}) • ${newYield.batchLiveWeightKg} کگم زیندوو -> ${newYield.dressedWeightKg} کگم گۆشت`,
      newYield.manualReceiptNo
    );

    setIntakes(prev => prev.map(i => {
      if (i.id === newYield.intakeId) {
        const updatedProcessed = i.processedLiveWeightKg + newYield.batchLiveWeightKg;
        const updatedRemaining = Math.max(0, i.netWeightKg - updatedProcessed);
        return {
          ...i,
          processedLiveWeightKg: updatedProcessed,
          remainingLiveWeightKg: updatedRemaining,
          yieldProcessed: updatedRemaining <= 0,
        };
      }
      return i;
    }));

    setProducts(prev => prev.map(p => {
      const cut = newYield.cuts.find(c => c.productId === p.id);
      if (cut) {
        return { ...p, inStockKg: p.inStockKg + cut.weightKg };
      }
      return p;
    }));
  };

  const addDispatch = (newDispatch: Omit<DispatchOrder, 'id'>) => {
    const id = `disp-${Date.now()}`;
    const dispatch: DispatchOrder = { ...newDispatch, id };
    setDispatches(prev => [dispatch, ...prev]);
    recordActivity(
      'SALES',
      'CREATE',
      dispatch.destinationType === 'GIFT' ? 'دەرکردنی دیاری و هەدیە' : 'فرۆشتنی مەندوب',
      `${dispatch.customerName || dispatch.destinationName} • ${dispatch.totalWeightKg} کگم • ${dispatch.totalAmount.toLocaleString()} د.ع`,
      dispatch.manualReceiptNo
    );

    // If it's a rep or direct sale on credit to a customer, update the customer's currentDebt
    if ((dispatch.destinationType === 'REP' || dispatch.destinationType === 'DIRECT') && dispatch.paymentType === 'CREDIT') {
      const custName = dispatch.customerName || dispatch.destinationName;
      if (custName) {
        setCustomers(prev => {
          const matchIndex = prev.findIndex(c => 
            c.name.toLowerCase().includes(custName.toLowerCase()) || 
            custName.toLowerCase().includes(c.name.toLowerCase())
          );
          if (matchIndex >= 0) {
            return prev.map((c, i) => i === matchIndex ? { ...c, currentDebt: c.currentDebt + dispatch.totalAmount } : c);
          } else {
            const newCust: Customer = {
              id: `cust-${Date.now()}`,
              name: custName,
              phone: dispatch.driverOrRepPhone || '',
              type: 'SUPERMARKET',
              address: 'سلێمانی',
              currentDebt: dispatch.totalAmount,
              creditLimit: 3000000,
              createdAt: dispatch.date,
            };
            return [...prev, newCust];
          }
        });
      }
    }

    // Rep sales & Rep-custody gifts reconcile from Rep Custody; Direct & Factory Gifts deduct from Ready Stock
    if (
      dispatch.destinationType === 'DIRECT' ||
      (dispatch.destinationType === 'GIFT' && dispatch.sourceCustody !== 'REP')
    ) {
      setProducts(prev => prev.map(p => {
        const item = dispatch.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, inStockKg: Math.max(0, Number((p.inStockKg - item.weightKg).toFixed(2))) };
        }
        return p;
      }));
    }
  };

  const addReturn = (newReturn: Omit<ReturnOrder, 'id'>) => {
    const id = `ret-${Date.now()}`;
    const deduction = newReturn.totalCustomerDeduction !== undefined 
      ? newReturn.totalCustomerDeduction 
      : newReturn.totalLossAmount;
      
    const ret: ReturnOrder = { 
      ...newReturn, 
      id,
      totalCustomerDeduction: deduction,
      conversionStatus: newReturn.conversionStatus || 'PENDING',
    };
    setReturns(prev => [ret, ...prev]);
    recordActivity(
      'RETURN',
      'CREATE',
      ret.sourceType === 'BRANCH' ? 'گەڕاوەی ٣ ڕۆژی شۆرۆم' : 'گەڕاوەی ٣ ڕۆژی مەندوب',
      `${ret.customerName || ret.sourceName} • ${ret.totalWeightKg} کگم`,
      ret.manualReceiptNo
    );

    // Real-time deduction from customer's debt
    const targetCust = newReturn.customerName;
    if (targetCust && deduction > 0) {
      setCustomers(prev => prev.map(c => {
        if (c.name.includes(targetCust) || targetCust.includes(c.name)) {
          return {
            ...c,
            currentDebt: Math.max(0, c.currentDebt - deduction),
          };
        }
        return c;
      }));
    }

    // If 3-day return originates from Showroom (BRANCH), deduct expired weight from branchStock
    if (ret.sourceType === 'BRANCH') {
      setBranchStock(prev =>
        prev.map(bs => {
          const retKg = ret.items
            .filter(i => i.productId === bs.productId)
            .reduce((s, i) => s + i.weightKg, 0);
          return retKg > 0
            ? { ...bs, inStockKg: Math.max(0, Number((bs.inStockKg - retKg).toFixed(2))) }
            : bs;
        })
      );
    }
  };

  const convertReturnOrder = (
    returnId: string,
    outputs: { productId: string; productName: string; weightKg: number }[],
    notes?: string
  ) => {
    const today = new Date().toISOString().split('T')[0];

    setReturns(prev =>
      prev.map(r => {
        if (r.id === returnId) {
          return {
            ...r,
            conversionStatus: 'CONVERTED',
            convertedAt: today,
            convertedOutputs: outputs,
            conversionNotes: notes,
            disposalMethod: outputs.length > 0 ? 'CONVERTED' : 'DESTROYED',
          };
        }
        return r;
      })
    );

    if (outputs.length > 0) {
      setProducts(prev =>
        prev.map(p => {
          const added = outputs
            .filter(o => o.productId === p.id)
            .reduce((s, o) => s + o.weightKg, 0);
          return added > 0 ? { ...p, inStockKg: Number((p.inStockKg + added).toFixed(2)) } : p;
        })
      );
    }
    recordActivity(
      'RETURN',
      'UPDATE',
      'گۆڕینی شێوازی گەڕاوە بۆ ئامادە',
      outputs.length > 0
        ? outputs.map(o => `${o.productName}: ${o.weightKg} کگم`).join('، ')
        : 'تەلەفکردنی گەڕاوە',
      returnId
    );
  };

  const addExpense = (newExpense: Omit<ExpenseRecord, 'id'>) => {
    const id = `exp-${Date.now()}`;
    setExpenses(prev => [{ ...newExpense, id }, ...prev]);
    recordActivity('FINANCE', 'CREATE', 'تۆمارکردنی خەرجی کارگە', `${newExpense.title} • ${newExpense.amount.toLocaleString()} د.ع`, newExpense.receiptNo);
  };

  const addCustomer = (newCustomer: Omit<Customer, 'id' | 'createdAt'>) => {
    const id = `cust-${Date.now()}`;
    const customer: Customer = {
      ...newCustomer,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers(prev => [...prev, customer]);
    recordActivity('FINANCE', 'CREATE', 'زیادکردنی کڕیار / مارکێت', `${customer.name} (${customer.phone || 'بێ ژمارە'})`);
  };

  const addSupplier = (newSupplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    const id = `supp-${Date.now()}`;
    const supplier: Supplier = {
      ...newSupplier,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSuppliers(prev => [...prev, supplier]);
    recordActivity('INTAKE', 'CREATE', 'زیادکردنی کێڵگە / دابینکەر', `${supplier.name} (${supplier.phone})`);
  };

  // Enhanced addVoucher: tracks previousDebt, amount, discount, remainingDebt, and time!
  const addVoucher = (newVoucher: Omit<PaymentVoucher, 'id' | 'previousDebt' | 'remainingDebt'>) => {
    const id = `vouch-${Date.now()}`;
    const totalSettled = newVoucher.amount + (newVoucher.discount || 0);

    let previousDebt = 0;

    if (newVoucher.partyType === 'CUSTOMER') {
      const customer = customers.find(c => c.id === newVoucher.partyId);
      previousDebt = customer ? customer.currentDebt : 0;
      const remainingDebt = Math.max(0, previousDebt - totalSettled);

      const voucher: PaymentVoucher = {
        ...newVoucher,
        id,
        previousDebt,
        remainingDebt,
      };

      setVouchers(prev => [voucher, ...prev]);

      setCustomers(prev => prev.map(c => {
        if (c.id === newVoucher.partyId) {
          return { ...c, currentDebt: remainingDebt };
        }
        return c;
      }));
      recordActivity('FINANCE', 'CREATE', 'سەنەدی وەرگرتن لە کڕیار', `${newVoucher.partyName} • ${newVoucher.amount.toLocaleString()} د.ع`, newVoucher.voucherNo);
    } else {
      const supplier = suppliers.find(s => s.id === newVoucher.partyId);
      previousDebt = supplier ? supplier.currentBalance : 0;
      const remainingDebt = Math.max(0, previousDebt - totalSettled);

      const voucher: PaymentVoucher = {
        ...newVoucher,
        id,
        previousDebt,
        remainingDebt,
      };

      setVouchers(prev => [voucher, ...prev]);

      setSuppliers(prev => prev.map(s => {
        if (s.id === newVoucher.partyId) {
          return { ...s, currentBalance: remainingDebt };
        }
        return s;
      }));
      recordActivity('FINANCE', 'CREATE', 'سەنەدی پێدان بە کێڵگە', `${newVoucher.partyName} • ${newVoucher.amount.toLocaleString()} د.ع`, newVoucher.voucherNo);
    }
  };

  const addPOSSale = (saleData: Omit<POSSale, 'id' | 'saleNo'>): POSSale => {
    const id = `pos-${Date.now()}`;
    const saleNo = `POS-${String(posSales.length + 1).padStart(4, '0')}`;
    const sale: POSSale = { ...saleData, id, saleNo };
    setPosSales(prev => [sale, ...prev]);
    recordActivity(
      'SALES',
      'CREATE',
      'فرۆشتن لە شۆرۆم (POS)',
      `${sale.customerName || 'کڕیار'} • ${sale.total.toLocaleString()} د.ع (${sale.paymentType})`,
      sale.saleNo
    );

    // Deduct from branch's dedicated stock
    setBranchStock(prev => prev.map(bs => {
      const item = sale.items.find(i => i.productId === bs.productId);
      if (item) {
        return { ...bs, inStockKg: Math.max(0, Number((bs.inStockKg - item.weightKg).toFixed(2))) };
      }
      return bs;
    }));

    // If Showroom POS sale is on DEBT, add to the customer's debt ledger
    if (sale.paymentType === 'DEBT' && sale.total > 0) {
      const targetName = (sale.customerName || '').trim();
      setCustomers(prev => {
        const matchIndex = prev.findIndex(
          c =>
            (sale.customerId && c.id === sale.customerId) ||
            (targetName &&
              (c.name.toLowerCase().includes(targetName.toLowerCase()) ||
                targetName.toLowerCase().includes(c.name.toLowerCase())))
        );
        if (matchIndex >= 0) {
          return prev.map((c, i) =>
            i === matchIndex ? { ...c, currentDebt: c.currentDebt + sale.total } : c
          );
        }
        if (targetName) {
          const newCust: Customer = {
            id: `cust-${Date.now()}`,
            name: targetName,
            phone: '',
            type: 'SUPERMARKET',
            address: 'کڕیاری شۆرۆم',
            currentDebt: sale.total,
            creditLimit: 3000000,
            createdAt: sale.date.slice(0, 10),
          };
          return [...prev, newCust];
        }
        return prev;
      });
    }

    return sale;
  };

  const addBranchDelivery = (deliveryData: Omit<BranchDelivery, 'id'>) => {
    const id = `bdel-${Date.now()}`;
    const delivery: BranchDelivery = { ...deliveryData, id };
    setBranchDeliveries(prev => [delivery, ...prev]);

    // Add received weight to branch store stock
    setBranchStock(prev => prev.map(bs => {
      const arrived = delivery.items.find(i => i.productId === bs.productId);
      if (arrived) {
        return { ...bs, inStockKg: bs.inStockKg + arrived.weightKg };
      }
      return bs;
    }));

    // Deduct from factory inventory
    setProducts(prev => prev.map(p => {
      const arrived = delivery.items.find(i => i.productId === p.id);
      if (arrived) {
        return { ...p, inStockKg: Math.max(0, p.inStockKg - arrived.weightKg) };
      }
      return p;
    }));
  };

  const addBranchExpense = (expData: Omit<BranchExpense, 'id'>) => {
    const id = `bexp-${Date.now()}`;
    setBranchExpenses(prev => [{ ...expData, id }, ...prev]);
    recordActivity('FINANCE', 'CREATE', 'خەرجی شۆرۆم (POS)', `${expData.title} • ${expData.amount.toLocaleString()} د.ع`);
  };

  const updateBranchStockItem = (productId: string, updates: Partial<BranchStockItem>) => {
    setBranchStock(prev => prev.map(item => item.productId === productId ? { ...item, ...updates } : item));
  };

  const updateProductPrice = (id: string, newPrice: number, newCost: number) => {
    const prod = products.find(p => p.id === id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, pricePerKg: newPrice, costPerKg: newCost } : p));
    recordActivity(
      'PRODUCTION',
      'UPDATE',
      'گۆڕینی نرخی بەرهەم',
      `${prod?.nameKu || id}: فرۆشتن ${newPrice.toLocaleString()} د.ع • تێچوو ${newCost.toLocaleString()} د.ع`
    );
  };

  const loadToRepCustody = (transfer: Omit<CustodyTransfer, 'id' | 'direction'>) => {
    const id = `cust-ld-${Date.now()}`;
    const record: CustodyTransfer = { ...transfer, id, direction: 'LOAD' };
    setCustodyTransfers(prev => [record, ...prev]);
    recordActivity(
      'CUSTODY',
      'CREATE',
      'ناردنی بار بۆ عەهدە',
      `${transfer.holderName} • ${transfer.totalWeightKg} کگم`,
      transfer.receiptNo
    );

    setProducts(prev =>
      prev.map(p => {
        const sent = transfer.items
          .filter(i => i.productId === p.id)
          .reduce((s, i) => s + i.weightKg, 0);
        return sent > 0 ? { ...p, inStockKg: Math.max(0, Number((p.inStockKg - sent).toFixed(2))) } : p;
      })
    );
  };

  const returnUnsoldToReadyStock = (transfer: Omit<CustodyTransfer, 'id' | 'direction'>) => {
    const id = `cust-ret-${Date.now()}`;
    const record: CustodyTransfer = { ...transfer, id, direction: 'RETURN_TO_READY' };
    setCustodyTransfers(prev => [record, ...prev]);
    recordActivity(
      'CUSTODY',
      'UPDATE',
      'گەڕاندنەوەی نەفرۆشراو بۆ ئامادە',
      `${transfer.holderName} • ${transfer.totalWeightKg} کگم`,
      transfer.receiptNo
    );

    // Add unsold weights back into Ready Stock (کۆگای ئامادە)
    setProducts(prev =>
      prev.map(p => {
        const retKg = transfer.items
          .filter(i => i.productId === p.id)
          .reduce((s, i) => s + i.weightKg, 0);
        return retKg > 0 ? { ...p, inStockKg: Number((p.inStockKg + retKg).toFixed(2)) } : p;
      })
    );

    // If returned from Dedicated Store POS (Branch), deduct from branchStock
    if (transfer.holderType === 'BRANCH') {
      setBranchStock(prev =>
        prev.map(bs => {
          const retKg = transfer.items
            .filter(i => i.productId === bs.productId)
            .reduce((s, i) => s + i.weightKg, 0);
          return retKg > 0 ? { ...bs, inStockKg: Math.max(0, Number((bs.inStockKg - retKg).toFixed(2))) } : bs;
        })
      );
    }
  };

  const addDailySettlement = (data: Omit<DailySettlement, 'id'>): DailySettlement => {
    const id = `set-${Date.now()}`;
    const record: DailySettlement = { ...data, id };
    setSettlements(prev => [record, ...prev]);
    recordActivity(
      'FINANCE',
      'CREATE',
      'تەسفییەی ڕۆژانە',
      `تەسفییە بۆ ${data.accountName} - گەڕاوە: ${(data.returnedCashAmount + data.returnedCardAmount).toLocaleString()} د.ع`,
      data.settlementNo
    );
    return record;
  };

  // ==========================================
  // FACTORY SETTINGS, ACCOUNTS, SOFT DELETE & LOGS
  // ==========================================
  const updateFactorySettings = (updates: Partial<FactorySettings>) => {
    const updatedAt = new Date().toLocaleString('en-GB');
    setFactorySettings(prev => ({ ...prev, ...updates, updatedAt }));
    recordActivity(
      'SETTINGS',
      'UPDATE',
      'نوێکردنەوەی زانیاری کارگە',
      `زانیارییەکانی کارگە (${updates.factoryName || factorySettings.factoryName}) نوێکرایەوە`
    );
  };

  const addUser = (userData: Omit<User, 'id'>): { ok: boolean; error?: string; user?: User } => {
    const cleanPhone = userData.phone.trim();
    if (!userData.name.trim() || !cleanPhone || !userData.password?.trim()) {
      return { ok: false, error: 'تکایە ناو، ژمارەی مۆبایل و وشەی نهێنی بنووسە' };
    }
    if (cleanPhone === '07701441068' || users.some(u => u.phone.trim() === cleanPhone)) {
      return { ok: false, error: 'ئەم ژمارە مۆبایلە پێشتر تۆمارکراوە!' };
    }
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      phone: cleanPhone,
      password: userData.password.trim(),
      isSuperAdmin: false,
      isActive: userData.isActive !== false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setUsers(prev => [...prev, newUser]);
    recordActivity(
      'SETTINGS',
      'CREATE',
      'دروستکردنی ئەکاونتی نوێ',
      `ئەکاونتی ${newUser.name} (${newUser.roleTitleKu} - ${newUser.phone}) دروستکرا`,
      newUser.phone
    );
    return { ok: true, user: newUser };
  };

  const updateUser = (
    userId: string,
    updates: Partial<Omit<User, 'id' | 'isSuperAdmin'>>
  ): { ok: boolean; error?: string } => {
    const existing = users.find(u => u.id === userId && !u.isSuperAdmin);
    if (!existing) return { ok: false, error: 'ئەکاونت نەدۆزرایەوە' };

    if (updates.phone) {
      const cleanPhone = updates.phone.trim();
      if (
        cleanPhone === '07701441068' ||
        users.some(u => u.id !== userId && u.phone.trim() === cleanPhone)
      ) {
        return { ok: false, error: 'ئەم ژمارە مۆبایلە بۆ ئەکاونتێکی تر بەکارهێنراوە' };
      }
    }

    const applyUserPatch = (u: User): User => ({
      ...u,
      ...updates,
      name: updates.name !== undefined ? updates.name.trim() : u.name,
      phone: updates.phone !== undefined ? updates.phone.trim() : u.phone,
      password: updates.password && updates.password.trim() ? updates.password.trim() : u.password,
    });

    setUsers(prev =>
      prev.map(u => {
        if (u.id !== userId || u.isSuperAdmin) return u;
        return applyUserPatch(u);
      })
    );

    if (currentUser?.id === userId && !currentUser.isSuperAdmin) {
      setCurrentUser(prev => applyUserPatch(prev));
    }

    recordActivity(
      'SETTINGS',
      'UPDATE',
      'دەستکاریکردنی ئەکاونت',
      `زانیاری ئەکاونتی ${updates.name || existing.name} نوێکرایەوە`,
      updates.phone || existing.phone
    );
    return { ok: true };
  };

  const softDeleteRecord = (
    entityType: TrashEntityType,
    entityId: string,
    reason?: string
  ): boolean => {
    const now = new Date();
    const deletedAt = now.toISOString().slice(0, 10);
    const deletedTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const actorName =
      currentUser?.role === 'SUPER_ADMIN' ? 'بەڕێوەبەری کارگە' : currentUser?.name || 'بەڕێوەبەر';

    let entry: Omit<SoftDeletedItem, 'id' | 'deletedAt' | 'deletedTime' | 'deletedBy' | 'reason'> | null =
      null;

    if (entityType === 'USER') {
      const target = users.find(u => u.id === entityId && !u.isSuperAdmin);
      if (!target || target.id === currentUser.id) return false;
      setUsers(prev => prev.filter(u => u.id !== entityId));
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'ئەکاونتی بەکارهێنەر',
        title: target.name,
        subtitle: `${target.roleTitleKu} • ${target.phone}`,
        payload: target,
      };
    } else if (entityType === 'CUSTOMER') {
      const target = customers.find(c => c.id === entityId);
      if (!target) return false;
      setCustomers(prev => prev.filter(c => c.id !== entityId));
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'کڕیار / مارکێت',
        title: target.name,
        subtitle: `قەرز: ${target.currentDebt.toLocaleString()} د.ع • ${target.phone || 'بێ ژمارە'}`,
        payload: target,
      };
    } else if (entityType === 'SUPPLIER') {
      const target = suppliers.find(s => s.id === entityId);
      if (!target) return false;
      setSuppliers(prev => prev.filter(s => s.id !== entityId));
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'کێڵگە / دابینکەر',
        title: target.name,
        subtitle: `باڵانس: ${target.currentBalance.toLocaleString()} د.ع • ${target.phone}`,
        payload: target,
      };
    } else if (entityType === 'INTAKE') {
      const target = intakes.find(i => i.id === entityId);
      if (!target) return false;
      setIntakes(prev => prev.filter(i => i.id !== entityId));
      if (target.paymentStatus === 'DEBT' || target.paymentStatus === 'PARTIAL') {
        const unpaid = Math.max(0, target.totalAmount - (target.paidAmount || 0));
        if (unpaid > 0) {
          setSuppliers(prev =>
            prev.map(s =>
              s.name.includes(target.farmName) || target.farmName.includes(s.name)
                ? { ...s, currentBalance: Math.max(0, s.currentBalance - unpaid) }
                : s
            )
          );
        }
      }
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'وەسڵی وەرگرتن',
        title: `#${target.manualReceiptNo} • ${target.farmName}`,
        subtitle: `${target.date} • ${target.netWeightKg.toLocaleString()} کگم • ${target.totalAmount.toLocaleString()} د.ع`,
        payload: target,
      };
    } else if (entityType === 'DISPATCH') {
      const target = dispatches.find(d => d.id === entityId);
      if (!target) return false;
      setDispatches(prev => prev.filter(d => d.id !== entityId));
      if ((target.destinationType === 'REP' || target.destinationType === 'DIRECT') && target.paymentType === 'CREDIT') {
        const custName = target.customerName || target.destinationName;
        if (custName) {
          setCustomers(prev =>
            prev.map(c =>
              c.name.toLowerCase().includes(custName.toLowerCase()) ||
              custName.toLowerCase().includes(c.name.toLowerCase())
                ? { ...c, currentDebt: Math.max(0, c.currentDebt - target.totalAmount) }
                : c
            )
          );
        }
      }
      if (
        target.destinationType === 'DIRECT' ||
        (target.destinationType === 'GIFT' && target.sourceCustody !== 'REP')
      ) {
        setProducts(prev =>
          prev.map(p => {
            const retKg = target.items
              .filter(i => i.productId === p.id)
              .reduce((s, i) => s + i.weightKg, 0);
            return retKg > 0 ? { ...p, inStockKg: Number((p.inStockKg + retKg).toFixed(2)) } : p;
          })
        );
      }
      entry = {
        entityType,
        entityId,
        entityLabelKu: target.destinationType === 'GIFT' ? 'وەسڵی هەدیە' : 'وەسڵی فرۆشی مەندوب',
        title: `#${target.manualReceiptNo} • ${target.customerName || target.destinationName}`,
        subtitle: `${target.date} • ${target.totalWeightKg} کگم • ${target.totalAmount.toLocaleString()} د.ع`,
        payload: target,
      };
    } else if (entityType === 'POS_SALE') {
      const target = posSales.find(s => s.id === entityId);
      if (!target) return false;
      setPosSales(prev => prev.filter(s => s.id !== entityId));
      // Rollback branch stock
      setBranchStock(prev =>
        prev.map(bs => {
          const soldKg = target.items
            .filter(i => i.productId === bs.productId)
            .reduce((sum, i) => sum + i.weightKg, 0);
          return soldKg > 0 ? { ...bs, inStockKg: Number((bs.inStockKg + soldKg).toFixed(2)) } : bs;
        })
      );
      // Rollback customer debt if CREDIT/DEBT
      if (target.paymentType === 'DEBT' && target.total > 0) {
        const custName = (target.customerName || '').trim();
        setCustomers(prev =>
          prev.map(c =>
            (target.customerId && c.id === target.customerId) ||
            (custName &&
              (c.name.toLowerCase().includes(custName.toLowerCase()) ||
                custName.toLowerCase().includes(c.name.toLowerCase())))
              ? { ...c, currentDebt: Math.max(0, c.currentDebt - target.total) }
              : c
          )
        );
      }
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'وەسڵی شۆرۆم (POS)',
        title: `#${target.saleNo} • ${target.customerName || 'کڕیار'}`,
        subtitle: `${target.date} • ${target.total.toLocaleString()} د.ع (${target.paymentType})`,
        payload: target,
      };
    } else if (entityType === 'RETURN') {
      const target = returns.find(r => r.id === entityId);
      if (!target) return false;
      setReturns(prev => prev.filter(r => r.id !== entityId));
      const deduction = target.totalCustomerDeduction ?? target.totalLossAmount;
      if (target.customerName && deduction > 0) {
        setCustomers(prev =>
          prev.map(c =>
            c.name.includes(target.customerName!) || target.customerName!.includes(c.name)
              ? { ...c, currentDebt: c.currentDebt + deduction }
              : c
          )
        );
      }
      if (target.sourceType === 'BRANCH') {
        setBranchStock(prev =>
          prev.map(bs => {
            const retKg = target.items
              .filter(i => i.productId === bs.productId)
              .reduce((s, i) => s + i.weightKg, 0);
            return retKg > 0 ? { ...bs, inStockKg: Number((bs.inStockKg + retKg).toFixed(2)) } : bs;
          })
        );
      }
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'گەڕاوەی ٣ ڕۆژ',
        title: `#${target.manualReceiptNo} • ${target.sourceName}`,
        subtitle: `${target.date} • ${target.totalWeightKg} کگم • ${target.totalLossAmount.toLocaleString()} د.ع`,
        payload: target,
      };
    } else if (entityType === 'VOUCHER') {
      const target = vouchers.find(v => v.id === entityId);
      if (!target) return false;
      setVouchers(prev => prev.filter(v => v.id !== entityId));
      const totalSettled = target.amount + (target.discount || 0);
      if (target.partyType === 'CUSTOMER') {
        setCustomers(prev =>
          prev.map(c =>
            c.id === target.partyId ? { ...c, currentDebt: c.currentDebt + totalSettled } : c
          )
        );
      } else {
        setSuppliers(prev =>
          prev.map(s =>
            s.id === target.partyId ? { ...s, currentBalance: s.currentBalance + totalSettled } : s
          )
        );
      }
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'سەنەدی پارەدان/وەرگرتن',
        title: `#${target.voucherNo} • ${target.partyName}`,
        subtitle: `${target.date} • ${target.amount.toLocaleString()} د.ع`,
        payload: target,
      };
    } else if (entityType === 'EXPENSE') {
      const target = expenses.find(e => e.id === entityId);
      if (!target) return false;
      setExpenses(prev => prev.filter(e => e.id !== entityId));
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'خەرجی کارگە',
        title: target.title,
        subtitle: `${target.date} • ${target.amount.toLocaleString()} د.ع`,
        payload: target,
      };
    } else if (entityType === 'BRANCH_EXPENSE') {
      const target = branchExpenses.find(e => e.id === entityId);
      if (!target) return false;
      setBranchExpenses(prev => prev.filter(e => e.id !== entityId));
      entry = {
        entityType,
        entityId,
        entityLabelKu: 'خەرجی شۆرۆم',
        title: target.title,
        subtitle: `${target.date} • ${target.amount.toLocaleString()} د.ع`,
        payload: target,
      };
    }

    if (!entry) return false;

    const trashRecord: SoftDeletedItem = {
      ...entry,
      id: `trash-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      reason: reason?.trim() || undefined,
      deletedAt,
      deletedTime,
      deletedBy: actorName,
    };

    setTrashItems(prev => [trashRecord, ...prev]);
    recordActivity(
      'TRASH',
      'DELETE',
      `سۆفت دیلیت: ${entry.entityLabelKu}`,
      `${entry.title} (${entry.subtitle})${trashRecord.reason ? ` • هۆکار: ${trashRecord.reason}` : ''}`,
      entry.entityId
    );
    return true;
  };

  const restoreTrashItem = (trashId: string): boolean => {
    const item = trashItems.find(t => t.id === trashId);
    if (!item) return false;

    if (item.entityType === 'USER') {
      const u = item.payload as User;
      setUsers(prev => (prev.some(x => x.id === u.id || x.phone === u.phone) ? prev : [...prev, u]));
    } else if (item.entityType === 'CUSTOMER') {
      const c = item.payload as Customer;
      setCustomers(prev => (prev.some(x => x.id === c.id) ? prev : [...prev, c]));
    } else if (item.entityType === 'SUPPLIER') {
      const s = item.payload as Supplier;
      setSuppliers(prev => (prev.some(x => x.id === s.id) ? prev : [...prev, s]));
    } else if (item.entityType === 'INTAKE') {
      const i = item.payload as LiveIntake;
      if (!intakes.some(x => x.id === i.id)) {
        setIntakes(prev => [i, ...prev]);
        if (i.paymentStatus === 'DEBT' || i.paymentStatus === 'PARTIAL') {
          const unpaid = Math.max(0, i.totalAmount - (i.paidAmount || 0));
          if (unpaid > 0) {
            setSuppliers(prev =>
              prev.map(s =>
                s.name.includes(i.farmName) || i.farmName.includes(s.name)
                  ? { ...s, currentBalance: s.currentBalance + unpaid }
                  : s
              )
            );
          }
        }
      }
    } else if (item.entityType === 'DISPATCH') {
      const d = item.payload as DispatchOrder;
      if (!dispatches.some(x => x.id === d.id)) {
        setDispatches(prev => [d, ...prev]);
        if ((d.destinationType === 'REP' || d.destinationType === 'DIRECT') && d.paymentType === 'CREDIT') {
          const custName = d.customerName || d.destinationName;
          if (custName) {
            setCustomers(prev =>
              prev.map(c =>
                c.name.toLowerCase().includes(custName.toLowerCase()) ||
                custName.toLowerCase().includes(c.name.toLowerCase())
                  ? { ...c, currentDebt: c.currentDebt + d.totalAmount }
                  : c
              )
            );
          }
        }
        if (
          d.destinationType === 'DIRECT' ||
          (d.destinationType === 'GIFT' && d.sourceCustody !== 'REP')
        ) {
          setProducts(prev =>
            prev.map(p => {
              const sentKg = d.items
                .filter(it => it.productId === p.id)
                .reduce((s, it) => s + it.weightKg, 0);
              return sentKg > 0
                ? { ...p, inStockKg: Math.max(0, Number((p.inStockKg - sentKg).toFixed(2))) }
                : p;
            })
          );
        }
      }
    } else if (item.entityType === 'POS_SALE') {
      const s = item.payload as POSSale;
      if (!posSales.some(x => x.id === s.id)) {
        setPosSales(prev => [s, ...prev]);
        setBranchStock(prev =>
          prev.map(bs => {
            const soldKg = s.items
              .filter(it => it.productId === bs.productId)
              .reduce((sum, it) => sum + it.weightKg, 0);
            return soldKg > 0
              ? { ...bs, inStockKg: Math.max(0, Number((bs.inStockKg - soldKg).toFixed(2))) }
              : bs;
          })
        );
        if (s.paymentType === 'DEBT' && s.total > 0) {
          const custName = (s.customerName || '').trim();
          setCustomers(prev =>
            prev.map(c =>
              (s.customerId && c.id === s.customerId) ||
              (custName &&
                (c.name.toLowerCase().includes(custName.toLowerCase()) ||
                  custName.toLowerCase().includes(c.name.toLowerCase())))
                ? { ...c, currentDebt: c.currentDebt + s.total }
                : c
            )
          );
        }
      }
    } else if (item.entityType === 'RETURN') {
      const r = item.payload as ReturnOrder;
      if (!returns.some(x => x.id === r.id)) {
        setReturns(prev => [r, ...prev]);
        const deduction = r.totalCustomerDeduction ?? r.totalLossAmount;
        if (r.customerName && deduction > 0) {
          setCustomers(prev =>
            prev.map(c =>
              c.name.includes(r.customerName!) || r.customerName!.includes(c.name)
                ? { ...c, currentDebt: Math.max(0, c.currentDebt - deduction) }
                : c
            )
          );
        }
        if (r.sourceType === 'BRANCH') {
          setBranchStock(prev =>
            prev.map(bs => {
              const retKg = r.items
                .filter(it => it.productId === bs.productId)
                .reduce((sum, it) => sum + it.weightKg, 0);
              return retKg > 0
                ? { ...bs, inStockKg: Math.max(0, Number((bs.inStockKg - retKg).toFixed(2))) }
                : bs;
            })
          );
        }
      }
    } else if (item.entityType === 'VOUCHER') {
      const v = item.payload as PaymentVoucher;
      if (!vouchers.some(x => x.id === v.id)) {
        setVouchers(prev => [v, ...prev]);
        const totalSettled = v.amount + (v.discount || 0);
        if (v.partyType === 'CUSTOMER') {
          setCustomers(prev =>
            prev.map(c =>
              c.id === v.partyId ? { ...c, currentDebt: Math.max(0, c.currentDebt - totalSettled) } : c
            )
          );
        } else {
          setSuppliers(prev =>
            prev.map(s =>
              s.id === v.partyId
                ? { ...s, currentBalance: Math.max(0, s.currentBalance - totalSettled) }
                : s
            )
          );
        }
      }
    } else if (item.entityType === 'EXPENSE') {
      const e = item.payload as ExpenseRecord;
      setExpenses(prev => (prev.some(x => x.id === e.id) ? prev : [e, ...prev]));
    } else if (item.entityType === 'BRANCH_EXPENSE') {
      const e = item.payload as BranchExpense;
      setBranchExpenses(prev => (prev.some(x => x.id === e.id) ? prev : [e, ...prev]));
    }

    setTrashItems(prev => prev.filter(t => t.id !== trashId));
    recordActivity(
      'TRASH',
      'RESTORE',
      `گەڕاندنەوەی ${item.entityLabelKu}`,
      `${item.title} لە سەبەتەی سۆفت دیلیت گەڕێندرایەوە`,
      item.entityId
    );
    return true;
  };

  const permanentlyDeleteTrashItem = (trashId: string) => {
    const item = trashItems.find(t => t.id === trashId);
    if (!item) return;
    setTrashItems(prev => prev.filter(t => t.id !== trashId));
    recordActivity(
      'TRASH',
      'PURGE',
      `سڕینەوەی یەکجاری: ${item.entityLabelKu}`,
      `${item.title} بە تەواوی لە سەبەتەی سۆفت دیلیت سڕایەوە`,
      item.entityId
    );
  };

  const emptyTrash = () => {
    const count = trashItems.length;
    setTrashItems([]);
    recordActivity('TRASH', 'PURGE', 'بەتاڵکردنەوەی سەبەتەی سۆفت دیلیت', `${count} تۆمار بە یەکجاری سڕدرانەوە`);
  };

  const clearActivityLogs = () => {
    const now = new Date();
    const isHiddenSuper = currentUser?.isSuperAdmin || currentUser?.role === 'SUPER_ADMIN';
    setActivityLogs([
      {
        id: `act-${Date.now()}`,
        timestamp: now.toISOString(),
        date: now.toISOString().slice(0, 10),
        time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        userId: currentUser?.id || 'system',
        userName: isHiddenSuper ? 'بەڕێوەبەری کارگە' : currentUser?.name || 'بەڕێوەبەر',
        userRoleTitle: isHiddenSuper ? 'بەڕێوەبەر' : currentUser?.roleTitleKu || '',
        category: 'SETTINGS',
        action: 'PURGE',
        title: 'پاککردنەوەی ئەکتیڤتی لۆگ',
        details: 'تۆمارە کۆنەکانی چالاکی لەلایەن بەڕێوەبەرەوە پاککرانەوە',
      },
    ]);
  };

  const repNames = useMemo(() => {
    const defaults = [
      'مەندوب شوان (هێڵی بەختیاری)',
      'مەندوب هێمن (هێڵی تووی مەلیك)',
      'مەندوب ئارام (هێڵی سەرچنار و ڕاپەڕین)',
      'مەندوب کامەران (هێڵی عەربەت و شارەزوور)',
    ];
    const set = new Set<string>();
    // 1. Active REP accounts configured in Settings
    users
      .filter(u => u.role === 'REP' && u.isActive !== false && u.name.trim())
      .forEach(u => set.add(u.name.trim()));
    // 2. Default fleet lines + any historical names from transfers/dispatches/settlements
    defaults.forEach(name => set.add(name));
    custodyTransfers
      .filter(t => t.holderType === 'REP' && t.holderName.trim())
      .forEach(t => set.add(t.holderName.trim()));
    dispatches
      .filter(d => (d.destinationType === 'REP' || d.sourceCustody === 'REP') && d.repName?.trim())
      .forEach(d => set.add(d.repName!.trim()));
    settlements
      .filter(s => s.accountType === 'REP' && s.accountName.trim())
      .forEach(s => set.add(s.accountName.trim()));
    return Array.from(set);
  }, [users, custodyTransfers, dispatches, settlements]);

  const exportSystemBackup = (): string => {
    const payload = {
      version: 'FFC-POS-v4',
      exportedAt: new Date().toISOString(),
      data: {
        products,
        intakes,
        yields,
        customers,
        suppliers,
        dispatches,
        returns,
        expenses,
        vouchers,
        posSales,
        branchStock,
        branchDeliveries,
        branchExpenses,
        custodyTransfers,
        settlements,
        users,
        factorySettings,
        trashItems,
        activityLogs,
      },
    };
    recordActivity('SETTINGS', 'CREATE', 'دابەزاندنی باکئەپی سیستەم', 'هەموو داتاکانی کارگە بە فایلی JSON دابەزێنران');
    return JSON.stringify(payload, null, 2);
  };

  const importSystemBackup = (
    jsonStr: string
  ): { ok: boolean; error?: string; stats?: string } => {
    try {
      const parsed = JSON.parse(jsonStr);
      const d = parsed?.data || parsed;
      if (!d || typeof d !== 'object' || !Array.isArray(d.products) || !Array.isArray(d.users)) {
        return { ok: false, error: 'فایلی باکئەپ دروست نییە یان فۆرماتەکەی هەڵەیە!' };
      }

      setProducts(d.products);
      if (Array.isArray(d.intakes)) setIntakes(d.intakes);
      if (Array.isArray(d.yields)) setYields(d.yields);
      if (Array.isArray(d.customers)) setCustomers(d.customers);
      if (Array.isArray(d.suppliers)) setSuppliers(d.suppliers);
      if (Array.isArray(d.dispatches)) setDispatches(d.dispatches);
      if (Array.isArray(d.returns)) setReturns(d.returns);
      if (Array.isArray(d.expenses)) setExpenses(d.expenses);
      if (Array.isArray(d.vouchers)) setVouchers(d.vouchers);
      if (Array.isArray(d.posSales)) setPosSales(d.posSales);
      if (Array.isArray(d.branchStock)) setBranchStock(d.branchStock);
      if (Array.isArray(d.branchDeliveries)) setBranchDeliveries(d.branchDeliveries);
      if (Array.isArray(d.branchExpenses)) setBranchExpenses(d.branchExpenses);
      if (Array.isArray(d.custodyTransfers)) setCustodyTransfers(d.custodyTransfers);
      if (Array.isArray(d.settlements)) setSettlements(d.settlements);
      if (Array.isArray(d.users)) setUsers(d.users);
      if (d.factorySettings && typeof d.factorySettings === 'object') {
        setFactorySettings(prev => ({ ...prev, ...d.factorySettings }));
      }
      if (Array.isArray(d.trashItems)) setTrashItems(d.trashItems);
      if (Array.isArray(d.activityLogs)) setActivityLogs(d.activityLogs);

      recordActivity(
        'SETTINGS',
        'RESTORE',
        'گەڕاندنەوەی باکئەپی سیستەم',
        `باکئەپ گەڕێندرایەوە (${d.intakes?.length || 0} وەرگرتن، ${d.dispatches?.length || 0} وەسڵی مەندوب، ${d.posSales?.length || 0} POS)`
      );
      return {
        ok: true,
        stats: `${d.intakes?.length || 0} وەرگرتن • ${d.dispatches?.length || 0} وەسڵی مەندوب • ${d.posSales?.length || 0} فرۆشی POS`,
      };
    } catch {
      return { ok: false, error: 'نەتوانرا فایلەکە بخوێندرێتەوە (JSON هەڵەیە)' };
    }
  };

  return (
    <AppContext.Provider
      value={{
        products,
        intakes,
        yields,
        customers,
        suppliers,
        dispatches,
        returns,
        expenses,
        vouchers,
        posSales,
        branchStock,
        branchDeliveries,
        branchExpenses,
        custodyTransfers,
        settlements,
        currentUser,
        users,
        login,
        switchUser,
        logout,
        hasAccess,
        isAuthenticated,
        showLoginModal,
        setShowLoginModal,
        addIntake,
        addYieldRecord,
        addDispatch,
        addReturn,
        convertReturnOrder,
        addExpense,
        addCustomer,
        addSupplier,
        addVoucher,
        addPOSSale,
        addBranchDelivery,
        addBranchExpense,
        updateBranchStockItem,
        updateProductPrice,
        loadToRepCustody,
        returnUnsoldToReadyStock,
        addDailySettlement,
        factorySettings,
        updateFactorySettings,
        addUser,
        updateUser,
        trashItems,
        softDeleteRecord,
        restoreTrashItem,
        permanentlyDeleteTrashItem,
        emptyTrash,
        activityLogs,
        clearActivityLogs,
        repNames,
        parseWeightBarcode,
        exportSystemBackup,
        importSystemBackup,
        cloudSyncStatus,
        lastSyncedAt,
        syncNow,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
