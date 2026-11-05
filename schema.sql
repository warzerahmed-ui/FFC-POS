-- ========================================================
-- Cloudflare D1 Database Schema for Fresh Chicken ERP & POS
-- ========================================================

-- 1. بەرهەمەکان (Products & Cuts)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    barcode_prefix TEXT NOT NULL,
    name_ku TEXT NOT NULL,
    category TEXT NOT NULL,
    price_per_kg REAL NOT NULL,
    cost_per_kg REAL NOT NULL,
    unit TEXT DEFAULT 'KG',
    in_stock_kg REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. وەرگرتنی مریشکی زیندوو لە کێڵگە (Live Bird Intake)
CREATE TABLE IF NOT EXISTS live_intakes (
    id TEXT PRIMARY KEY,
    manual_receipt_no TEXT NOT NULL,
    date DATE NOT NULL,
    farm_name TEXT NOT NULL,
    driver_name TEXT,
    bird_count INTEGER DEFAULT 0,
    gross_weight_kg REAL NOT NULL,
    tare_weight_kg REAL NOT NULL,
    net_weight_kg REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    total_amount REAL NOT NULL,
    payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'DEBT', 'PARTIAL')),
    paid_amount REAL DEFAULT 0,
    notes TEXT,
    receipt_image_r2_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. دابەشکردن بۆ مەندوب، فرۆشگای خۆمان و دیاری (Dispatches)
CREATE TABLE IF NOT EXISTS dispatches (
    id TEXT PRIMARY KEY,
    manual_receipt_no TEXT NOT NULL,
    date DATE NOT NULL,
    destination_type TEXT NOT NULL CHECK(destination_type IN ('REP', 'BRANCH', 'GIFT')),
    destination_name TEXT NOT NULL,
    phone TEXT,
    total_weight_kg REAL NOT NULL,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'DISPATCHED',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- بڕگەکانی ناو وەسڵی دابەشکردن
CREATE TABLE IF NOT EXISTS dispatch_items (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    barcode TEXT,
    weight_kg REAL NOT NULL,
    price_per_kg REAL NOT NULL,
    total_amount REAL NOT NULL,
    FOREIGN KEY (dispatch_id) REFERENCES dispatches(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 4. گەڕاوەی ٣ ڕۆژ و تەلەف (Returns & Spoilage)
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    manual_receipt_no TEXT NOT NULL,
    date DATE NOT NULL,
    source_type TEXT NOT NULL CHECK(source_type IN ('REP', 'BRANCH')),
    source_name TEXT NOT NULL,
    total_weight_kg REAL NOT NULL,
    total_loss_amount REAL NOT NULL,
    disposal_method TEXT DEFAULT 'DESTROYED',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    unit_cost REAL NOT NULL,
    total_loss REAL NOT NULL,
    reason TEXT NOT NULL CHECK(reason IN ('EXPIRED_3_DAYS', 'DAMAGED', 'SPOILED')),
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE
);

-- 5. کڕیاران و مارکێتەکان (Customers)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    type TEXT DEFAULT 'SUPERMARKET',
    address TEXT,
    current_debt REAL DEFAULT 0,
    credit_limit REAL DEFAULT 5000000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. فرۆشیاران و کێڵگەکان (Suppliers / Farms)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    farm_location TEXT,
    current_balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. سەنەداتی قەبز و سەرف (Payment Vouchers / Debt Settlement)
CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY,
    voucher_no TEXT NOT NULL UNIQUE,
    date DATE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('RECEIPT', 'PAYMENT')),
    party_type TEXT NOT NULL CHECK(party_type IN ('CUSTOMER', 'SUPPLIER')),
    party_id TEXT NOT NULL,
    party_name TEXT NOT NULL,
    amount REAL NOT NULL,
    discount REAL DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. خەرجییە گشتییەکانی کارگە (Operating Expenses)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    recipient TEXT,
    receipt_no TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. فرۆشتنی لقی تایبەتی خۆمان (POS Retail Sales)
CREATE TABLE IF NOT EXISTS pos_sales (
    id TEXT PRIMARY KEY,
    sale_no TEXT NOT NULL UNIQUE,
    date DATETIME NOT NULL,
    subtotal REAL NOT NULL,
    discount REAL DEFAULT 0,
    total REAL NOT NULL,
    payment_type TEXT DEFAULT 'CASH',
    cashier_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
