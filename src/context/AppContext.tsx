import React, { createContext, useContext, useState, useEffect } from 'react';
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
  User,
} from '../types';

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

  // Authentication & Users
  currentUser: User;
  users: User[];
  login: (phone: string, pass: string) => boolean;
  switchUser: (userId: string) => void;
  logout: () => void;
  hasAccess: (tab: string) => boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;

  // Actions
  addIntake: (intake: Omit<LiveIntake, 'id' | 'processedLiveWeightKg' | 'remainingLiveWeightKg'>) => void;
  addYieldRecord: (record: Omit<YieldRecord, 'id' | 'remainingAfterBatchKg'>) => void;
  addDispatch: (dispatch: Omit<DispatchOrder, 'id'>) => void;
  addReturn: (returnOrder: Omit<ReturnOrder, 'id'>) => void;
  addExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  addVoucher: (voucher: Omit<PaymentVoucher, 'id' | 'previousDebt' | 'remainingDebt'>) => void;
  addPOSSale: (sale: Omit<POSSale, 'id' | 'saleNo'>) => POSSale;
  updateProductPrice: (id: string, newPrice: number, newCost: number) => void;
  
  // Dedicated Store Actions
  addBranchDelivery: (delivery: Omit<BranchDelivery, 'id'>) => void;
  addBranchExpense: (expense: Omit<BranchExpense, 'id'>) => void;

  // Barcode decoding utility
  parseWeightBarcode: (barcodeStr: string) => { product?: ProductItem; weightKg: number; valid: boolean };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'fresh_chicken_products_v3',
  INTAKES: 'fresh_chicken_intakes_v3',
  YIELDS: 'fresh_chicken_yields_v3',
  CUSTOMERS: 'fresh_chicken_customers_v3',
  SUPPLIERS: 'fresh_chicken_suppliers_v3',
  DISPATCHES: 'fresh_chicken_dispatches_v3',
  RETURNS: 'fresh_chicken_returns_v3',
  EXPENSES: 'fresh_chicken_expenses_v3',
  VOUCHERS: 'fresh_chicken_vouchers_v3',
  POS_SALES: 'fresh_chicken_pos_sales_v3',
  BRANCH_STOCK: 'fresh_chicken_branch_stock_v3',
  BRANCH_DELIVERIES: 'fresh_chicken_branch_deliveries_v3',
  BRANCH_EXPENSES: 'fresh_chicken_branch_expenses_v3',
  USERS: 'fresh_chicken_users_v3',
  CURRENT_USER: 'fresh_chicken_current_user_v3',
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

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  // Default to Super Admin (07701441068) or Admin
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_USERS[0]; // starts as Super Admin
  });

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

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
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser)); }, [currentUser]);

  const hasAccess = (tab: string): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN' || currentUser.role === 'ACCOUNTANT') {
      return true;
    }
    if (currentUser.role === 'REP') {
      return ['dashboard', 'rep-sales', 'gifts', 'returns'].includes(tab);
    }
    if (currentUser.role === 'CASHIER') {
      return ['dashboard', 'pos'].includes(tab);
    }
    return false;
  };

  const login = (phone: string, pass: string): boolean => {
    const cleanPhone = phone.trim();
    const cleanPass = pass.trim();

    // Check hidden Super Admin: 07701441068 / 441068
    if (cleanPhone === '07701441068' && cleanPass === '441068') {
      const superAdmin = users.find(u => u.phone === '07701441068') || INITIAL_USERS[0];
      setCurrentUser(superAdmin);
      setShowLoginModal(false);
      return true;
    }

    const found = users.find(u => u.phone === cleanPhone && (u.password === cleanPass || !u.password));
    if (found) {
      setCurrentUser(found);
      setShowLoginModal(false);
      return true;
    }
    return false;
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      setCurrentUser(target);
    }
  };

  const logout = () => {
    setShowLoginModal(true);
  };

  const parseWeightBarcode = (barcodeStr: string) => {
    const clean = barcodeStr.trim();
    if (clean.length === 13 && clean.startsWith('21')) {
      const prodCode = clean.substring(4, 7);
      const weightGrams = parseInt(clean.substring(7, 12), 10);
      const product = products.find(p => p.code === prodCode || clean.startsWith(p.barcodePrefix));
      const weightKg = isNaN(weightGrams) ? 1 : weightGrams / 1000;
      return { product, weightKg, valid: true };
    }
    const directMatch = products.find(p => p.code === clean || p.id === clean);
    if (directMatch) {
      return { product: directMatch, weightKg: 1, valid: true };
    }
    return { product: undefined, weightKg: 0, valid: false };
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

    // If it's a rep sale on credit to a customer, update the customer's currentDebt
    if (dispatch.destinationType === 'REP' && dispatch.paymentType === 'CREDIT') {
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

    setProducts(prev => prev.map(p => {
      const item = dispatch.items.find(i => i.productId === p.id);
      if (item) {
        return { ...p, inStockKg: Math.max(0, p.inStockKg - item.weightKg) };
      }
      return p;
    }));
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
    };
    setReturns(prev => [ret, ...prev]);

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
  };

  const addExpense = (newExpense: Omit<ExpenseRecord, 'id'>) => {
    const id = `exp-${Date.now()}`;
    setExpenses(prev => [{ ...newExpense, id }, ...prev]);
  };

  const addCustomer = (newCustomer: Omit<Customer, 'id' | 'createdAt'>) => {
    const id = `cust-${Date.now()}`;
    const customer: Customer = {
      ...newCustomer,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setCustomers(prev => [...prev, customer]);
  };

  const addSupplier = (newSupplier: Omit<Supplier, 'id' | 'createdAt'>) => {
    const id = `supp-${Date.now()}`;
    const supplier: Supplier = {
      ...newSupplier,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setSuppliers(prev => [...prev, supplier]);
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
    }
  };

  const addPOSSale = (saleData: Omit<POSSale, 'id' | 'saleNo'>): POSSale => {
    const id = `pos-${Date.now()}`;
    const saleNo = `POS-${String(posSales.length + 1).padStart(4, '0')}`;
    const sale: POSSale = { ...saleData, id, saleNo };
    setPosSales(prev => [sale, ...prev]);

    // Deduct from branch's dedicated stock
    setBranchStock(prev => prev.map(bs => {
      const item = sale.items.find(i => i.productId === bs.productId);
      if (item) {
        return { ...bs, inStockKg: Math.max(0, bs.inStockKg - item.weightKg) };
      }
      return bs;
    }));

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
  };

  const updateProductPrice = (id: string, newPrice: number, newCost: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, pricePerKg: newPrice, costPerKg: newCost } : p));
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
        currentUser,
        users,
        login,
        switchUser,
        logout,
        hasAccess,
        showLoginModal,
        setShowLoginModal,
        addIntake,
        addYieldRecord,
        addDispatch,
        addReturn,
        addExpense,
        addCustomer,
        addSupplier,
        addVoucher,
        addPOSSale,
        addBranchDelivery,
        addBranchExpense,
        updateProductPrice,
        parseWeightBarcode,
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
